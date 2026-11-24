import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RevenueAreaChart } from "@/components/dashboard/charts";
import { EventTabs } from "@/components/organizer/event-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireOrganizer } from "@/lib/auth";
import {
  getEventAnalytics,
  getOrganizerEvent,
} from "@/lib/data/organizer";
import { formatShortDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Event analytics" };

export default async function EventAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireOrganizer(`/organizer/events/${id}/analytics`);
  if (!viewer.organizerId) notFound();
  const [detail, analytics] = await Promise.all([
    getOrganizerEvent(viewer.organizerId, id),
    getEventAnalytics(id),
  ]);
  if (!detail) notFound();

  const checkInRate =
    analytics.ticketsSold > 0
      ? Math.round((analytics.checkedIn / analytics.ticketsSold) * 100)
      : 0;
  const sellThrough =
    detail.capacity > 0
      ? Math.round((analytics.ticketsSold / detail.capacity) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <Link
        href={`/organizer/events/${id}`}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to event
      </Link>
      <PageHeader
        eyebrow="Event workspace"
        title="Event analytics"
        description={`Live performance for ${detail.title}, calculated from confirmed bookings.`}
      />
      <EventTabs eventId={id} active="analytics" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross revenue"
          value={formatXAF(analytics.grossRevenue)}
          hint="confirmed ticket subtotals"
          icon={TrendingUp}
        />
        <StatCard
          label="Tickets sold"
          value={String(analytics.ticketsSold)}
          hint={`${sellThrough}% of capacity`}
          icon={Ticket}
        />
        <StatCard
          label="Orders"
          value={String(analytics.orders)}
          hint="confirmed bookings"
          icon={Users}
        />
        <StatCard
          label="Check-in rate"
          value={`${checkInRate}%`}
          hint={`${analytics.checkedIn} scanned`}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent-300" />
              Booking trend
            </CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              Revenue grouped by the day each booking was confirmed.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <RevenueAreaChart
              data={analytics.daily.map((point) => ({
                label: formatShortDate(point.day),
                revenue: point.revenueXaf,
                orders: point.orders,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory & attendance</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="space-y-3 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-muted">Capacity</dt>
                <dd className="font-semibold text-ink">
                  {detail.capacity || "Uncapped"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Sold</dt>
                <dd className="font-semibold text-ink">{analytics.ticketsSold}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Remaining</dt>
                <dd className="font-semibold text-ink">{analytics.remaining}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3">
                <dt className="text-muted">Checked in</dt>
                <dd className="font-semibold text-ink">{analytics.checkedIn}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Page views</dt>
                <dd className="font-semibold text-ink">{detail.viewsCount}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales by ticket tier</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="space-y-3 px-5 pb-5 sm:px-6">
            {detail.ticketTypes.map((tier) => {
              const total = Number(tier.quantity_total ?? 0);
              const sold = Number(tier.quantity_sold ?? 0);
              const percent = total > 0 ? Math.round((sold / total) * 100) : 0;
              const revenue = sold * Number(tier.price_xaf ?? 0);
              return (
                <div key={tier.id} className="rounded-lg border border-line bg-base p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[12.5px] font-semibold text-ink">
                        {tier.name}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted">
                        {formatXAF(Number(tier.price_xaf))} per ticket
                      </p>
                    </div>
                    <p className="text-[12px] font-semibold text-ink">
                      {formatXAF(revenue)}
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-muted">
                    {sold} of {total} sold · {percent}%
                  </p>
                </div>
              );
            })}
            {detail.ticketTypes.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-muted">
                No ticket tiers configured.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
