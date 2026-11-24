import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleAlert,
  Clock3,
  Plus,
  ScanLine,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RevenueAreaChart } from "@/components/dashboard/charts";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BookingStatus } from "@/types/database";
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
  getOrganizerFinancials,
  getOrganizerOverview,
  getOrganizerProfile,
} from "@/lib/data/organizer";
import { listNotifications } from "@/lib/data/notifications";
import {
  formatDateTime,
  formatShortDate,
  formatXAF,
  relativeTime,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Organizer overview" };

export default async function OrganizerOverviewPage() {
  const viewer = await requireOrganizer("/organizer");

  if (!viewer.organizerId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="Organizer workspace"
          description="Your organizer profile is not linked yet."
        />
        <Alert tone="warning" title="Organizer profile missing">
          Your account has the organizer role but no organizer profile is attached.
          Contact TICKORA support so we can connect your organization before you
          publish events.
        </Alert>
      </div>
    );
  }

  const [overview, analytics, profile, financials, notifications] =
    await Promise.all([
      getOrganizerOverview(viewer.organizerId),
      getOrganizerAnalytics(viewer.organizerId),
      getOrganizerProfile(viewer.organizerId),
      getOrganizerFinancials(viewer.organizerId),
      listNotifications(viewer.id, 5),
    ]);

  const { totals, events, bookings, balance } = overview;
  const now = Date.now();
  const nextEvent = [...events]
    .filter(
      (event) =>
        event.status === "published" &&
        new Date(event.startAt).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    )[0];

  const revenuePoints = analytics.daily.map((point) => ({
    label: formatShortDate(point.day),
    revenue: point.revenueXaf,
    orders: point.orders,
  }));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace"
        title={viewer.organizerName ?? "Your events"}
        description="Sales, attendance and payouts for everything you run on TICKORA."
        actions={
          <>
            <Link
              href="/organizer/events/create"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Create event
            </Link>
            <Link
              href="/scanner"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[12px] font-semibold text-ink transition hover:border-brand-300"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Scan tickets
            </Link>
          </>
        }
      />

      {viewer.organizerStatus === "pending" ? (
        <Alert tone="warning" title="Application under review">
          You can prepare drafts now. Event submission and publishing unlock once
          TICKORA approves your organizer profile.
        </Alert>
      ) : null}

      {viewer.organizerStatus === "rejected" ? (
        <Alert tone="danger" title="Organizer application rejected">
          {profile?.rejection_reason ??
            "Update your organizer profile with accurate details, then contact support to request another review."}
        </Alert>
      ) : null}

      {viewer.organizerStatus === "suspended" ? (
        <Alert tone="danger" title="Organizer access suspended">
          Your events cannot be sold while the account is suspended. Contact support
          for details.
        </Alert>
      ) : null}

      {nextEvent ? (
        <Link
          href={`/organizer/events/${nextEvent.id}`}
          className="group flex flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-card p-3 shadow-card transition hover:border-brand-200 sm:flex-row sm:items-center"
        >
          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl bg-brand-50 sm:aspect-[4/3] sm:w-36">
            {nextEvent.coverImageUrl ? (
              <Image
                src={nextEvent.coverImageUrl}
                alt=""
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-100 font-display text-2xl text-accent-300">
                {nextEvent.title.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 px-1 pb-2 sm:px-0 sm:py-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-300">
              Next event · {relativeTime(nextEvent.startAt)}
            </p>
            <h2 className="mt-1 truncate text-[16px] font-semibold text-ink">
              {nextEvent.title}
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              {formatDateTime(nextEvent.startAt)} · {nextEvent.venueName},{" "}
              {nextEvent.city}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">
                {nextEvent.ticketsSold} / {nextEvent.capacity || "∞"} sold
              </Badge>
              <Badge tone="neutral">{formatXAF(nextEvent.grossRevenue)} gross</Badge>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-1 pb-2 text-[11px] font-semibold text-accent-300 sm:px-4 sm:pb-0">
            Manage
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total events"
          value={String(totals.events)}
          hint={`${totals.upcoming} upcoming`}
          icon={CalendarDays}
        />
        <StatCard
          label="Published"
          value={String(totals.published)}
          hint="live on public site"
          icon={BarChart3}
        />
        <StatCard
          label="Awaiting approval"
          value={String(totals.awaitingApproval)}
          hint="in TICKORA review"
          icon={Clock3}
        />
        <StatCard
          label="Rejected / drafts"
          value={String(totals.drafts)}
          hint="editable drafts"
          icon={CircleAlert}
        />
        <StatCard
          label="Tickets sold"
          value={String(totals.ticketsSold)}
          hint={`${totals.checkedIn} checked in`}
          icon={Ticket}
        />
        <StatCard
          label="Total bookings"
          value={String(financials.confirmedBookings)}
          hint={`${financials.pendingBookings} awaiting payment`}
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Financial overview</CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              All-time figures from confirmed bookings and reviewed refunds.
            </p>
          </div>
          <Link
            href="/organizer/revenue"
            className="text-[11px] font-semibold text-accent-300 hover:underline"
          >
            Revenue details
          </Link>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Gross sales", formatXAF(financials.grossSales)],
            ["Platform fees", formatXAF(financials.platformFees)],
            ["Refunds", formatXAF(financials.refunds)],
            ["Net payable", formatXAF(financials.netPayable)],
            ["Available balance", formatXAF(balance)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-base p-4">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
                {label}
              </p>
              <p className="mt-2 text-[17px] font-semibold tracking-tight text-ink">
                {value}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Revenue · last 30 days</CardTitle>
              <p className="mt-1 text-[11px] text-muted">
                Confirmed sales only, excluding TICKORA service fees.
              </p>
            </div>
            <Link
              href="/organizer/analytics"
              className="text-[11px] font-semibold text-accent-300 hover:underline"
            >
              Analytics
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <RevenueAreaChart data={revenuePoints} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Pipeline
            </p>
            <ul className="mt-3 space-y-2.5 text-[12px]">
              <li className="flex items-center justify-between gap-2">
                <span className="text-muted">Drafts & rejected</span>
                <span className="font-semibold text-ink">{totals.drafts}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-muted">Awaiting approval</span>
                <span className="font-semibold text-ink">
                  {totals.awaitingApproval}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-muted">Published</span>
                <span className="font-semibold text-ink">{totals.published}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-muted">Check-in rate</span>
                <span className="font-semibold text-ink">
                  {totals.checkedInRate}%
                </span>
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              <Link
                href="/organizer/events"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
              >
                Manage events
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/organizer/payouts"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
              >
                Payouts
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <CircleAlert className="h-3.5 w-3.5 text-accent-300" />
              Good to know
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Event publishing requires TICKORA review. You cannot approve your own
              events, and published events lock editing to protect buyers.
            </p>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Upcoming events</CardTitle>
            <Link
              href="/organizer/events"
              className="text-[11px] font-semibold text-accent-300 hover:underline"
            >
              All events
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {events.filter(
              (event) =>
                event.status === "published" &&
                new Date(event.endAt).getTime() >= Date.now(),
            ).slice(0, 4).map((event) => (
              <Link
                key={event.id}
                href={`/organizer/events/${event.id}`}
                className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-ink">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    {formatShortDate(event.startAt)} · {event.city}
                  </p>
                </div>
                <Badge tone="brand">
                  {event.ticketsSold}/{event.capacity || "∞"}
                </Badge>
              </Link>
            ))}
            {events.filter(
              (event) =>
                event.status === "published" &&
                new Date(event.endAt).getTime() >= Date.now(),
            ).length === 0 ? (
              <p className="py-6 text-center text-[12px] text-muted">
                No upcoming published events.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Recent activity</CardTitle>
            <Link
              href="/organizer/notifications"
              className="text-[11px] font-semibold text-accent-300 hover:underline"
            >
              All activity
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-muted">
                No recent activity.
              </p>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="border-b border-line py-2.5 last:border-0">
                  <p className="text-[12px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[10.5px] text-muted">
                    {item.body}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Recent orders</CardTitle>
          <Link
            href="/organizer/bookings"
            className="text-[11px] font-semibold text-accent-300 hover:underline"
          >
            All bookings
          </Link>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {bookings.length === 0 ? (
            <div className="px-5 pb-6 sm:px-6">
              <EmptyState
                icon={Ticket}
                title="No bookings yet"
                description="Confirmed ticket orders from your published events will appear here."
                actionLabel={totals.published > 0 ? "View events" : "Create an event"}
                actionHref={
                  totals.published > 0 ? "/organizer/events" : "/organizer/events/create"
                }
                className="border-0 py-8"
              />
            </div>
          ) : (
            <TableContainer>
              <THead>
                <TH>Reference</TH>
                <TH>Event</TH>
                <TH>Attendee</TH>
                <TH>Placed</TH>
                <TH>Total</TH>
                <TH>Status</TH>
              </THead>
              <TBody>
                {bookings.map((booking) => (
                  <TR key={booking.id}>
                    <TD>
                      <span className="font-mono text-[11px] text-muted">
                        {booking.reference}
                      </span>
                    </TD>
                    <TD>
                      <p className="max-w-[200px] truncate font-medium text-ink">
                        {booking.eventTitle}
                      </p>
                    </TD>
                    <TD>
                      <p className="text-[12px] text-ink">{booking.contactName}</p>
                      <p className="mt-0.5 max-w-[180px] truncate text-[10.5px] text-muted">
                        {booking.contactEmail}
                      </p>
                    </TD>
                    <TD className="whitespace-nowrap text-[11.5px] text-muted">
                      {relativeTime(booking.createdAt)}
                    </TD>
                    <TD className="whitespace-nowrap font-semibold">
                      {formatXAF(booking.totalXaf)}
                    </TD>
                    <TD>
                      <StatusBadge
                        kind="booking"
                        status={booking.status as BookingStatus}
                      />
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
