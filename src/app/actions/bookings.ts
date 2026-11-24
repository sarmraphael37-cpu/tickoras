"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { getViewer, requireViewer } from "@/lib/auth";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { getPaymentProvider, isDemoPaymentEnabled } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { safeRedirect } from "@/lib/utils";

const bookingSchema = z.object({
  eventId: z.string().uuid("Invalid event."),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Select at least one ticket."),
});

export async function startBooking(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    return actionError(
      "Bookings are disabled until Supabase is connected. This is a preview catalogue.",
    );
  }

  const eventId = String(formData.get("event_id") ?? "");
  const eventPath = safeRedirect(
    String(formData.get("event_path") ?? ""),
    "/events",
  );
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(eventPath)}`);
  }

  const items: Array<{ ticketTypeId: string; quantity: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty_")) continue;
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity <= 0) continue;
    items.push({ ticketTypeId: key.slice(4), quantity });
  }

  const parsed = bookingSchema.safeParse({ eventId, items });
  if (!parsed.success) {
    return actionError(
      parsed.error.flatten().formErrors[0] ?? "Select at least one ticket.",
    );
  }

  const limited = rateLimit(`booking:${viewer.id}`, 8, 60_000);
  if (!limited.allowed) {
    return actionError("You are creating bookings too quickly. Please wait a minute.");
  }

  const supabase = await createClient();
  const idempotencyKey =
    String(formData.get("idempotency_key") ?? "").slice(0, 80) ||
    globalThis.crypto.randomUUID();

  const { data, error } = await supabase.rpc("reserve_booking", {
    p_event_id: parsed.data.eventId,
    p_items: parsed.data.items.map((item) => ({
      ticket_type_id: item.ticketTypeId,
      quantity: item.quantity,
    })),
    p_contact_name: viewer.fullName,
    p_contact_email: viewer.email,
    p_contact_phone: viewer.phone ?? "",
    p_idempotency_key: idempotencyKey,
  });

  if (error || !data) {
    console.error("[tickora] reserve_booking:", error?.message);
    return actionError(
      friendlyDbError(error, "We could not reserve those tickets. Please try again."),
    );
  }

  const payload = data as {
    booking_id?: string;
    error?: string;
  };
  if (payload.error) {
    return actionError(friendlyDbError({ message: payload.error }));
  }
  if (!payload.booking_id) {
    return actionError("We could not create your reservation. Please try again.");
  }

  redirect(`/attendee/checkout/${payload.booking_id}`);
}

export async function cancelBooking(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/attendee/bookings");
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!z.string().uuid().safeParse(bookingId).success) {
    return actionError("Invalid booking.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
  });
  if (error) {
    return actionError(friendlyDbError(error, "Could not cancel this booking."));
  }
  const payload = data as { error?: string } | null;
  if (payload?.error) {
    return actionError(friendlyDbError({ message: payload.error }));
  }

  revalidatePath("/attendee/bookings");
  revalidatePath(`/attendee/bookings/${bookingId}`);
  revalidatePath("/attendee");
  return actionSuccess("Reservation released. The seats are available again.");
}

export async function payForBooking(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");

  const bookingId = String(formData.get("booking_id") ?? "");
  const providerId = String(formData.get("provider") ?? "");
  if (!z.string().uuid().safeParse(bookingId).success) {
    return actionError("Invalid booking.");
  }
  if (!["demo", "mtn_momo", "orange_money", "card"].includes(providerId)) {
    return actionError("Choose a valid payment method.");
  }

  const viewer = await requireViewer(`/attendee/checkout/${bookingId}`);
  const limited = rateLimit(`payment:${viewer.id}`, 10, 60_000);
  if (!limited.allowed) {
    return actionError("Too many payment attempts. Please wait a minute.");
  }

  const adapter = getPaymentProvider(providerId as "mtn_momo" | "orange_money" | "card");

  const supabase = await createClient();

  if (providerId === "demo") {
    if (!isDemoPaymentEnabled) {
      return actionError("Demo payments are disabled in this environment.");
    }
  } else {
    if (!adapter.isConfigured) {
      return actionError(
        adapter.unavailableReason ??
          "This payment provider is not configured yet. Please use another method.",
      );
    }
  }

  const { data: intent, error: intentError } = await supabase.rpc(
    "create_payment_intent",
    {
      p_booking_id: bookingId,
      p_provider: providerId as "demo" | "mtn_momo" | "orange_money" | "card",
    },
  );
  if (intentError || !intent) {
    return actionError(
      friendlyDbError(intentError, "Could not start the payment. Please try again."),
    );
  }
  const payment = intent as {
    payment_id?: string;
    provider_reference?: string;
    amount_xaf?: number;
    error?: string;
  };
  if (payment.error || !payment.payment_id || !payment.provider_reference) {
    return actionError(
      friendlyDbError({ message: payment.error ?? "PAYMENT_FAILED" }),
    );
  }

  if (providerId !== "demo") {
    // Live provider: push the collection request, then wait for the provider's
    // verified callback/status — never trust the browser.
    const { data: bookingRow } = await supabase
      .from("bookings")
      .select("reference, contact_name, contact_email, contact_phone, total_xaf")
      .eq("id", bookingId)
      .maybeSingle();
    if (!bookingRow) return actionError("Booking not found.");

    try {
      await adapter.initiate({
        bookingId,
        bookingReference: bookingRow.reference,
        providerReference: payment.provider_reference,
        amountXaf: Number(payment.amount_xaf ?? bookingRow.total_xaf),
        attendeeName: bookingRow.contact_name,
        attendeeEmail: bookingRow.contact_email,
        attendeePhone: bookingRow.contact_phone,
        returnUrl: `${siteUrl}/attendee/bookings/${bookingId}`,
        callbackUrl: `${siteUrl}/api/payments/webhook/${providerId}`,
      });
    } catch (error) {
      console.error(`[tickora] ${providerId} initiate:`, error);
      return actionError(
        error instanceof Error
          ? error.message
          : "The payment provider could not start this payment. Please try again.",
      );
    }

    revalidatePath(`/attendee/bookings/${bookingId}`);
    redirect(`/attendee/bookings/${bookingId}?payment=pending`);
  }

  // Demo confirmation still runs through a trusted, ownership-checked RPC. It
  // is explicitly demo money and is marked as such everywhere in the UI.
  const { error: confirmError } = await supabase.rpc("confirm_demo_payment", {
    p_payment_id: payment.payment_id,
  });
  if (confirmError) {
    console.error("[tickora] confirm_demo_payment:", confirmError.message);
    return actionError(
      friendlyDbError(confirmError, "The demo payment could not be confirmed."),
    );
  }

  revalidatePath("/attendee");
  revalidatePath("/attendee/bookings");
  revalidatePath(`/attendee/bookings/${bookingId}`);
  revalidatePath("/attendee/tickets");
  redirect(`/attendee/bookings/${bookingId}?paid=1`);
}

export async function requestRefund(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/attendee/bookings");
  const bookingId = String(formData.get("booking_id") ?? "");
  const reason = z
    .string()
    .trim()
    .min(10, "Tell us a little more so we can review your request.")
    .max(1000)
    .safeParse(formData.get("reason"));
  if (!z.string().uuid().safeParse(bookingId).success) {
    return actionError("Invalid booking.");
  }
  if (!reason.success) {
    return actionError(reason.error.issues[0]?.message ?? "Invalid reason.");
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, total_xaf, attendee_id")
    .eq("id", bookingId)
    .eq("attendee_id", viewer.id)
    .maybeSingle();

  if (!booking || booking.attendee_id !== viewer.id) {
    return actionError("Booking not found.");
  }
  if (booking.status !== "confirmed") {
    return actionError("Only confirmed bookings can be refunded.");
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, is_demo")
    .eq("booking_id", bookingId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) return actionError("No successful payment was found for this booking.");

  const { error } = await supabase.from("refunds").insert({
    payment_id: payment.id,
    booking_id: bookingId,
    amount_xaf: booking.total_xaf,
    status: "requested",
    reason: reason.data,
    requested_by: viewer.id,
  });
  if (error) {
    if (error.code === "23505") return actionError("A refund request is already open.");
    return actionError(friendlyDbError(error, "Could not submit your refund request."));
  }

  revalidatePath(`/attendee/bookings/${bookingId}`);
  return actionSuccess(
    "Refund request submitted. The organizer and TICKORA support will review it.",
  );
}

/**
 * User-initiated payment status refresh for live providers. The browser only
 * asks "did it go through?" — the authoritative answer always comes from the
 * provider API via the server, then process_verified_payment finalizes.
 */
export async function checkPaymentStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!z.string().uuid().safeParse(bookingId).success) {
    return actionError("Invalid booking.");
  }
  const viewer = await requireViewer(`/attendee/bookings/${bookingId}`);
  const limited = rateLimit(`paycheck:${viewer.id}`, 12, 60_000);
  if (!limited.allowed) {
    return actionError("Too many status checks. Please wait a moment.");
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .eq("attendee_id", viewer.id)
    .maybeSingle();
  if (!booking) return actionError("Booking not found.");
  if (booking.status === "confirmed") {
    redirect(`/attendee/bookings/${bookingId}?paid=1`);
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, provider, provider_reference, status, amount_xaf")
    .eq("booking_id", bookingId)
    .in("status", ["pending", "initiated", "requires_action"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!payment) return actionError("No pending payment found for this booking.");

  const adapter = getPaymentProvider(payment.provider);
  if (!adapter.getPaymentStatus || !payment.provider_reference) {
    return actionError("This payment method cannot be checked online.");
  }

  let remote;
  try {
    remote = await adapter.getPaymentStatus(payment.provider_reference);
  } catch (error) {
    console.error("[tickora] payment status check:", error);
    return actionError(
      "Could not reach the payment provider. Try again in a moment.",
    );
  }

  if (remote.status === "succeeded") {
    if (remote.amountXaf !== null && remote.amountXaf !== payment.amount_xaf) {
      console.error(
        `[tickora] amount mismatch payment=${payment.id} remote=${remote.amountXaf} expected=${payment.amount_xaf}`,
      );
      return actionError(
        "The provider reported a different amount. This payment needs manual review.",
      );
    }
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { error } = await admin.rpc("process_verified_payment", {
      p_payment_id: payment.id,
      p_provider_reference: payment.provider_reference,
      p_payload: { source: "user_status_check", provider: payment.provider },
    });
    if (error) {
      console.error("[tickora] process_verified_payment:", error.message);
      return actionError("Payment verified but confirmation failed. Please retry.");
    }
    revalidatePath(`/attendee/bookings/${bookingId}`);
    redirect(`/attendee/bookings/${bookingId}?paid=1`);
  }

  if (remote.status === "failed") {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await admin
      .from("payments")
      .update({
        status: "failed",
        failure_reason: remote.reason ?? "Provider reported the payment failed.",
      })
      .eq("id", payment.id)
      .in("status", ["pending", "initiated", "requires_action"]);
    revalidatePath(`/attendee/bookings/${bookingId}`);
    return actionError(
      remote.reason ?? "The payment failed or was declined. You can try again.",
    );
  }

  revalidatePath(`/attendee/bookings/${bookingId}`);
  return actionSuccess(
    "Still waiting for confirmation. Approve the prompt on your phone, then check again.",
  );
}
