"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth";
import { CITIES } from "@/lib/domain";
import { isSupabaseConfigured } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

function asObject<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const optionalUuid = z
  .union([z.literal(""), z.string().uuid("Invalid selection.")])
  .optional()
  .default("");

const optionalUrl = z
  .union([z.literal(""), z.string().trim().url("Enter a valid URL.")])
  .optional()
  .default("");

const optionalDate = z
  .union([z.literal(""), z.string().trim()])
  .optional()
  .default("");

const eventSchema = z.object({
  id: optionalUuid,
  title: z.string().trim().min(3, "Add an event title.").max(160),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and dashes for the URL.")
    .optional()
    .default(""),
  categoryId: optionalUuid,
  description: z.string().max(20000).optional().default(""),
  shortDescription: z.string().trim().max(300).optional().default(""),
  venueName: z.string().trim().min(2, "Add a venue.").max(200),
  address: z.string().trim().max(300).optional().default(""),
  city: z.enum(CITIES, { message: "Choose a supported city." }),
  latitude: z
    .union([z.literal(""), z.coerce.number().min(-90).max(90)])
    .optional()
    .default(""),
  longitude: z
    .union([z.literal(""), z.coerce.number().min(-180).max(180)])
    .optional()
    .default(""),
  startAt: z.string().min(1, "Choose a start date and time."),
  endAt: z.string().min(1, "Choose an end date and time."),
  coverImageUrl: optionalUrl,
  bannerImageUrl: optionalUrl,
});

const tierSchema = z
  .object({
    id: optionalUuid,
    name: z.string().trim().min(1, "Name each ticket tier.").max(60),
    description: z.string().trim().max(300).optional().default(""),
    priceXaf: z.coerce
      .number()
      .int("Use whole XAF amounts.")
      .min(0)
      .max(100000000),
    quantityTotal: z.coerce.number().int().min(1).max(1000000),
    minPerOrder: z.coerce.number().int().min(1).max(20),
    maxPerOrder: z.coerce.number().int().min(1).max(20),
    salesStartAt: optionalDate,
    salesEndAt: optionalDate,
    isActive: z.boolean().optional().default(true),
  })
  .refine((tier) => tier.maxPerOrder >= tier.minPerOrder, {
    message: "Maximum per order must be at least the minimum.",
  });

const eventPayloadSchema = z.object({
  event: eventSchema,
  tiers: z.array(tierSchema).min(1, "Add at least one ticket tier.").max(20),
  intent: z.enum(["draft", "submit"]).default("draft"),
});

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function saveEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireRole(["organizer"], "/organizer/events/new");
  if (!viewer.organizerId) {
    return actionError("Your account is not linked to an organizer profile yet.");
  }

  let tiersRaw: unknown = [];
  try {
    tiersRaw = JSON.parse(String(formData.get("ticket_types") ?? "[]"));
  } catch {
    return actionError("The ticket tiers could not be read. Please try again.");
  }

  const parsed = eventPayloadSchema.safeParse({
    event: {
      id: formData.get("event_id") ?? "",
      title: formData.get("title"),
      slug: formData.get("slug") ?? "",
      categoryId: formData.get("category_id") ?? "",
      description: formData.get("description") ?? "",
      shortDescription: formData.get("short_description") ?? "",
      venueName: formData.get("venue_name"),
      address: formData.get("address") ?? "",
      city: formData.get("city"),
      latitude: formData.get("latitude") ?? "",
      longitude: formData.get("longitude") ?? "",
      startAt: formData.get("start_at") ?? "",
      endAt: formData.get("end_at") ?? "",
      coverImageUrl: formData.get("cover_image_url") ?? "",
      bannerImageUrl: formData.get("banner_image_url") ?? "",
    },
    tiers: tiersRaw,
    intent: formData.get("intent") ?? "draft",
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return actionError(
      flat.formErrors[0] ??
        Object.values(flat.fieldErrors)[0]?.[0] ??
        "Please check the event details.",
      flat.fieldErrors,
    );
  }

  const { event, tiers, intent } = parsed.data;
  const startAt = toIso(event.startAt);
  const endAt = toIso(event.endAt);
  if (!startAt || !endAt) {
    return actionError("Enter valid start and end dates.");
  }
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return actionError("The end time must be after the start time.");
  }

  let tierError: string | null = null;
  const tierPayload = tiers.map((tier, index) => {
    const salesStart = toIso(tier.salesStartAt);
    const salesEnd = toIso(tier.salesEndAt);
    if (tier.salesStartAt && !salesStart) {
      tierError = "Each ticket tier needs a valid sales start date.";
    }
    if (tier.salesEndAt && !salesEnd) {
      tierError = "Each ticket tier needs a valid sales end date.";
    }
    if (salesStart && salesEnd && new Date(salesEnd) <= new Date(salesStart)) {
      tierError = "A sales end date must be after its start date.";
    }
    return {
      id: tier.id || undefined,
      name: tier.name,
      description: tier.description || null,
      price_xaf: tier.priceXaf,
      quantity_total: tier.quantityTotal,
      min_per_order: tier.minPerOrder,
      max_per_order: tier.maxPerOrder,
      sales_start_at: salesStart ?? "",
      sales_end_at: salesEnd ?? "",
      is_active: tier.isActive,
      sort_order: index + 1,
    };
  });
  if (tierError) return actionError(tierError);

  const limited = rateLimit(`event-save:${viewer.id}`, 20, 60_000);
  if (!limited.allowed) return actionError("Too many saves. Please wait a moment.");

  const supabase = await createClient();
  let eventId: string | null = null;
  try {
    const { data, error } = await supabase.rpc("save_event_draft", {
      p_event: {
        id: event.id || undefined,
        organizer_id: viewer.organizerId,
        category_id: event.categoryId || undefined,
        title: event.title,
        slug: event.slug ? slugify(event.slug) : slugify(event.title),
        description: event.description,
        short_description: event.shortDescription,
        cover_image_url: event.coverImageUrl,
        banner_image_url: event.bannerImageUrl,
        venue_name: event.venueName,
        address: event.address,
        city: event.city,
        start_at: startAt,
        end_at: endAt,
      },
      p_ticket_types: tierPayload,
    });
    if (error) {
      return actionError(friendlyDbError(error, "Could not save this event."));
    }
    eventId = typeof data === "string" ? data : null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid-sales")) {
      return actionError("Each ticket tier needs a valid sales window.");
    }
    throw error;
  }

  if (!eventId) return actionError("The event was saved but no reference was returned.");

  // Persist map coordinates separately — set_event_location enforces ownership
  // and validates ranges server-side.
  const hasLat = event.latitude !== "";
  const hasLng = event.longitude !== "";
  if (hasLat !== hasLng) {
    return actionError("Map coordinates are incomplete. Drop a pin or clear both.");
  }
  if (hasLat && hasLng) {
    const { error: locError } = await supabase.rpc("set_event_location", {
      p_event_id: eventId,
      p_latitude: Number(event.latitude),
      p_longitude: Number(event.longitude),
    });
    if (locError) {
      console.error("[tickora] set_event_location:", locError.message);
    }
  }

  revalidatePath("/organizer");
  revalidatePath("/organizer/events");
  revalidatePath(`/organizer/events/${eventId}`);

  if (intent === "submit") {
    const { error } = await supabase.rpc("submit_event_for_approval", {
      p_event_id: eventId,
    });
    if (error) {
      revalidatePath(`/organizer/events/${eventId}/edit`);
      return actionError(
        friendlyDbError(
          error,
          "Draft saved, but it could not be submitted. Review the details and try again.",
        ),
      );
    }
    revalidatePath("/admin/approvals");
    redirect(`/organizer/events/${eventId}?submitted=1`);
  }

  redirect(`/organizer/events/${eventId}/edit?saved=1`);
}

export async function submitEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  await requireRole(["organizer"]);
  const eventId = z.string().uuid().safeParse(formData.get("event_id"));
  if (!eventId.success) return actionError("Invalid event.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_event_for_approval", {
    p_event_id: eventId.data,
  });
  if (error) return actionError(friendlyDbError(error, "Could not submit this event."));

  revalidatePath("/organizer");
  revalidatePath("/organizer/events");
  revalidatePath(`/organizer/events/${eventId.data}`);
  revalidatePath("/admin/approvals");
  return actionSuccess("Submitted for review. TICKORA will respond after review.");
}

export async function deleteEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireRole(["organizer"]);
  if (!viewer.organizerId) {
    return actionError("No organizer profile is linked to this account.");
  }
  const eventId = z.string().uuid().safeParse(formData.get("event_id"));
  if (!eventId.success) return actionError("Invalid event.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId.data)
    .eq("organizer_id", viewer.organizerId);
  if (error) {
    return actionError(
      friendlyDbError(
        error,
        "This event cannot be deleted. Only drafts and rejected events can be removed.",
      ),
    );
  }
  revalidatePath("/organizer/events");
  revalidatePath("/organizer");
  redirect("/organizer/events?deleted=1");
}

const organizerProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your organization name.").max(120),
  description: z.string().trim().max(2000).optional().default(""),
  email: z
    .union([z.literal(""), z.string().trim().email("Enter a valid email.")])
    .optional()
    .default(""),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long.")
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces, + or - only.")
    .optional()
    .default(""),
  city: z.union([z.literal(""), z.enum(CITIES)]).optional().default(""),
  logoUrl: optionalUrl,
  bannerUrl: optionalUrl,
});

export async function updateOrganizerProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireRole(["organizer"], "/organizer/profile");
  if (!viewer.organizerId) return actionError("No organizer profile is linked.");

  const parsed = organizerProfileSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    city: formData.get("city") ?? "",
    logoUrl: formData.get("logo_url") ?? "",
    bannerUrl: formData.get("banner_url") ?? "",
  });
  if (!parsed.success) {
    return actionError(
      "Please check the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizers")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      logo_url: parsed.data.logoUrl || null,
      banner_url: parsed.data.bannerUrl || null,
    })
    .eq("id", viewer.organizerId)
    .eq("owner_id", viewer.id);

  if (error) {
    return actionError(friendlyDbError(error, "Could not save your organizer profile."));
  }

  revalidatePath("/organizer/profile");
  revalidatePath("/organizer");
  return actionSuccess("Organizer profile updated.");
}

const payoutSchema = z.object({
  amount: z.coerce.number().int("Use a whole amount.").positive("Enter an amount."),
  method: z.enum(["mtn_momo", "orange_money", "bank_transfer"], {
    message: "Choose a payout method.",
  }),
  destination: z
    .string()
    .trim()
    .min(4, "Enter the phone number or account to pay.")
    .max(120),
});

export async function requestPayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireRole(["organizer"], "/organizer/payouts");
  if (!viewer.organizerId) return actionError("No organizer profile is linked.");

  const parsed = payoutSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    destination: formData.get("destination"),
  });
  if (!parsed.success) {
    return actionError(
      "Please check the payout details.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const limited = rateLimit(`payout:${viewer.id}`, 4, 60_000);
  if (!limited.allowed) return actionError("Too many payout requests. Please wait.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_payout", {
    p_organizer_id: viewer.organizerId,
    p_amount_xaf: parsed.data.amount,
    p_method: parsed.data.method,
    p_destination: parsed.data.destination,
  });
  if (error) return actionError(friendlyDbError(error, "Could not request this payout."));

  revalidatePath("/organizer/payouts");
  revalidatePath("/organizer");
  revalidatePath("/admin/payouts");
  return actionSuccess("Payout requested. TICKORA will review it before sending funds.");
}

export async function addStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  await requireRole(["organizer"], "/organizer/scanners");
  const parsed = z
    .object({
      eventId: z.string().uuid(),
      email: z.string().trim().email("Enter a valid email."),
      role: z.enum(["scanner", "manager"]).default("scanner"),
    })
    .safeParse({
      eventId: formData.get("event_id"),
      email: formData.get("email"),
      role: formData.get("role") ?? "scanner",
    });
  if (!parsed.success) return actionError("Check the staff details and try again.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_event_staff_by_email", {
    p_event_id: parsed.data.eventId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) return actionError(friendlyDbError(error, "Could not add this staff member."));

  revalidatePath("/organizer/scanners");
  return actionSuccess("Team member assigned. They can now scan tickets for this event.");
}

export async function removeStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireRole(["organizer"], "/organizer/scanners");
  if (!viewer.organizerId) {
    return actionError("No organizer profile is linked to this account.");
  }
  const id = z.string().uuid().safeParse(formData.get("staff_id"));
  if (!id.success) return actionError("Invalid team member.");

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("event_staff")
    .select("event_id, event:events(organizer_id)")
    .eq("id", id.data)
    .maybeSingle();
  const staffEvent = (staff as any)?.event;
  const staffOrganizerId = Array.isArray(staffEvent)
    ? staffEvent[0]?.organizer_id
    : staffEvent?.organizer_id;
  if (!staff || staffOrganizerId !== viewer.organizerId) {
    return actionError("You can only manage staff on your own events.");
  }

  const { error } = await supabase.from("event_staff").delete().eq("id", id.data);
  if (error) return actionError(friendlyDbError(error, "Could not remove this team member."));

  revalidatePath("/organizer/scanners");
  return actionSuccess("Team member removed from the event.");
}

export async function updateTicketTypeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireRole(["organizer"], "/organizer/tickets");
  if (!viewer.organizerId) {
    return actionError("No organizer profile is linked to this account.");
  }

  const parsed = z
    .object({
      ticketId: z.string().uuid(),
      quantityTotal: z.coerce.number().int().min(1).max(1_000_000),
      isActive: z.enum(["true", "false"]),
    })
    .safeParse({
      ticketId: formData.get("ticket_id"),
      quantityTotal: formData.get("quantity_total"),
      isActive: formData.get("is_active") ?? "true",
    });
  if (!parsed.success) {
    return actionError("Enter a valid ticket quantity.");
  }

  const supabase = await createClient();
  const { data: tier, error: lookupError } = await supabase
    .from("ticket_types")
    .select(
      `id, quantity_total, quantity_sold, quantity_reserved,
       event:events!inner(id, organizer_id, title)`,
    )
    .eq("id", parsed.data.ticketId)
    .maybeSingle();
  if (lookupError || !tier) {
    return actionError("This ticket tier could not be found.");
  }
  const event = asObject<any>((tier as any).event);
  if (!event || event.organizer_id !== viewer.organizerId) {
    return actionError("You do not manage this ticket tier.");
  }

  const committed =
    Number((tier as any).quantity_sold ?? 0) +
    Number((tier as any).quantity_reserved ?? 0);
  if (parsed.data.quantityTotal < committed) {
    return actionError(
      `Capacity cannot be below ${committed} tickets already sold or reserved.`,
    );
  }

  const { error } = await supabase
    .from("ticket_types")
    .update({
      quantity_total: parsed.data.quantityTotal,
      is_active: parsed.data.isActive === "true",
    })
    .eq("id", parsed.data.ticketId);
  if (error) {
    return actionError(friendlyDbError(error, "Could not update this ticket tier."));
  }

  revalidatePath("/organizer/tickets");
  revalidatePath(`/organizer/events/${event.id}`);
  revalidatePath(`/organizer/events/${event.id}/tickets`);
  return actionSuccess("Ticket tier updated.");
}
