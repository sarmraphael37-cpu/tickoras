import type { Metadata } from "next";
import Link from "next/link";
import { Download, TrendingUp, Users, CalendarDays, Ticket, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RevenueAreaChart } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth";
import { getAdminAnalytics } from "@/lib/data/admin";
import { formatShortDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin("/admin/analytics");
  const { days } = await searchParams;
  const range = RANGES.some((item) => item.value === Number(days)) ? Number(days) : 30;
  const analytics = await getAdminAnalytics(range);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Analytics"
        description="Platform-wide metrics derived from real Supabase records."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-line bg-card p-1">
              {RANGES.map((item) => (
                <Link key={item.value} href={`/admin/analytics?days=${item.value}`} className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${range === item.value ? "bg-brand-600 text-white" : "text-muted hover:text-ink"}`}>
                  {item.label}
                </Link>
              ))}
            </div>
            <Link href={`/api/admin/reports/financial?days=${range}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-[11px] font-semibold text-ink hover:border-brand-400">
              <Download className="h-3.5 w-3.5" /> CSV
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross volume" value={formatXAF(analytics.totals.grossVolume)} hint="succeeded payments" icon={TrendingUp} />
        <StatCard label="Platform revenue" value={formatXAF(analytics.totals.platformRevenue)} hint="service fees" icon={CreditCard} />
        <StatCard label="Bookings" value={String(analytics.totals.bookings)} hint={`${analytics.totals.confirmedBookings} confirmed`} icon={CalendarDays} />
        <StatCard label="Tickets issued" value={String(analytics.totals.tickets)} hint={`${analytics.totals.checkIns} checked in`} icon={Ticket} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform revenue · last {range} days</CardTitle>
          <p className="mt-1 text-[11px] text-muted">Organizer payouts and TICKORA service fees from confirmed bookings.</p>
        </CardHeader>
        <CardContent className="pt-4">
          <RevenueAreaChart data={analytics.revenue.map((point) => ({ label: formatShortDate(point.day), revenue: point.revenueXaf + point.platformXaf, orders: point.orders }))} />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Events by city</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-3">
              {analytics.cityCounts.map((item) => (
                <li key={item.city} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted">{item.city}</span>
                  <span className="font-semibold text-ink">{item.count}</span>
                </li>
              ))}
              {analytics.cityCounts.length === 0 ? <li className="text-[12px] text-muted">No event data.</li> : null}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Events by category</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-3">
              {analytics.categoryCounts.map((item) => (
                <li key={item.category} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted">{item.category}</span>
                  <span className="font-semibold text-ink">{item.count}</span>
                </li>
              ))}
              {analytics.categoryCounts.length === 0 ? <li className="text-[12px] text-muted">No category data.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={String(analytics.totals.users)} icon={Users} />
        <StatCard label="Organizers" value={String(analytics.totals.organizers)} icon={Users} />
        <StatCard label="Published events" value={String(analytics.totals.publishedEvents)} icon={CalendarDays} />
        <StatCard label="Refund volume" value={formatXAF(analytics.totals.refundVolume)} icon={CreditCard} />
      </div>
    </div>
  );
}
