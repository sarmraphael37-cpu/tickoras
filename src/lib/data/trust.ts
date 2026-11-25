import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  ComplaintRow,
  PublicReviewRow,
  VerificationRequestRow,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Verification requests
// ---------------------------------------------------------------------------

export async function getMyVerificationRequest(
  subjectType: "organizer" | "service_provider",
  subjectId: string,
): Promise<VerificationRequestRow | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as VerificationRequestRow | null) ?? null;
}

export async function listVerificationRequests(
  status?: string,
): Promise<VerificationRequestRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase
    .from("verification_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status as VerificationRequestRow["status"]);
  const { data, error } = await query;
  if (error) {
    console.error("[tickora] verification list:", error.message);
    return [];
  }
  return (data ?? []) as VerificationRequestRow[];
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function listEventReviews(
  eventId: string,
): Promise<{ reviews: PublicReviewRow[]; avgRating: number | null; count: number }> {
  if (!isSupabaseConfigured) return { reviews: [], avgRating: null, count: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_reviews")
    .select("*, reviewer:profiles!user_id(full_name)")
    .eq("target_type", "event")
    .eq("target_id", eventId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[tickora] event reviews:", error.message);
    return { reviews: [], avgRating: null, count: 0 };
  }
  const reviews = (data ?? []) as unknown as PublicReviewRow[];
  const avg =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
        ) / 10
      : null;
  return { reviews, avgRating: avg, count: reviews.length };
}

export async function listOrganizerReviews(
  organizerId: string,
): Promise<{ reviews: PublicReviewRow[]; avgRating: number | null; count: number }> {
  if (!isSupabaseConfigured) return { reviews: [], avgRating: null, count: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_reviews")
    .select("*, reviewer:profiles!user_id(full_name)")
    .eq("target_type", "organizer")
    .eq("target_id", organizerId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { reviews: [], avgRating: null, count: 0 };
  const reviews = (data ?? []) as unknown as PublicReviewRow[];
  const avg =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
        ) / 10
      : null;
  return { reviews, avgRating: avg, count: reviews.length };
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

export async function listMyComplaints(userId: string): Promise<ComplaintRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("complaints")
    .select("*, event:events(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return ((data ?? []) as any[]).map((c) => ({
    ...c,
    event_title: (c.event as any)?.title ?? null,
  })) as ComplaintRow[];
}

export async function listAllComplaints(
  status?: string,
): Promise<ComplaintRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase
    .from("complaints")
    .select("*, event:events(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status as ComplaintRow["status"]);
  const { data, error } = await query;
  if (error) return [];
  return ((data ?? []) as any[]).map((c) => ({
    ...c,
    event_title: (c.event as any)?.title ?? null,
  })) as ComplaintRow[];
}

// ---------------------------------------------------------------------------
// Admin trust stats
// ---------------------------------------------------------------------------

export interface TrustStats {
  pendingVerifications: number;
  openComplaints: number;
  investigatingComplaints: number;
  resolvedComplaints: number;
  pendingReviews: number;
  reportedReviews: number;
  verifiedOrganizers: number;
  verifiedProviders: number;
  suspendedProviders: number;
}

export async function getTrustStats(): Promise<TrustStats> {
  const empty: TrustStats = {
    pendingVerifications: 0,
    openComplaints: 0,
    investigatingComplaints: 0,
    resolvedComplaints: 0,
    pendingReviews: 0,
    reportedReviews: 0,
    verifiedOrganizers: 0,
    verifiedProviders: 0,
    suspendedProviders: 0,
  };
  if (!isSupabaseConfigured) return empty;
  const supabase = await createClient();

  const [verif, complaints, reviews, orgs, providers] = await Promise.all([
    supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("complaints").select("status"),
    supabase.from("public_reviews").select("status").limit(1000),
    supabase
      .from("organizers")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true),
    supabase.from("service_providers").select("is_verified, is_active"),
  ]);

  const complaintRows = (complaints.data ?? []) as Array<{ status: string }>;
  const reviewRows = (reviews.data ?? []) as Array<{ status: string }>;
  const providerRows = (providers.data ?? []) as Array<{
    is_verified: boolean;
    is_active: boolean;
  }>;

  return {
    pendingVerifications: verif.count ?? 0,
    openComplaints: complaintRows.filter((c) => c.status === "open").length,
    investigatingComplaints: complaintRows.filter((c) => c.status === "investigating").length,
    resolvedComplaints: complaintRows.filter((c) =>
      ["resolved", "rejected"].includes(c.status),
    ).length,
    pendingReviews: reviewRows.filter((r) => r.status === "pending").length,
    reportedReviews: reviewRows.filter((r) => r.status === "reported").length,
    verifiedOrganizers: orgs.count ?? 0,
    verifiedProviders: providerRows.filter((p) => p.is_verified).length,
    suspendedProviders: providerRows.filter((p) => !p.is_active).length,
  };
}
