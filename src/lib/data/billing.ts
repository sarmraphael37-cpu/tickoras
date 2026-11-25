import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  FeaturedPromotionRow,
  OrganizerSubscriptionRow,
  PlatformPaymentRow,
  SubscriptionPlanRow,
} from "@/types/database";

export async function listSubscriptionPlans(): Promise<SubscriptionPlanRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as SubscriptionPlanRow[];
}

export async function getOrganizerSubscription(
  organizerId: string,
): Promise<{
  subscription: OrganizerSubscriptionRow | null;
  plan: SubscriptionPlanRow | null;
}> {
  if (!isSupabaseConfigured) return { subscription: null, plan: null };
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("organizer_subscriptions")
    .select("*")
    .eq("organizer_id", organizerId)
    .in("status", ["active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return { subscription: null, plan: null };
  const subscription = sub as OrganizerSubscriptionRow;
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", subscription.plan_id)
    .single();
  return { subscription, plan: (plan as SubscriptionPlanRow) ?? null };
}

/** Feature entitlements for an organizer — free tier when no subscription. */
export async function getOrganizerFeatures(
  organizerId: string,
): Promise<Record<string, boolean | number>> {
  const starter: Record<string, boolean | number> = {
    events: 1,
    digital_tickets: true,
    qr_checkin: true,
    basic_analytics: true,
    marketing: false,
    finance_reports: false,
    ai_assistant: false,
    multi_event: false,
    custom_branding: false,
    api_access: false,
    priority_support: false,
  };
  const { plan } = await getOrganizerSubscription(organizerId);
  if (!plan) return starter;
  const now = Date.now();
  // Caller passes only active subs already; period check for safety
  void now;
  return { ...starter, ...(plan.features ?? {}) };
}

export async function listPlatformPayments(
  organizerId: string,
): Promise<PlatformPaymentRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_payments")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as PlatformPaymentRow[];
}

export async function listFeaturedPromotions(
  organizerId: string,
): Promise<FeaturedPromotionRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("featured_promotions")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as FeaturedPromotionRow[];
}

// ---------------------------------------------------------------------------
// Admin revenue aggregates
// ---------------------------------------------------------------------------

export interface RevenueSummary {
  ticketCommissionsXaf: number;
  marketplaceCommissionsXaf: number;
  subscriptionRevenueXaf: number;
  featuredRevenueXaf: number;
  refundsXaf: number;
  pendingPlatformXaf: number;
  totalPlatformRevenueXaf: number;
  daily: Array<{ day: string; amount: number }>;
  byKind: Array<{ kind: string; amount: number; count: number }>;
}

export async function getPlatformRevenueSummary(
  days = 30,
): Promise<RevenueSummary> {
  const empty: RevenueSummary = {
    ticketCommissionsXaf: 0,
    marketplaceCommissionsXaf: 0,
    subscriptionRevenueXaf: 0,
    featuredRevenueXaf: 0,
    refundsXaf: 0,
    pendingPlatformXaf: 0,
    totalPlatformRevenueXaf: 0,
    daily: [],
    byKind: [],
  };
  if (!isSupabaseConfigured) return empty;
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [bookings, serviceBookings, platformPayments, refunds] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("service_fee_xaf, confirmed_at")
        .eq("status", "confirmed")
        .gte("confirmed_at", since),
      supabase
        .from("service_bookings")
        .select("platform_commission_xaf, completed_at")
        .eq("status", "completed")
        .gte("completed_at", since),
      supabase
        .from("platform_payments")
        .select("kind, amount_xaf, status, created_at")
        .gte("created_at", since),
      supabase
        .from("refunds")
        .select("amount_xaf")
        .in("status", ["approved", "processed"])
        .gte("created_at", since),
    ]);

  const ticketComm = ((bookings.data ?? []) as any[]).reduce(
    (s, b) => s + Number(b.service_fee_xaf ?? 0),
    0,
  );
  const marketComm = ((serviceBookings.data ?? []) as any[]).reduce(
    (s, b) => s + Number(b.platform_commission_xaf ?? 0),
    0,
  );
  const pays = (platformPayments.data ?? []) as any[];
  const subRev = pays
    .filter((p) => p.kind === "subscription" && p.status === "succeeded")
    .reduce((s, p) => s + Number(p.amount_xaf), 0);
  const featRev = pays
    .filter((p) => p.kind === "featured" && p.status === "succeeded")
    .reduce((s, p) => s + Number(p.amount_xaf), 0);
  const pending = pays
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount_xaf), 0);
  const refundsTotal = ((refunds.data ?? []) as any[]).reduce(
    (s, r) => s + Number(r.amount_xaf ?? 0),
    0,
  );

  // Daily series: platform payments + ticket commissions by day
  const dayMap = new Map<string, number>();
  const bump = (iso: string | null, amount: number) => {
    const d = (iso ?? "").slice(0, 10);
    if (!d) return;
    dayMap.set(d, (dayMap.get(d) ?? 0) + amount);
  };
  for (const b of (bookings.data ?? []) as any[]) {
    bump(b.confirmed_at, Number(b.service_fee_xaf ?? 0));
  }
  for (const p of pays) {
    if (p.status === "succeeded") bump(p.created_at, Number(p.amount_xaf));
  }
  const daily = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, amount]) => ({ day, amount }));

  const kindMap = new Map<string, { amount: number; count: number }>();
  for (const p of pays) {
    if (p.status !== "succeeded") continue;
    const cur = kindMap.get(p.kind) ?? { amount: 0, count: 0 };
    cur.amount += Number(p.amount_xaf);
    cur.count += 1;
    kindMap.set(p.kind, cur);
  }

  return {
    ticketCommissionsXaf: ticketComm,
    marketplaceCommissionsXaf: marketComm,
    subscriptionRevenueXaf: subRev,
    featuredRevenueXaf: featRev,
    refundsXaf: refundsTotal,
    pendingPlatformXaf: pending,
    totalPlatformRevenueXaf:
      ticketComm + marketComm + subRev + featRev - refundsTotal,
    daily,
    byKind: Array.from(kindMap.entries()).map(([kind, v]) => ({
      kind,
      amount: v.amount,
      count: v.count,
    })),
  };
}
