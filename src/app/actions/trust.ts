"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { requireAdmin, requireOrganizer, requireViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Verification applications
// ---------------------------------------------------------------------------

const docSchema = z.array(
  z.object({
    label: z.string().trim().min(1).max(80),
    url: z.string().trim().url().max(500),
  }),
);

export async function submitVerificationRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const subjectType = String(formData.get("subject_type") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const notes = String(formData.get("notes") ?? "").slice(0, 1000);
  const docsRaw = String(formData.get("documents") ?? "[]");

  if (!["organizer", "service_provider"].includes(subjectType)) {
    return actionError("Invalid subject type.");
  }
  if (!z.string().uuid().safeParse(subjectId).success) {
    return actionError("Invalid subject.");
  }
  let documents: Array<{ label: string; url: string }> = [];
  try {
    documents = docSchema.parse(JSON.parse(docsRaw));
  } catch {
    return actionError("Documents must be a valid list of {label, url}.");
  }
  if (documents.length === 0) {
    return actionError("Attach at least one supporting document URL.");
  }

  const supabase = await createClient();
  let actorId = "";

  // Ownership check: organizer → owner_id; provider → user_id
  if (subjectType === "organizer") {
    const viewer = await requireOrganizer("/organizer/verification");
    actorId = viewer.id;
    const { data: org } = await supabase
      .from("organizers")
      .select("id, owner_id")
      .eq("id", subjectId)
      .maybeSingle();
    if (!org || (org as any).owner_id !== viewer.id) {
      return actionError("You can only verify your own organization.");
    }
  } else {
    const viewer = await requireViewer("/provider/profile");
    actorId = viewer.id;
    const { data: provider } = await supabase
      .from("service_providers")
      .select("id, user_id")
      .eq("id", subjectId)
      .maybeSingle();
    if (!provider || (provider as any).user_id !== viewer.id) {
      return actionError("You can only verify your own provider profile.");
    }
  }

  // One active request per subject
  const { data: existing } = await supabase
    .from("verification_requests")
    .select("id, status")
    .eq("subject_type", subjectType as "organizer" | "service_provider")
    .eq("subject_id", subjectId)
    .in("status", ["pending", "info_requested"])
    .limit(1)
    .maybeSingle();
  if (existing) {
    return actionError("A verification request is already under review.");
  }

  const { error } = await supabase.from("verification_requests").insert({
    subject_type: subjectType as "organizer" | "service_provider",
    subject_id: subjectId,
    user_id: actorId,
    documents,
    notes: notes || null,
  });
  if (error) return actionError("Could not submit verification request.");

  revalidatePath("/organizer/verification");
  revalidatePath("/provider/profile");
  return actionSuccess("Verification request submitted for review.");
}

export async function reviewVerification(
  requestId: string,
  status: "approved" | "rejected" | "info_requested" | "suspended",
  note?: string,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  if (!z.string().uuid().safeParse(requestId).success) {
    return actionError("Invalid request.");
  }
  await requireAdmin("/admin/trust");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_verification", {
    p_request_id: requestId,
    p_status: status,
    p_note: (note ?? "").slice(0, 500) || null,
  });
  if (error) return actionError("Review failed.");
  revalidatePath("/admin/trust");
  return actionSuccess(`Verification ${status.replace("_", " ")}.`);
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function submitReview(
  targetType: "event" | "organizer",
  targetId: string,
  rating: number,
  comment?: string,
  bookingId?: string,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  if (!["event", "organizer"].includes(targetType)) {
    return actionError("Invalid target.");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return actionError("Rating must be 1–5.");
  }
  const viewer = await requireViewer("/attendee/bookings");
  const limited = rateLimit(`review:${viewer.id}`, 10, 60_000);
  if (!limited.allowed) return actionError("Too many reviews. Wait a minute.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_public_review", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_rating: rating,
    p_comment: (comment ?? "").slice(0, 2000) || null,
    p_booking_id: bookingId && z.string().uuid().safeParse(bookingId).success ? bookingId : null,
  });
  if (error) {
    return actionError(
      error.message.includes("NOT_ELIGIBLE")
        ? "Only attendees with a confirmed booking can review."
        : "Could not submit review.",
    );
  }
  revalidatePath("/events");
  revalidatePath("/organizers");
  return actionSuccess("Review published. Thank you!");
}

export async function reportReview(reviewId: string): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  if (!z.string().uuid().safeParse(reviewId).success) {
    return actionError("Invalid review.");
  }
  const viewer = await requireViewer("/attendee/bookings");
  const limited = rateLimit(`report:${viewer.id}`, 10, 60_000);
  if (!limited.allowed) return actionError("Too many reports. Wait a minute.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_review", { p_review_id: reviewId });
  if (error) return actionError("Could not report review.");
  return actionSuccess("Review reported. Our team will review it.");
}

export async function moderateReview(
  reviewId: string,
  status: "published" | "rejected",
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  if (!z.string().uuid().safeParse(reviewId).success) {
    return actionError("Invalid review.");
  }
  await requireAdmin("/admin/trust");
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_review", {
    p_review_id: reviewId,
    p_status: status,
  });
  if (error) return actionError("Moderation failed.");
  revalidatePath("/admin/trust");
  return actionSuccess(`Review ${status}.`);
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

const complaintSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
  organizerId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  serviceBookingId: z.string().uuid().optional().nullable(),
});

export async function submitComplaint(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const parsed = complaintSchema.safeParse({
    subject: formData.get("subject"),
    description: formData.get("description"),
    organizerId: formData.get("organizer_id") || null,
    eventId: formData.get("event_id") || null,
    serviceBookingId: formData.get("service_booking_id") || null,
  });
  if (!parsed.success) {
    return actionError(parsed.error.flatten().formErrors[0] ?? "Invalid complaint.");
  }
  const viewer = await requireViewer("/attendee/complaints");
  const limited = rateLimit(`complaint:${viewer.id}`, 5, 60_000);
  if (!limited.allowed) return actionError("Too many complaints. Wait a minute.");

  let evidence: Array<{ label: string; url: string }> = [];
  try {
    evidence = docSchema.parse(JSON.parse(String(formData.get("evidence") ?? "[]")));
  } catch {
    evidence = [];
  }

  const supabase = await createClient();
  const { error } = await supabase.from("complaints").insert({
    user_id: viewer.id,
    organizer_id: parsed.data.organizerId ?? null,
    event_id: parsed.data.eventId ?? null,
    service_booking_id: parsed.data.serviceBookingId ?? null,
    subject: parsed.data.subject,
    description: parsed.data.description,
    evidence,
  });
  if (error) return actionError("Could not submit complaint.");

  revalidatePath("/attendee/complaints");
  return actionSuccess("Complaint submitted. Track it under Attendee → Complaints.");
}

export async function updateComplaintStatus(
  complaintId: string,
  status: "open" | "investigating" | "resolved" | "rejected",
  note?: string,
  priority?: "low" | "normal" | "high",
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  if (!z.string().uuid().safeParse(complaintId).success) {
    return actionError("Invalid complaint.");
  }
  await requireAdmin("/admin/trust");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_complaint_status", {
    p_complaint_id: complaintId,
    p_status: status,
    p_note: (note ?? "").slice(0, 500) || null,
    p_priority: priority ?? null,
  });
  if (error) return actionError("Update failed.");
  revalidatePath("/admin/trust");
  revalidatePath("/attendee/complaints");
  return actionSuccess(`Complaint marked ${status}.`);
}
