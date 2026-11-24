import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Flag,
  Mail,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RevenueAreaChart } from "@/components/dashboard/charts";
import { Badge } from "@/components/ui/badge";
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
import { requireAdmin } from "@/lib/auth";
import { getAdminAnalytics, getAdminOverview } from "@/lib/data/admin";
import {
  formatDateTime,
  formatShortDate,
  formatXAF,
  relativeTime,
  titleCase,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Platform overview" };

export default async function AdminOverviewPage() {
  await requireAdmin("/admin");
  const [overview, analytics] = await Promise.all([
    getAdminOverview(),
    getAdminAnalytics(30),
  ]);
  const { totals } = overview;

  const revenuePoints = overview.revenue.map((point) => ({
    label: formatShortDate(point.day),
    revenue: point.organizerRevenueXaf + point.platformRevenueXaf,
    orders: point.orders,
  }));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Platform"
        title="Operations overview"
        description="Approvals, money and platform health in one place. Every figure is calculated from live records."
        actions={
          <Link
            href="/admin/events/pending"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Review queue
            {totals.pendingOrganizers + totals.pendingEvents > 0 ? (
              <span className="rounded-full bg-card/20 px-1.5 text-[10px]">
                {totals.pendingOrganizers + totals.pendingEvents}
              </span>
            ) : null}
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={String(totals.users)}
          hint={`${totals.organizers} organizers`}
          icon={Users}
        />
        <StatCard
          label="Events"
          value={String(totals.events)}
          hint={`${totals.publishedEvents} published · ${totals.pendingEvents} in review`}
          icon={CalendarDays}
        />
        <StatCard
          label="Gross bookings"
          value={formatXAF(totals.grossRevenue)}
          hint={`${totals.confirmedBookings} confirmed orders`}
          icon={TrendingUp}
        />
        <StatCard
          label="Platform revenue"
          value={formatXAF(totals.platformRevenue)}
          hint="service fees, last 30 days"
          icon={CreditCard}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total attendees"
          value={String(analytics.totals.attendees)}
          hint="registered accounts"
          icon={Users}
        />
        <StatCard
          label="Successful payments"
          value={String(analytics.totals.succeededPayments)}
          hint="verified transactions"
          icon={CreditCard}
        />
        <StatCard
          label="Refund volume"
          value={formatXAF(analytics.totals.refundVolume)}
          hint="approved and processed"
          icon={Flag}
        />
        <StatCard
          label="Tickets issued"
          value={String(analytics.totals.tickets)}
          hint={`${analytics.totals.checkIns} checked in`}
          icon={Ticket}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/events/pending"
          className="group glass-subtle rounded-xl p-4 transition hover:border-brand-200"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-accent-300">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted group-hover:text-accent-300" />
          </div>
          <p className="mt-3 text-[20px] font-semibold text-ink">
            {totals.pendingOrganizers + totals.pendingEvents}
          </p>
          <p className="text-[11px] text-muted">
            {totals.pendingOrganizers} organizers · {totals.pendingEvents} events
            awaiting review
          </p>
        </Link>
        <Link
          href="/admin/refunds"
          className="group glass-subtle rounded-xl p-4 transition hover:border-brand-200"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning">
              <Flag className="h-4 w-4" />
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted group-hover:text-accent-300" />
          </div>
          <p className="mt-3 text-[20px] font-semibold text-ink">
            {totals.openRefunds}
          </p>
          <p className="text-[11px] text-muted">refund requests awaiting review</p>
        </Link>
        <Link
          href="/admin/payouts"
          className="group glass-subtle rounded-xl p-4 transition hover:border-brand-200"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-info/15 text-info">
              <Wallet className="h-4 w-4" />
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted group-hover:text-accent-300" />
          </div>
          <p className="mt-3 text-[20px] font-semibold text-ink">
            {totals.openPayouts}
          </p>
          <p className="text-[11px] text-muted">payout requests in progress</p>
        </Link>
        <Link
          href="/admin/messages"
          className="group glass-subtle rounded-xl p-4 transition hover:border-brand-200"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-accent-200">
              <Mail className="h-4 w-4" />
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted group-hover:text-accent-300" />
          </div>
          <p className="mt-3 text-[20px] font-semibold text-ink">{totals.messages}</p>
          <p className="text-[11px] text-muted">
            contact messages · {totals.subscribers} newsletter subscribers
          </p>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Platform revenue · last 30 days</CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              Ticket revenue plus service fees from confirmed bookings.
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-[11px] font-semibold text-accent-300 hover:underline"
          >
            Bookings
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          <RevenueAreaChart data={revenuePoints} />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Organizers awaiting review</CardTitle>
            <Link
              href="/admin/events/pending"
              className="text-[11px] font-semibold text-accent-300 hover:underline"
            >
              Review
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {overview.pendingOrganizersList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-[12px] text-muted">
                No organizer applications are waiting.
              </p>
            ) : (
              <div className="space-y-2">
                {overview.pendingOrganizersList.slice(0, 5).map((organizer) => (
                  <div
                    key={organizer.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-line px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink">
                        {organizer.name}
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] text-muted">
                        {organizer.ownerEmail ?? "No owner email"} ·{" "}
                        {organizer.city ?? "No city"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Applied {relativeTime(organizer.created_at)}
                      </p>
                    </div>
                    <StatusBadge kind="organizer" status={organizer.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Events awaiting review</CardTitle>
            <Link
              href="/admin/events/pending"
              className="text-[11px] font-semibold text-accent-300 hover:underline"
            >
              Review
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {overview.pendingEventsList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-[12px] text-muted">
                No events are waiting for approval.
              </p>
            ) : (
              <div className="space-y-2">
                {overview.pendingEventsList.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-line px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink">
                        {event.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] text-muted">
                        {event.organizerName} · {event.city}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Starts {formatDateTime(event.startAt)}
                      </p>
                    </div>
                    <StatusBadge kind="event" status="pending_approval" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Recent audit activity</CardTitle>
          <Link
            href="/admin/audit-logs"
            className="text-[11px] font-semibold text-accent-300 hover:underline"
          >
            Full log
          </Link>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {overview.recentAudit.length === 0 ? (
            <p className="px-5 pb-6 text-[12px] text-muted sm:px-6">
              No administrative activity recorded yet.
            </p>
          ) : (
            <TableContainer>
              <THead>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>Actor</TH>
                <TH>When</TH>
              </THead>
              <TBody>
                {overview.recentAudit.map((entry) => (
                  <TR key={entry.id}>
                    <TD>
                      <p className="font-medium text-ink">
                        {titleCase(entry.action.replace(/\./g, " "))}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted">
                        {entry.action}
                      </p>
                    </TD>
                    <TD>
                      <Badge tone="neutral">{entry.entity_type}</Badge>
                    </TD>
                    <TD className="text-[12px]">
                      {entry.actorName ?? "System"}
                    </TD>
                    <TD className="whitespace-nowrap text-[11px] text-muted">
                      {relativeTime(entry.created_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
