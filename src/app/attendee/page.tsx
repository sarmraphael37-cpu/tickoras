import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Clock3,
  CreditCard,
  MapPin,
  QrCode,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { requireViewer } from "@/lib/auth";
import {
  getAttendeeOverview,
  listAttendeePayments,
} from "@/lib/data/attendee";
import { listNotifications } from "@/lib/data/notifications";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/domain";
import {
  formatDate,
  formatDateTime,
  formatShortDate,
  formatTime,
  formatXAF,
  relativeTime,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Your overview" };

export default async function AttendeeOverviewPage() {
  const viewer = await requireViewer("/attendee");
  const [overview, payments, notifications] = await Promise.all([
    getAttendeeOverview(viewer.id),
    listAttendeePayments(viewer.id),
    listNotifications(viewer.id, 4),
  ]);
  const { totals } = overview;
  const firstName = viewer.fullName.split(" ")[0] || "there";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your TICKORA"
        title={`Hello, ${firstName}.`}
        description="Your tickets, reservations and event plans in one place."
        actions={
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            Discover events
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {totals.unreadNotifications > 0 ? (
        <Link
          href="/attendee/notifications"
          className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[12px] font-medium text-accent-100 transition hover:bg-brand-100"
        >
          <span className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card text-[11px] font-bold text-accent-300">
              {totals.unreadNotifications}
            </span>
            unread notification{totals.unreadNotifications === 1 ? "" : "s"} waiting
          </span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}

      {overview.pendingBookings.length > 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/15 px-4 py-3">
          <p className="text-[12px] font-semibold text-warning">
            You have {overview.pendingBookings.length} reservation
            {overview.pendingBookings.length === 1 ? "" : "s"} awaiting payment.
          </p>
          <p className="mt-0.5 text-[11px] leading-5 text-warning">
            Seats are held for a short window. Complete payment before the timer
            runs out or the seats are released.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {overview.pendingBookings.slice(0, 3).map((booking) => (
              <Link
                key={booking.id}
                href={`/attendee/checkout/${booking.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-warning ring-1 ring-warning/30 hover:bg-warning/20"
              >
                <Clock3 className="h-3 w-3" />
                {booking.event.title} · {formatXAF(booking.totalXaf)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upcoming events"
          value={String(totals.upcomingEvents)}
          hint="events on your calendar"
          icon={CalendarDays}
        />
        <StatCard
          label="Valid tickets"
          value={String(totals.tickets)}
          hint="issued to your account"
          icon={QrCode}
        />
        <StatCard
          label="Confirmed bookings"
          value={String(totals.confirmedBookings)}
          hint="paid orders"
          icon={Ticket}
        />
        <StatCard
          label="Total spent"
          value={formatXAF(totals.spentXaf)}
          hint="confirmed bookings"
          icon={TrendingUp}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Next up
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              Your upcoming tickets, ready when you arrive.
            </p>
          </div>
          {overview.upcomingTickets.length > 0 ? (
            <Link
              href="/attendee/tickets"
              className="text-[11px] font-semibold text-accent-300 hover:underline"
            >
              All tickets
            </Link>
          ) : null}
        </div>

        {overview.upcomingTickets.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming events yet"
            description="When you book a ticket, it appears here with your QR code and event details."
            actionLabel="Find something to do"
            actionHref="/events"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {overview.upcomingTickets.slice(0, 2).map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative aspect-[16/9] w-full bg-brand-50 sm:aspect-auto sm:w-[38%]">
                    {ticket.coverImageUrl ? (
                      <Image
                        src={ticket.coverImageUrl}
                        alt={ticket.eventTitle}
                        fill
                        sizes="(max-width: 640px) 100vw, 200px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-cream font-display text-3xl text-accent-200">
                        {ticket.eventTitle.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="brand">{ticket.ticketTypeName}</Badge>
                      <StatusBadge kind="ticket" status={ticket.status} />
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink">
                      {ticket.eventTitle}
                    </h3>
                    <div className="mt-2 space-y-1 text-[11.5px] text-muted">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-accent-300" />
                        {formatShortDate(ticket.eventStartAt)} ·{" "}
                        {formatTime(ticket.eventStartAt)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-accent-300" />
                        <span className="truncate">
                          {ticket.venueName}, {ticket.city}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                      <span className="text-[10.5px] text-muted">
                        {relativeTime(ticket.eventStartAt)}
                      </span>
                      <Link
                        href={`/attendee/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-300 hover:underline"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        View ticket
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Recent bookings</CardTitle>
          <Link
            href="/attendee/bookings"
            className="text-[11px] font-semibold text-accent-300 hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {overview.recentBookings.length === 0 ? (
            <div className="px-5 pb-6 sm:px-6">
              <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-[12px] text-muted">
                No bookings yet. Your first order will appear here.
              </p>
            </div>
          ) : (
            <TableContainer>
              <THead>
                <TH>Event</TH>
                <TH>Reference</TH>
                <TH>Booked</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH />
              </THead>
              <TBody>
                {overview.recentBookings.map((booking) => (
                  <TR key={booking.id}>
                    <TD>
                      <p className="max-w-[260px] truncate font-medium text-ink">
                        {booking.event.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {formatDate(booking.event.startAt)}
                      </p>
                    </TD>
                    <TD>
                      <span className="font-mono text-[11px] text-muted">
                        {booking.reference}
                      </span>
                    </TD>
                    <TD className="text-[12px] text-muted">
                      {relativeTime(booking.createdAt)}
                    </TD>
                    <TD className="whitespace-nowrap font-semibold">
                      {formatXAF(booking.totalXaf)}
                    </TD>
                    <TD>
                      <StatusBadge kind="booking" status={booking.status} />
                    </TD>
                    <TD>
                      <Link
                        href={
                          booking.status === "pending_payment"
                            ? `/attendee/checkout/${booking.id}`
                            : `/attendee/bookings/${booking.id}`
                        }
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-300 hover:underline"
                      >
                        {booking.status === "pending_payment" ? "Pay" : "Details"}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-accent-300" />
              Recent transactions
            </CardTitle>
            <Link
              href="/attendee/payments"
              className="text-[11px] font-semibold text-accent-300 hover:underline"
            >
              All payments
            </Link>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {payments.length === 0 ? (
              <p className="px-5 pb-6 text-[12px] text-muted sm:px-6">
                No payment attempts yet.
              </p>
            ) : (
              <TableContainer>
                <THead>
                  <TH>Method</TH>
                  <TH>Date</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                </THead>
                <TBody>
                  {payments.slice(0, 4).map((payment) => (
                    <TR key={payment.id}>
                      <TD className="text-[12px]">
                        {PAYMENT_PROVIDER_LABELS[payment.provider]}
                        {payment.isDemo ? (
                          <Badge
                            tone="outline"
                            className="ml-1.5 font-mono text-[8.5px]"
                          >
                            DEMO
                          </Badge>
                        ) : null}
                      </TD>
                      <TD className="whitespace-nowrap text-[11px] text-muted">
                        {formatDateTime(payment.createdAt)}
                      </TD>
                      <TD className="whitespace-nowrap font-semibold">
                        {formatXAF(payment.amountXaf)}
                      </TD>
                      <TD>
                        <StatusBadge
                          kind="payment"
                          status={payment.status}
                          demo={payment.isDemo}
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-accent-300" />
              Recent notifications
            </CardTitle>
            <Link
              href="/attendee/notifications"
              className="text-[11px] font-semibold text-accent-300 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {notifications.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-[12px] text-muted">
                No notifications yet. Booking and ticket updates will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((notification) => (
                  <li key={notification.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-ink">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-muted">
                          {notification.body}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted">
                        {relativeTime(notification.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/attendee/payments"
          className="group flex items-center justify-between gap-3 glass-subtle rounded-xl p-4 transition hover:border-brand-200"
        >
          <span className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-accent-300">
              <CreditCard className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[12.5px] font-semibold text-ink">
                Payment history
              </span>
              <span className="mt-0.5 block text-[11px] text-muted">
                Receipts and provider references
              </span>
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:text-accent-300" />
        </Link>
        <Link
          href="/attendee/profile"
          className="group flex items-center justify-between gap-3 glass-subtle rounded-xl p-4 transition hover:border-brand-200"
        >
          <span className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-accent-300">
              <Ticket className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[12.5px] font-semibold text-ink">
                Account details
              </span>
              <span className="mt-0.5 block text-[11px] text-muted">
                Keep your contact info current
              </span>
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:text-accent-300" />
        </Link>
      </div>
    </div>
  );
}
