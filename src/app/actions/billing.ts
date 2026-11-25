"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { requireAdmin, requireOrganizer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { isDemoPaymentEnabled } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Subscription checkout
// ---------------------------------------------------------------------------

export async function subscribeToPlan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const planId = String(formData.get("plan_id") ?? "");
  const providerId = String(formData.get("provider") ?? "demo");
  if (!z.string().uuid().safeParse(planId).success) {
    return actionError("Invalid plan.");
  }
  if (!["demo", "mtn_momo", "orange_money", "card"].includes(providerId)) {
    return actionError("Choose a valid payment method.");
  }
  if (providerId === "demo" && !isDemoPaymentEnabled) {
    return actionError("Demo payments are disabled in this environment.");
  }

  const viewer = await requireOrganizer("/organizer/billing");
  if (!viewer.organizerId) return actionError("Organizer profile required.");
  const limited = rateLimit(`billing:${viewer.id}`, 6, 60_000);
  if (!limited.allowed) return actionError("Too many attempts. Wait a minute.");

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, price_xaf, is_active")
    .eq("id", planId)
    .eq("is_active", true)
    .single();
  if (!plan) return actionError("Plan not found.");
  const price = Number((plan as any).price_xaf);

  // Free plan → zero-amount demo payment, confirmed immediately
  if (price === 0) {
    const { data: paymentId, error } = await supabase.rpc("create_platform_payment", {
      p_organizer_id: viewer.organizerId,
      p_kind: "subscription",
      p_amount_xaf: 0,
      p_provider: "demo",
      p_idempotency_key: `free-${viewer.organizerId}-${planId}-${randomUUID()}`,
      p_plan_id: planId,
    });
    if (error || !paymentId) return actionError("Could not start subscription.");
    const { data: confirm } = await supabase.rpc("confirm_platform_payment", {
      p_payment_id: paymentId,
    });
    if (confirm && (confirm as any).status === "activated") {
      revalidatePath("/organizer/billing");
      return actionSuccess("You're now on the Starter plan.");
    }
    return actionError("Could not activate the free plan.");
  }

  // Paid plan → create pending platform payment
  const { data: paymentId, error } = await supabase.rpc("create_platform_payment", {
    p_organizer_id: viewer.organizerId,
    p_kind: "subscription",
    p_amount_xaf: price,
    p_provider: providerId,
    p_idempotency_key: `sub-${viewer.organizerId}-${planId}-${randomUUID()}`,
    p_plan_id: planId,
  });
  if (error || !paymentId) {
    return actionError("Could not create payment. Please try again.");
  }

  if (providerId === "demo") {
    const { data: confirm } = await supabase.rpc("confirm_platform_payment", {
      p_payment_id: paymentId,
    });
    if (confirm && (confirm as any).status === "activated") {
      revalidatePath("/organizer/billing");
      return actionSuccess("Subscription activated — welcome aboard!");
    }
    return actionError("Payment could not be confirmed.");
  }

  // Real providers: payment stays pending until provider callback/settlement.
  revalidatePath("/organizer/billing");
  return actionSuccess(
    "Payment initiated. Your plan activates once the payment is verified — track it under Billing → Payments.",
  );
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  if (!z.string().uuid().safeParse(subscriptionId).success) {
    return actionError("Invalid subscription.");
  }
  await requireOrganizer("/organizer/billing");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_subscription", {
    p_subscription_id: subscriptionId,
  });
  if (error) return actionError("Could not cancel subscription.");
  revalidatePath("/organizer/billing");
  return actionSuccess("Subscription will cancel at the end of the period.");
}

// ---------------------------------------------------------------------------
// Featured promotion purchase
// ---------------------------------------------------------------------------

const FEATURED_PRICE_PER_DAY_XAF = 2000; // configurable via admin settings later

export async function promoteEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const eventId = String(formData.get("event_id") ?? "");
  const days = Math.min(30, Math.max(1, Number(formData.get("days") ?? 7)));
  const providerId = String(formData.get("provider") ?? "demo");
  const placement = String(formData.get("placement") ?? "featured_badge");

  if (!z.string().uuid().safeParse(eventId).success) {
    return actionError("Invalid event.");
  }
  if (!["demo", "mtn_momo", "orange_money", "card"].includes(providerId)) {
    return actionError("Choose a valid payment method.");
  }
  if (!["homepage", "sponsored", "featured_badge"].includes(placement)) {
    return actionError("Invalid placement.");
  }
  if (providerId === "demo" && !isDemoPaymentEnabled) {
    return actionError("Demo payments are disabled.");
  }

  const viewer = await requireOrganizer("/organizer/billing");
  if (!viewer.organizerId) return actionError("Organizer profile required.");

  const supabase = await createClient();
  // Verify event ownership
  const { data: event } = await supabase
    .from("events")
    .select("id, organizer_id")
    .eq("id", eventId)
    .single();
  if (!event || (event as any).organizer_id !== viewer.organizerId) {
    return actionError("Event not found.");
  }

  const amount = FEATURED_PRICE_PER_DAY_XAF * days *
    (placement === "homepage" ? 3 : placement === "sponsored" ? 2 : 1);

  // Create the promotion row first (pending)
  const { data: promo, error: promoError } = await supabase
    .from("featured_promotions")
    .insert({
      organizer_id: viewer.organizerId,
      event_id: eventId,
      placement: placement as "homepage" | "sponsored" | "featured_badge",
      ends_at: new Date(Date.now() + days * 86400_000).toISOString(),
      amount_xaf: amount,
      status: "pending",
    })
    .select("id")
    .single();
  if (promoError || !promo) return actionError("Could not create promotion.");

  const { data: paymentId, error } = await supabase.rpc("create_platform_payment", {
    p_organizer_id: viewer.organizerId,
    p_kind: "featured",
    p_amount_xaf: amount,
    p_provider: providerId,
    p_idempotency_key: `feat-${(promo as any).id}-${randomUUID()}`,
    p_metadata: { featured_promotion_id: (promo as any).id, days, placement },
  });
  if (error || !paymentId) return actionError("Could not create payment.");

  if (providerId === "demo") {
    const { data: confirm } = await supabase.rpc("confirm_platform_payment", {
      p_payment_id: paymentId,
    });
    if (confirm && (confirm as any).status === "featured_activated") {
      revalidatePath("/organizer/billing");
      revalidatePath("/events");
      return actionSuccess(`Event promoted for ${days} day(s) — it's now featured!`);
    }
    return actionError("Promotion payment could not be confirmed.");
  }

  revalidatePath("/organizer/billing");
  return actionSuccess(
    "Promotion payment initiated — it activates once verified.",
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function settlePlatformPayment(
  paymentId: string,
  reference?: string,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  if (!z.string().uuid().safeParse(paymentId).success) {
    return actionError("Invalid payment.");
  }
  await requireAdmin("/admin/revenue");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_settle_platform_payment", {
    p_payment_id: paymentId,
    p_reference: (reference ?? "").slice(0, 120) || null,
  });
  if (error) return actionError("Settlement failed.");
  revalidatePath("/admin/revenue");
  return actionSuccess(`Payment settled (${(data as any)?.status ?? "ok"}).`);
}

export async function updatePlanPrice(
  planId: string,
  priceXaf: number,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  if (!z.string().uuid().safeParse(planId).success) {
    return actionError("Invalid plan.");
  }
  if (!Number.isInteger(priceXaf) || priceXaf < 0) {
    return actionError("Price must be a non-negative integer (XAF).");
  }
  await requireAdmin("/admin/revenue");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_plan", {
    p_plan_id: planId,
    p_price_xaf: priceXaf,
  });
  if (error) return actionError("Could not update plan.");
  revalidatePath("/admin/revenue");
  revalidatePath("/organizer/billing");
  return actionSuccess("Plan price updated.");
}
