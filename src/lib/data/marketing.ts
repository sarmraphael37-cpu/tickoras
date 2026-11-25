import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  AffiliateCommissionRow,
  AffiliateProfileRow,
  PromoCodeRow,
  ReferralLinkRow,
  ReferralRewardRow,
} from "@/types/database";

export interface PromoCode {
  id: string;
  eventId: string | null;
  eventTitle: string | null;
  code: string;
  description: string | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minOrderXaf: number;
  startsAt: string | null;
  endsAt: string | null;
  status: "active" | "paused";
}

function mapPromo(row: PromoCodeRow, eventTitle?: string | null): PromoCode {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: eventTitle ?? null,
    code: row.code,
    description: row.description,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    maxUses: row.max_uses,
    usedCount: row.used_count,
    minOrderXaf: Number(row.min_order_xaf),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  };
}

export async function listPromoCodes(organizerId: string): Promise<PromoCode[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("promo_codes")
    .select("*, events(title)")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as any[]).map((row) =>
    mapPromo(row, row.events?.title ?? null),
  );
}

export interface ReferralLink {
  id: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  code: string;
  clicks: number;
  conversions: number;
}

export async function listMyReferralLinks(userId: string): Promise<ReferralLink[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("referral_links")
    .select("*, events(title, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? "Event",
    eventSlug: row.events?.slug ?? "",
    code: row.code,
    clicks: row.clicks_count,
    conversions: row.conversions_count,
  }));
}

export interface ReferralReward {
  id: string;
  eventTitle: string;
  rewardType: string;
  rewardXaf: number;
  status: string;
  createdAt: string;
}

export async function listMyReferralRewards(userId: string): Promise<ReferralReward[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("referral_rewards")
    .select("*, referral_links!inner(user_id, events(title))")
    .eq("referral_links.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    eventTitle: row.referral_links?.events?.title ?? "Event",
    rewardType: row.reward_type,
    rewardXaf: Number(row.reward_xaf),
    status: row.status,
    createdAt: row.created_at,
  }));
}

export interface AffiliateRow {
  id: string;
  displayName: string;
  platform: string | null;
  code: string;
  status: AffiliateProfileRow["status"];
  clicks: number;
  conversions: number;
  earningsXaf: number;
  createdAt: string;
}

export async function listOrganizerAffiliates(
  organizerId: string,
): Promise<AffiliateRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("affiliate_profiles")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as AffiliateProfileRow[]).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    platform: row.platform,
    code: row.code,
    status: row.status,
    clicks: row.clicks_count,
    conversions: row.conversions_count,
    earningsXaf: row.total_earnings_xaf,
    createdAt: row.created_at,
  }));
}

export interface AffiliateCommission {
  id: string;
  eventTitle: string;
  commissionXaf: number;
  status: string;
  createdAt: string;
}

export async function listMyAffiliateCommissions(
  affiliateId: string,
): Promise<AffiliateCommission[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("affiliate_commissions")
    .select("*, bookings(events(title))")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    eventTitle: row.bookings?.events?.title ?? "Event",
    commissionXaf: Number(row.commission_xaf),
    status: row.status,
    createdAt: row.created_at,
  }));
}

export interface MarketingAnalytics {
  promoCount: number;
  promoRedemptions: number;
  promoDiscountXaf: number;
  promoRevenueXaf: number;
  referralClicks: number;
  referralConversions: number;
  referralRewardsXaf: number;
  affiliateClicks: number;
  affiliateConversions: number;
  affiliateCommissionsXaf: number;
  attributedRevenueXaf: number;
  marketingSpendXaf: number;
}

export async function getMarketingAnalytics(
  organizerId: string,
): Promise<MarketingAnalytics> {
  const empty: MarketingAnalytics = {
    promoCount: 0,
    promoRedemptions: 0,
    promoDiscountXaf: 0,
    promoRevenueXaf: 0,
    referralClicks: 0,
    referralConversions: 0,
    referralRewardsXaf: 0,
    affiliateClicks: 0,
    affiliateConversions: 0,
    affiliateCommissionsXaf: 0,
    attributedRevenueXaf: 0,
    marketingSpendXaf: 0,
  };
  if (!isSupabaseConfigured) return empty;
  const supabase = await createClient();

  const { data: promos } = await supabase
    .from("promo_codes")
    .select("id")
    .eq("organizer_id", organizerId);
  const promoIds = (promos ?? []).map((p) => p.id);

  const { data: redemptions } = promoIds.length
    ? await supabase
        .from("promo_redemptions")
        .select("discount_xaf, bookings!inner(subtotal_xaf, status, event_id, events!inner(organizer_id))")
        .in("promo_code_id", promoIds)
    : { data: [] };

  const confirmed = ((redemptions ?? []) as any[]).filter(
    (r) => r.bookings?.status === "confirmed",
  );

  // Referral stats across this organizer's events
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("organizer_id", organizerId);
  const eventIds = (events ?? []).map((e) => e.id);
  const { data: refs } = eventIds.length
    ? await supabase
        .from("referral_links")
        .select("clicks_count, conversions_count, id")
        .in("event_id", eventIds)
    : { data: [] };
  const refIds = (refs ?? []).map((r) => r.id);
  const { data: refRewards } = refIds.length
    ? await supabase
        .from("referral_rewards")
        .select("reward_xaf, status")
        .in("referral_link_id", refIds)
    : { data: [] };

  // Affiliate stats
  const { data: affs } = await supabase
    .from("affiliate_profiles")
    .select("id, clicks_count, conversions_count")
    .eq("organizer_id", organizerId);
  const affIds = (affs ?? []).map((a) => a.id);
  const { data: affComms } = affIds.length
    ? await supabase
        .from("affiliate_commissions")
        .select("commission_xaf, status, bookings!inner(subtotal_xaf, status)")
        .in("affiliate_id", affIds)
    : { data: [] };

  const { data: expenses } = await supabase
    .from("event_expenses")
    .select("amount_xaf")
    .eq("organizer_id", organizerId)
    .eq("category", "marketing");

  const confirmedComms = ((affComms ?? []) as any[]).filter(
    (c) => c.bookings?.status === "confirmed",
  );

  return {
    promoCount: promoIds.length,
    promoRedemptions: confirmed.length,
    promoDiscountXaf: confirmed.reduce(
      (s, r) => s + Number(r.discount_xaf ?? 0),
      0,
    ),
    promoRevenueXaf: confirmed.reduce(
      (s, r) => s + Number(r.bookings?.subtotal_xaf ?? 0),
      0,
    ),
    referralClicks: (refs ?? []).reduce(
      (s, r) => s + Number(r.clicks_count ?? 0),
      0,
    ),
    referralConversions: (refs ?? []).reduce(
      (s, r) => s + Number(r.conversions_count ?? 0),
      0,
    ),
    referralRewardsXaf: ((refRewards ?? []) as any[])
      .filter((r) => r.status !== "cancelled")
      .reduce((s, r) => s + Number(r.reward_xaf ?? 0), 0),
    affiliateClicks: (affs ?? []).reduce(
      (s, a) => s + Number(a.clicks_count ?? 0),
      0,
    ),
    affiliateConversions: (affs ?? []).reduce(
      (s, a) => s + Number(a.conversions_count ?? 0),
      0,
    ),
    affiliateCommissionsXaf: confirmedComms.reduce(
      (s, c) => s + Number(c.commission_xaf ?? 0),
      0,
    ),
    attributedRevenueXaf:
      confirmed.reduce((s, r) => s + Number(r.bookings?.subtotal_xaf ?? 0), 0) +
      confirmedComms.reduce(
        (s, c) => s + Number(c.bookings?.subtotal_xaf ?? 0),
        0,
      ),
    marketingSpendXaf: (expenses ?? []).reduce(
      (s, e) => s + Number(e.amount_xaf ?? 0),
      0,
    ),
  };
}

export { type ReferralLinkRow, type ReferralRewardRow, type AffiliateCommissionRow };
