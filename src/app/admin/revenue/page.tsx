import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import {
  PlanPriceForm,
  SettlePaymentButton,
} from "@/components/organizer/billing-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth";
import { getPlatformRevenueSummary } from "@/lib/data/billing";
import { listSubscriptionPlans } from "@/lib/data/billing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Platform Revenue" };
export const dynamic = "force-dynamic";

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin("/admin/revenue");
  const { days } = await searchParams;
  const period = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;

  const [summary, plans, pendingPayments] = await Promise.all([
    getPlatformRevenueSummary(period),
    listSubscriptionPlans(),
    (async () => {
      if (!isSupabaseConfigured) return [];
      const supabase = await createClient();
      const { data } = await supabase
        .from("platform_payments")
        .select("*, organizer:organizers(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as any[];
    })(),
  ]);

  const allPlans = isSupabaseConfigured
    ? await (async () => {
        const supabase = await createClient();
        const { data } = await supabase
          .from("subscription_plans")
          .select("*")
          .order("sort_order");
        return (data ?? []) as any[];
      })()
    : plans;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monetization"
        title="Platform revenue"
        description={`Last ${period} days — commissions, subscriptions, featured promotions and refunds.`}
      />

      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <a
            key={d}
            href={`/admin/revenue?days=${d}`}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
              period === d
                ? "border-forest bg-forest text-white"
                : "border-line bg-card text-muted"
            }`}
          >
            {d} days
          </a>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ticket commissions" value={formatXAF(summary.ticketCommissionsXaf)} hint="Service fees on confirmed bookings" icon={BarChart3} />
        <StatCard label="Marketplace commissions" value={formatXAF(summary.marketplaceCommissionsXaf)} hint="Completed service bookings" icon={BarChart3} />
        <StatCard label="Subscriptions" value={formatXAF(summary.subscriptionRevenueXaf)} icon={BarChart3} />
        <StatCard label="Featured promos" value={formatXAF(summary.featuredRevenueXaf)} icon={BarChart3} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total platform revenue" value={formatXAF(summary.totalPlatformRevenueXaf)} hint="Net of refunds" icon={BarChart3} />
        <StatCard label="Pending settlements" value={formatXAF(summary.pendingPlatformXaf)} hint="Awaiting verification" icon={BarChart3} />
        <StatCard label="Refunds issued" value={formatXAF(summary.refundsXaf)} icon={BarChart3} />
      </div>

      {/* Daily trend */}
      <Card>
        <CardHeader><CardTitle className="text-[15px]">Daily revenue</CardTitle></CardHeader>
        <CardContent className="pt-4">
          {summary.daily.length === 0 ? (
            <p className="text-[12px] text-muted">No revenue in this period.</p>
          ) : (
            <div className="space-y-1.5">
              {summary.daily.slice(-14).map((d) => (
                <div key={d.day} className="flex items-center justify-between text-[11.5px]">
                  <span className="text-muted">{d.day}</span>
                  <span className="font-medium text-ink">{formatXAF(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans management */}
      <Card>
        <CardHeader><CardTitle className="text-[15px]">Subscription plans</CardTitle></CardHeader>
        <CardContent className="pt-4">
          <div className="divide-y divide-line">
            {allPlans.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    {p.name} <span className="font-mono text-[10px] text-muted">{p.code}</span>
                  </p>
                  <p className="text-[11px] text-muted">
                    {p.is_active ? "Active" : "Disabled"} · {p.billing_months}mo billing
                  </p>
                </div>
                <PlanPriceForm planId={p.id} price={Number(p.price_xaf)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending platform payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">
            Pending platform payments ({pendingPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {pendingPayments.length === 0 ? (
            <p className="text-[12px] text-muted">Nothing awaiting settlement.</p>
          ) : (
            <div className="divide-y divide-line">
              {pendingPayments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">
                      {(p.organizer as any)?.name ?? "Organizer"} · {p.kind} ·{" "}
                      {formatXAF(p.amount_xaf)}
                    </p>
                    <p className="text-[10.5px] text-muted">
                      {p.provider} · {formatDate(p.created_at)} · id {p.id.slice(0, 8)}
                    </p>
                  </div>
                  <SettlePaymentButton paymentId={p.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kind breakdown */}
      {summary.byKind.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-[15px]">Revenue by kind</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              {summary.byKind.map((k) => (
                <Badge key={k.kind} tone="neutral">
                  {k.kind}: {formatXAF(k.amount)} ({k.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
