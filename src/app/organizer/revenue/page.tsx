import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Banknote, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RevenueAreaChart } from "@/components/dashboard/charts";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireOrganizer } from "@/lib/auth";
import {
  getOrganizerAnalytics,
  getOrganizerBalance,
  getOrganizerOverview,
} from "@/lib/data/organizer";
import { formatDateTime, formatShortDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Revenue" };

export default async function OrganizerRevenuePage() {
  const viewer = await requireOrganizer("/organizer/revenue");

  if (!viewer.organizerId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Insights"
          title="Revenue"
          description="An organizer profile is required to see revenue."
        />
        <Alert tone="warning">No organizer profile is linked to your account.</Alert>
      </div>
    );
  }

  const [overview, analytics, balance] = await Promise.all([
    getOrganizerOverview(viewer.organizerId),
    getOrganizerAnalytics(viewer.organizerId),
    getOrganizerBalance(viewer.organizerId),
  ]);

  const paidOut = overview.payouts
    .filter((payout) => payout.status === "paid")
    .reduce((sum, payout) => sum + payout.amountXaf, 0);
  const pendingPayouts = overview.payouts
    .filter((payout) => ["requested", "approved", "processing"].includes(payout.status))
    .reduce((sum, payout) => sum + payout.amountXaf, 0);
  const gross = overview.totals.totalRevenue;

  const revenuePoints = analytics.daily.map((point) => ({
    label: formatShortDate(point.day),
    revenue: point.revenueXaf,
    orders: point.orders,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Revenue"
        description="What your events have earned, what is available, and what has been paid out."
        actions={
          <Link
            href="/organizer/payouts"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            Request payout
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross ticket revenue"
          value={formatXAF(gross)}
          hint="before platform fees"
          icon={Receipt}
        />
        <StatCard
          label="Available balance"
          value={formatXAF(balance)}
          hint="eligible for payout"
          icon={Wallet}
        />
        <StatCard
          label="Pending payouts"
          value={formatXAF(pendingPayouts)}
          hint="in review or processing"
          icon={Banknote}
        />
        <StatCard
          label="Paid out"
          value={formatXAF(paidOut)}
          hint="settled to you"
          icon={Banknote}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily revenue · last 30 days</CardTitle>
          <p className="mt-1 text-[11px] text-muted">
            Organizer revenue excludes the TICKORA service fee paid by attendees.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <RevenueAreaChart data={revenuePoints} />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by event</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <TableContainer>
              <THead>
                <TH>Event</TH>
                <TH>Orders</TH>
                <TH>Tickets</TH>
                <TH>Revenue</TH>
              </THead>
              <TBody>
                {analytics.events.map((event) => (
                  <TR key={event.eventId}>
                    <TD>
                      <Link
                        href={`/organizer/events/${event.eventId}`}
                        className="block max-w-[260px] truncate font-medium text-ink hover:text-accent-200"
                      >
                        {event.title}
                      </Link>
                    </TD>
                    <TD>{event.orders}</TD>
                    <TD>{event.ticketsSold}</TD>
                    <TD className="whitespace-nowrap font-semibold">
                      {formatXAF(event.grossRevenue)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout history</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {overview.payouts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-[12px] text-muted">
                No payout requests yet. Your available balance can be requested once it
                reaches the platform minimum.
              </p>
            ) : (
              <div className="space-y-2">
                {overview.payouts.slice(0, 6).map((payout) => (
                  <div
                    key={payout.id}
                    className="rounded-xl border border-line p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-ink">
                        {formatXAF(payout.amountXaf)}
                      </span>
                      <StatusBadge kind="payout" status={payout.status} />
                    </div>
                    <p className="mt-1 text-[10.5px] text-muted">
                      {payout.method.replace("_", " ")} · {payout.destination}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      {formatDateTime(payout.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/organizer/payouts"
              className="mt-3 inline-flex text-[11px] font-semibold text-accent-300 hover:underline"
            >
              Manage payouts →
            </Link>
          </CardContent>
        </Card>
      </div>

      <p className="text-[10.5px] leading-4 text-muted">
        Available balance is calculated by a trusted database function from confirmed
        sales minus refunds, fees and payouts already requested or paid. Figures update
        whenever an order is confirmed or refunded.
      </p>
    </div>
  );
}
