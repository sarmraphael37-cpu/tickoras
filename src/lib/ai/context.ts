import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getOrganizerFinanceReport } from "@/lib/data/organizer";
import { getMarketingAnalytics } from "@/lib/data/marketing";

export interface EventInsight {
  id: string;
  title: string;
  status: string;
  startAt: string;
  capacity: number;
  sold: number;
  remaining: number;
  revenueXaf: number;
  expensesXaf: number;
  daysUntilEvent: number;
  velocityPerDay: number | null;
  projectedSales: number | null;
  sellOutLikelihood: "high" | "possible" | "unlikely" | "unknown";
}

export interface OrganizerInsights {
  organizerId: string;
  generatedAt: string;
  events: EventInsight[];
  totals: {
    events: number;
    ticketsSold: number;
    capacity: number;
    grossRevenueXaf: number;
    expensesXaf: number;
    estimatedProfitXaf: number;
  };
  finance30d: {
    grossRevenueXaf: number;
    expensesXaf: number;
    estimatedProfitXaf: number;
    ticketsSold: number;
  };
  marketing: {
    promoRedemptions: number;
    promoDiscountXaf: number;
    referralClicks: number;
    referralConversions: number;
    affiliateClicks: number;
    affiliateConversions: number;
    attributedRevenueXaf: number;
    marketingSpendXaf: number;
    roas: number | null;
  };
  ticketTierVelocity: Array<{
    eventTitle: string;
    tier: string;
    sold: number;
    capacity: number;
    sellThroughPct: number;
  }>;
  topAffiliate: { name: string; conversions: number; clicks: number } | null;
  topPromo: { code: string; redemptions: number; discountXaf: number } | null;
}

/** Aggregate real, organizer-scoped business data for the assistant. */
export async function buildOrganizerInsights(
  organizerId: string,
): Promise<OrganizerInsights | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();

  const { data: eventRows } = await supabase
    .from("events")
    .select("id, title, status, start_at")
    .eq("organizer_id", organizerId)
    .order("start_at", { ascending: true });
  const events = (eventRows ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    start_at: string;
  }>;
  if (events.length === 0) {
    return {
      organizerId,
      generatedAt: new Date().toISOString(),
      events: [],
      totals: {
        events: 0, ticketsSold: 0, capacity: 0,
        grossRevenueXaf: 0, expensesXaf: 0, estimatedProfitXaf: 0,
      },
      finance30d: { grossRevenueXaf: 0, expensesXaf: 0, estimatedProfitXaf: 0, ticketsSold: 0 },
      marketing: {
        promoRedemptions: 0, promoDiscountXaf: 0,
        referralClicks: 0, referralConversions: 0,
        affiliateClicks: 0, affiliateConversions: 0,
        attributedRevenueXaf: 0, marketingSpendXaf: 0, roas: null,
      },
      ticketTierVelocity: [],
      topAffiliate: null,
      topPromo: null,
    };
  }

  const eventIds = events.map((e) => e.id);
  const now = Date.now();

  const [tiersRes, bookingsRes, finance30, marketing, expensesRes, topAffRes, promoIdsRes] =
    await Promise.all([
      supabase
        .from("ticket_types")
        .select("id, event_id, name, price_xaf, quantity_total, quantity_sold")
        .in("event_id", eventIds),
      supabase
        .from("bookings")
        .select("id, event_id, status, subtotal_xaf, created_at, confirmed_at")
        .in("event_id", eventIds)
        .eq("status", "confirmed"),
      getOrganizerFinanceReport(organizerId, 30),
      getMarketingAnalytics(organizerId),
      supabase
        .from("event_expenses")
        .select("event_id, amount_xaf")
        .eq("organizer_id", organizerId),
      supabase
        .from("affiliate_profiles")
        .select("display_name, conversions_count, clicks_count")
        .eq("organizer_id", organizerId)
        .eq("status", "approved")
        .order("conversions_count", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("promo_codes")
        .select("id")
        .eq("organizer_id", organizerId),
    ]);

  // Top promo by confirmed redemptions
  const promoIds = ((promoIdsRes.data ?? []) as any[]).map((p) => p.id);
  let topPromo: OrganizerInsights["topPromo"] = null;
  if (promoIds.length > 0) {
    const { data: redemptions } = await supabase
      .from("promo_redemptions")
      .select("promo_code_id, discount_xaf, bookings!inner(status)")
      .in("promo_code_id", promoIds);
    const counts = new Map<string, { n: number; discount: number }>();
    for (const r of (redemptions ?? []) as any[]) {
      if (r.bookings?.status !== "confirmed") continue;
      const cur = counts.get(r.promo_code_id) ?? { n: 0, discount: 0 };
      cur.n += 1;
      cur.discount += Number(r.discount_xaf ?? 0);
      counts.set(r.promo_code_id, cur);
    }
    const best = Array.from(counts.entries()).sort((a, b) => b[1].n - a[1].n)[0];
    if (best) {
      const { data: pc } = await supabase
        .from("promo_codes")
        .select("code")
        .eq("id", best[0])
        .single();
      topPromo = {
        code: (pc as any)?.code ?? "?",
        redemptions: best[1].n,
        discountXaf: best[1].discount,
      };
    }
  }

  const tiers = (tiersRes.data ?? []) as any[];
  const bookings = (bookingsRes.data ?? []) as any[];
  const expenses = (expensesRes.data ?? []) as any[];

  const revenueByEvent = new Map<string, number>();
  const firstSaleByEvent = new Map<string, number>();
  for (const b of bookings) {
    revenueByEvent.set(
      b.event_id,
      (revenueByEvent.get(b.event_id) ?? 0) + Number(b.subtotal_xaf ?? 0),
    );
    const ts = new Date(b.confirmed_at ?? b.created_at).getTime();
    const prev = firstSaleByEvent.get(b.event_id);
    if (prev === undefined || ts < prev) firstSaleByEvent.set(b.event_id, ts);
  }
  // tickets sold per event comes from ticket_types.quantity_sold (maintained
  // by inventory triggers) — more accurate than summing bookings.
  const tierStatsByEvent = new Map<
    string,
    { capacity: number; sold: number }
  >();
  for (const t of tiers) {
    const cur = tierStatsByEvent.get(t.event_id) ?? { capacity: 0, sold: 0 };
    cur.capacity += Number(t.quantity_total ?? 0);
    cur.sold += Number(t.quantity_sold ?? 0);
    tierStatsByEvent.set(t.event_id, cur);
  }

  const expenseByEvent = new Map<string, number>();
  for (const e of expenses) {
    if (!e.event_id) continue;
    expenseByEvent.set(
      e.event_id,
      (expenseByEvent.get(e.event_id) ?? 0) + Number(e.amount_xaf ?? 0),
    );
  }

  const insights: EventInsight[] = events.map((event) => {
    const stats = tierStatsByEvent.get(event.id) ?? { capacity: 0, sold: 0 };
    const capacity = stats.capacity;
    const sold = stats.sold;
    const remaining = Math.max(0, capacity - sold);
    const startMs = new Date(event.start_at).getTime();
    const daysUntil = Math.max(0, (startMs - now) / 86400_000);
    const firstSale = firstSaleByEvent.get(event.id);
    const salesWindowDays =
      firstSale !== undefined
        ? Math.max(1, (now - firstSale) / 86400_000)
        : null;
    const velocity =
      salesWindowDays && salesWindowDays >= 1 && sold > 0
        ? sold / salesWindowDays
        : null;
    const projected =
      velocity !== null ? Math.min(capacity, Math.round(sold + velocity * daysUntil)) : null;

    let sellOut: EventInsight["sellOutLikelihood"] = "unknown";
    if (capacity > 0 && remaining === 0) sellOut = "high";
    else if (projected !== null && daysUntil > 0) {
      const coverage = projected / capacity;
      if (coverage >= 0.95) sellOut = "high";
      else if (coverage >= 0.7) sellOut = "possible";
      else sellOut = "unlikely";
    }

    return {
      id: event.id,
      title: event.title,
      status: event.status,
      startAt: event.start_at,
      capacity,
      sold,
      remaining,
      revenueXaf: revenueByEvent.get(event.id) ?? 0,
      expensesXaf: expenseByEvent.get(event.id) ?? 0,
      daysUntilEvent: Math.round(daysUntil * 10) / 10,
      velocityPerDay: velocity !== null ? Math.round(velocity * 10) / 10 : null,
      projectedSales: projected,
      sellOutLikelihood: sellOut,
    };
  });

  const ticketTierVelocity = tiers.map((t) => {
    const capacity = Number(t.quantity_total ?? 0);
    const sold = Number(t.quantity_sold ?? 0);
    const event = events.find((e) => e.id === t.event_id);
    return {
      eventTitle: event?.title ?? "Event",
      tier: t.name,
      sold,
      capacity,
      sellThroughPct: capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
    };
  });

  const totalSold = insights.reduce((s, e) => s + e.sold, 0);
  const totalCap = insights.reduce((s, e) => s + e.capacity, 0);
  const totalRev = insights.reduce((s, e) => s + e.revenueXaf, 0);
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount_xaf ?? 0), 0);

  return {
    organizerId,
    generatedAt: new Date().toISOString(),
    events: insights,
    totals: {
      events: events.length,
      ticketsSold: totalSold,
      capacity: totalCap,
      grossRevenueXaf: totalRev,
      expensesXaf: totalExp,
      estimatedProfitXaf: totalRev - totalExp,
    },
    finance30d: {
      grossRevenueXaf: finance30.grossRevenueXaf,
      expensesXaf: finance30.expensesXaf,
      estimatedProfitXaf: finance30.estimatedProfitXaf,
      ticketsSold: finance30.ticketsSold,
    },
    marketing: {
      promoRedemptions: marketing.promoRedemptions,
      promoDiscountXaf: marketing.promoDiscountXaf,
      referralClicks: marketing.referralClicks,
      referralConversions: marketing.referralConversions,
      affiliateClicks: marketing.affiliateClicks,
      affiliateConversions: marketing.affiliateConversions,
      attributedRevenueXaf: marketing.attributedRevenueXaf,
      marketingSpendXaf: marketing.marketingSpendXaf,
      roas:
        marketing.marketingSpendXaf > 0
          ? Math.round(
              (marketing.attributedRevenueXaf / marketing.marketingSpendXaf) * 10,
            ) / 10
          : null,
    },
    ticketTierVelocity,
    topAffiliate: topAffRes.data
      ? {
          name: (topAffRes.data as any).display_name,
          conversions: Number((topAffRes.data as any).conversions_count ?? 0),
          clicks: Number((topAffRes.data as any).clicks_count ?? 0),
        }
      : null,
    topPromo,
  };
}
