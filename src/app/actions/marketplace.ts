"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { requireViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { getMyProviderProfile, getOrganizerIdForUser } from "@/lib/data/marketplace";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { ServiceBookingStatus } from "@/types/database";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function notify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  audience: "provider" | "organizer",
  title: string,
  body: string,
) {
  try {
    await supabase.rpc("service_booking_notify", {
      p_booking_id: bookingId,
      p_audience: audience,
      p_title: title,
      p_body: body,
    });
  } catch (error) {
    console.error("[tickora] service notify:", error);
  }
}

async function marketplaceCommissionPercent(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "marketplace_commission_percent")
    .maybeSingle();
  const parsed = Number(data?.value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 10;
}

export async function createProviderProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/provider");
  const limited = rateLimit(`provider-signup:${viewer.id}`, 5, 60_000);
  if (!limited.allowed) return actionError("Too many attempts. Try again later.");

  const parsed = z
    .object({
      businessName: z.string().trim().min(2).max(120),
      description: z.string().trim().max(2000).optional().default(""),
      city: z.string().trim().max(80).optional().default(""),
      phone: z.string().trim().max(30).optional().default(""),
      categories: z.array(z.string().uuid()).max(10).optional().default([]),
    })
    .safeParse({
      businessName: formData.get("business_name"),
      description: formData.get("description") ?? "",
      city: formData.get("city") ?? "",
      phone: formData.get("phone") ?? "",
      categories: formData.getAll("categories").map(String),
    });
  if (!parsed.success) return actionError("Please complete the required fields.");

  const slug = slugify(parsed.data.businessName);
  if (!slug) return actionError("Business name must contain letters or numbers.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_service_provider_profile", {
    p_business_name: parsed.data.businessName,
    p_slug: `${slug}-${viewer.id.slice(0, 4)}`,
    p_description: parsed.data.description || null,
    p_city: parsed.data.city || null,
    p_phone: parsed.data.phone || null,
    p_category_ids: parsed.data.categories,
  });
  if (error) {
    if (error.message.includes("ALREADY_EXISTS")) {
      return actionError("You already have a provider profile.");
    }
    return actionError(friendlyDbError(error, "Could not create your provider profile."));
  }

  revalidatePath("/provider");
  return actionSuccess("Provider profile created. Complete your details to go live.");
}

const providerProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  coverageAreas: z.string().trim().max(400).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  whatsapp: z.string().trim().max(30).optional().default(""),
  startingPrice: z.coerce.number().int().min(0).max(999_999_999).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
});

export async function updateProviderProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/provider");
  const provider = await getMyProviderProfile(viewer.id);
  if (!provider) return actionError("Create your provider profile first.");

  const parsed = providerProfileSchema.safeParse({
    businessName: formData.get("business_name"),
    description: formData.get("description") ?? "",
    city: formData.get("city") ?? "",
    coverageAreas: formData.get("coverage_areas") ?? "",
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    startingPrice: formData.get("starting_price") || undefined,
    yearsExperience: formData.get("years_experience") || undefined,
  });
  if (!parsed.success) return actionError("Please check the profile fields.");

  const coverage = parsed.data.coverageAreas
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 20);

  const supabase = await createClient();
  const lat = formData.get("latitude");
  const lng = formData.get("longitude");
  const hasCoords = Boolean(lat) || Boolean(lng);
  const parsedLat = lat ? Number(lat) : null;
  const parsedLng = lng ? Number(lng) : null;
  if (
    hasCoords &&
    (parsedLat == null || parsedLng == null ||
      Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180)
  ) {
    return actionError("Map coordinates look invalid. Drop a pin again.");
  }

  const { error } = await supabase
    .from("service_providers")
    .update({
      business_name: parsed.data.businessName,
      description: parsed.data.description || null,
      city: parsed.data.city || null,
      coverage_areas: coverage,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      starting_price_xaf: parsed.data.startingPrice ?? null,
      years_experience: parsed.data.yearsExperience ?? null,
      latitude: hasCoords ? parsedLat : null,
      longitude: hasCoords ? parsedLng : null,
    })
    .eq("id", provider.id);
  if (error) return actionError(friendlyDbError(error, "Could not save profile."));

  // Update categories if provided
  const categoryIds = formData.getAll("categories").map(String).filter(Boolean);
  if (categoryIds.length > 0) {
    await supabase
      .from("service_provider_categories")
      .delete()
      .eq("provider_id", provider.id);
    await supabase.from("service_provider_categories").insert(
      categoryIds.map((category_id) => ({ provider_id: provider.id, category_id })),
    );
  }

  revalidatePath("/provider");
  revalidatePath(`/services/${provider.slug}`);
  return actionSuccess("Profile updated.");
}

export async function addPortfolioItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/provider");
  const provider = await getMyProviderProfile(viewer.id);
  if (!provider) return actionError("Create your provider profile first.");

  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!imageUrl.startsWith("http")) {
    return actionError("A valid image URL is required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("provider_portfolios").insert({
    provider_id: provider.id,
    image_url: imageUrl,
    title: title || null,
  });
  if (error) return actionError(friendlyDbError(error, "Could not add portfolio item."));

  revalidatePath("/provider");
  revalidatePath(`/services/${provider.slug}`);
  return actionSuccess("Portfolio item added.");
}

export async function deletePortfolioItem(formData: FormData) {
  if (!isSupabaseConfigured) return;
  const viewer = await requireViewer("/provider");
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("provider_portfolios").delete().eq("id", id);
  revalidatePath("/provider");
}

const bookingRequestSchema = z.object({
  providerId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(160),
  details: z.string().trim().max(2000).optional().default(""),
  eventDate: z.string().optional(),
  budgetXaf: z.coerce.number().int().min(0).max(999_999_999).optional(),
});

export async function requestServiceBooking(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/organizer/services");
  const limited = rateLimit(`svc-booking:${viewer.id}`, 10, 60_000);
  if (!limited.allowed) return actionError("Too many requests. Try again later.");

  const parsed = bookingRequestSchema.safeParse({
    providerId: formData.get("provider_id"),
    eventId: formData.get("event_id") || undefined,
    title: formData.get("title"),
    details: formData.get("details") ?? "",
    eventDate: formData.get("event_date") || undefined,
    budgetXaf: formData.get("budget_xaf") || undefined,
  });
  if (!parsed.success) return actionError("Please complete the booking request.");

  const organizerId = await getOrganizerIdForUser(viewer.id);
  if (!organizerId) {
    return actionError("Only approved organizers can request services.");
  }

  // Provider must exist and be active
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from("service_providers")
    .select("id, user_id")
    .eq("id", parsed.data.providerId)
    .eq("is_active", true)
    .maybeSingle();
  if (!provider) return actionError("This provider is not available.");

  const reference = `SVC-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const { data: booking, error } = await supabase
    .from("service_bookings")
    .insert({
      reference,
      organizer_id: organizerId,
      provider_id: provider.id,
      event_id: parsed.data.eventId ?? null,
      title: parsed.data.title,
      details: parsed.data.details || null,
      event_date: parsed.data.eventDate || null,
      budget_xaf: parsed.data.budgetXaf ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !booking) {
    return actionError(friendlyDbError(error, "Could not send the booking request."));
  }

  await notify(
    supabase,
    booking.id,
    "provider",
    "New service booking request",
    `${parsed.data.title} — review and send a quotation.`,
  );

  revalidatePath("/organizer/services");
  revalidatePath("/provider/bookings");
  return actionSuccess("Booking request sent. The provider will review it shortly.");
}

export async function submitServiceQuote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/provider/bookings");
  const provider = await getMyProviderProfile(viewer.id);
  if (!provider) return actionError("Provider profile required.");

  const bookingId = String(formData.get("booking_id") ?? "");
  const amount = z.coerce.number().int().min(0).max(999_999_999).safeParse(
    formData.get("amount"),
  );
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!z.string().uuid().safeParse(bookingId).success || !amount.success) {
    return actionError("Enter a valid quotation amount.");
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("service_bookings")
    .select("id, status, title")
    .eq("id", bookingId)
    .eq("provider_id", provider.id)
    .maybeSingle();
  if (!booking) return actionError("Booking not found.");
  if (!["pending", "quotation_submitted"].includes(booking.status)) {
    return actionError("This booking can no longer be quoted.");
  }

  const { error } = await supabase
    .from("service_bookings")
    .update({
      quoted_amount_xaf: amount.data,
      quote_note: note || null,
      status: "quotation_submitted",
    })
    .eq("id", bookingId);
  if (error) return actionError(friendlyDbError(error, "Could not submit quotation."));

  await notify(
    supabase,
    bookingId,
    "organizer",
    "Quotation received",
    `${booking.title} — ${amount.data.toLocaleString()} XAF. Review it in your dashboard.`,
  );

  revalidatePath("/provider/bookings");
  revalidatePath("/organizer/services");
  return actionSuccess("Quotation sent to the organizer.");
}

const BOOKING_TRANSITIONS: Record<
  string,
  { from: string[]; to: string; who: "provider" | "organizer" | "either" }
> = {
  accept_quote: { from: ["quotation_submitted"], to: "accepted", who: "organizer" },
  decline_quote: { from: ["quotation_submitted", "pending"], to: "cancelled", who: "organizer" },
  confirm_booking: { from: ["accepted"], to: "confirmed", who: "organizer" },
  start_work: { from: ["confirmed", "accepted"], to: "in_progress", who: "provider" },
  complete_booking: { from: ["in_progress", "confirmed"], to: "completed", who: "either" },
  cancel_booking: {
    from: ["pending", "quotation_submitted", "accepted", "confirmed", "in_progress"],
    to: "cancelled",
    who: "either",
  },
  dispute_booking: { from: ["confirmed", "in_progress"], to: "disputed", who: "either" },
};

export async function transitionServiceBooking(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/provider/bookings");
  const action = String(formData.get("action") ?? "");
  const bookingId = String(formData.get("booking_id") ?? "");

  const rule = BOOKING_TRANSITIONS[action];
  if (!rule || !z.string().uuid().safeParse(bookingId).success) {
    return actionError("Invalid booking action.");
  }

  const supabase = await createClient();
  const provider = await getMyProviderProfile(viewer.id);
  const organizerId = await getOrganizerIdForUser(viewer.id);

  // Verify the viewer is a party to this booking
  const { data: booking } = await supabase
    .from("service_bookings")
    .select("id, status, title, provider_id, organizer_id, quoted_amount_xaf")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return actionError("Booking not found.");

  const isProvider = provider?.id === booking.provider_id;
  const isOrganizer = organizerId === booking.organizer_id;
  if (rule.who === "provider" && !isProvider) return actionError("Not authorized.");
  if (rule.who === "organizer" && !isOrganizer) return actionError("Not authorized.");
  if (rule.who === "either" && !isProvider && !isOrganizer) {
    return actionError("Not authorized.");
  }
  if (!rule.from.includes(booking.status)) {
    return actionError(`Cannot ${action.replace(/_/g, " ")} from status "${booking.status}".`);
  }

  const update: {
    status: ServiceBookingStatus;
    completed_at?: string;
    platform_commission_xaf?: number;
  } = { status: rule.to as ServiceBookingStatus };
  if (rule.to === "completed") {
    update.completed_at = new Date().toISOString();
    // Compute platform commission server-side on completion
    const rate = await marketplaceCommissionPercent(supabase);
    const amount = booking.quoted_amount_xaf ?? 0;
    update.platform_commission_xaf = Math.round((amount * rate) / 100);
  }

  const { error } = await supabase
    .from("service_bookings")
    .update(update)
    .eq("id", bookingId);
  if (error) return actionError(friendlyDbError(error, "Could not update booking."));

  const audience = isProvider ? "organizer" : "provider";
  const labels: Record<string, string> = {
    accepted: "Quotation accepted",
    cancelled: "Booking cancelled",
    confirmed: "Booking confirmed",
    in_progress: "Work started",
    completed: "Booking completed",
    disputed: "Booking disputed",
  };
  await notify(
    supabase,
    bookingId,
    audience,
    labels[rule.to] ?? "Booking updated",
    `${booking.title} is now ${rule.to.replace(/_/g, " ")}.`,
  );

  revalidatePath("/provider/bookings");
  revalidatePath("/organizer/services");
  return actionSuccess(`Booking marked as ${rule.to.replace(/_/g, " ")}.`);
}

export async function submitServiceReview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/organizer/services");
  const organizerId = await getOrganizerIdForUser(viewer.id);
  if (!organizerId) return actionError("Organizer profile required.");

  const bookingId = String(formData.get("booking_id") ?? "");
  const rating = z.coerce.number().int().min(1).max(5).safeParse(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
  if (!z.string().uuid().safeParse(bookingId).success || !rating.success) {
    return actionError("Select a rating from 1 to 5.");
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("service_bookings")
    .select("id, provider_id, status")
    .eq("id", bookingId)
    .eq("organizer_id", organizerId)
    .maybeSingle();
  if (!booking) return actionError("Booking not found.");
  if (booking.status !== "completed") {
    return actionError("Reviews open after the booking is completed.");
  }

  const { error } = await supabase.from("service_reviews").insert({
    booking_id: booking.id,
    provider_id: booking.provider_id,
    author_id: viewer.id,
    rating: rating.data,
    comment: comment || null,
  });
  if (error) {
    if (error.code === "23505") return actionError("You already reviewed this booking.");
    return actionError(friendlyDbError(error, "Could not submit review."));
  }

  revalidatePath("/organizer/services");
  revalidatePath(`/services/${booking.provider_id}`);
  return actionSuccess("Review submitted. Thank you!");
}
