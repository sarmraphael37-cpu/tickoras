import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CheckCircle2, Ticket, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  PopularBarChart,
  RevenueAreaChart,
} from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireOrganizer } from "@/lib/auth";
import { getOrganizerAnalytics } from "@/lib/data/organizer";
import { formatShortDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

export default async function OrganizerAnalyticsPage() {
  const viewer = await requireOrganizer("/organizer/analytics");
  const analytics = viewer.organizerId
    ? await getOrganizerAnalytics(viewer.organizerId)
    : { daily: [], events: [] };

  const totalRevenue = analytics.events.reduce(
    (sum, event) => sum + event.grossRevenue,
    0,
  );
  const totalOrders = analytics.events.reduce((sum, event) => sum + event.orders, 0);
  const totalTickets = analytics.events.reduce(
    (sum, event) => sum + event.ticketsSold,
    0,
  );
  const totalCheckedIn = analytics.events.reduce(
    (sum, event) => sum + event.checkedIn,
    0,
  );

  const revenuePoints = analytics.daily.map((point) => ({
    label: formatShortDate(point.day),
    revenue: point.revenueXaf,
    orders: point.orders,
  }));
  const topEvents = analytics.events
    .filter((event) => event.grossRevenue > 0)
    .slice(0, 6)
    .map((event) => ({
      name:
        event.title.length > 22 ? `${event.title.slice(0, 22)}…` : event.title,
      value: event.grossRevenue,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Sales, orders and attendance built from confirmed bookings — never estimated."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross revenue"
          value={formatXAF(totalRevenue)}
          hint="all confirmed sales"
          icon={TrendingUp}
        />
        <StatCard
          label="Orders"
          value={String(totalOrders)}
          hint="confirmed bookings"
          icon={BarChart3}
        />
        <StatCard
          label="Tickets sold"
          value={String(totalTickets)}
          hint="across all events"
          icon={Ticket}
        />
        <StatCard
          label="Checked in"
          value={String(totalCheckedIn)}
          hint={
            totalTickets > 0
              ? `${Math.round((totalCheckedIn / totalTickets) * 100)}% attendance`
              : "no tickets yet"
          }
          icon={CheckCircle2}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily revenue · last 30 days</CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              Revenue before TICKORA service fees.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <RevenueAreaChart data={revenuePoints} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top events by revenue</CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              Your highest-grossing published experiences.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <PopularBarChart data={topEvents} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance by event</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {analytics.events.length === 0 ? (
            <p className="px-5 pb-6 text-[12px] text-muted sm:px-6">
              No events to analyse yet.{" "}
              <Link
                href="/organizer/events/create"
                className="font-semibold text-accent-300 hover:underline"
              >
                Create one
              </Link>{" "}
              to start collecting real sales data.
            </p>
          ) : (
            <TableContainer>
              <THead>
                <TH>Event</TH>
                <TH>Tickets</TH>
                <TH>Orders</TH>
                <TH>Checked in</TH>
                <TH>Attendance</TH>
                <TH>Revenue</TH>
                <TH />
              </THead>
              <TBody>
                {analytics.events.map((event) => (
                  <TR key={event.eventId}>
                    <TD>
                      <p className="max-w-[240px] truncate font-medium text-ink">
                        {event.title}
                      </p>
                    </TD>
                    <TD>{event.ticketsSold}</TD>
                    <TD>{event.orders}</TD>
                    <TD>{event.checkedIn}</TD>
                    <TD>
                      {event.ticketsSold > 0
                        ? `${Math.round((event.checkedIn / event.ticketsSold) * 100)}%`
                        : "—"}
                    </TD>
                    <TD className="whitespace-nowrap font-semibold">
                      {formatXAF(event.grossRevenue)}
                    </TD>
                    <TD>
                      <Link
                        href={`/organizer/events/${event.eventId}`}
                        className="whitespace-nowrap text-[11px] font-semibold text-accent-300 hover:underline"
                      >
                        Details →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <p className="text-[10.5px] leading-4 text-muted">
        Revenue counts confirmed bookings only. Refunded orders are excluded by the
        platform sales views. Service fees are retained by TICKORA and shown separately
        at checkout.
      </p>
    </div>
  );
}
