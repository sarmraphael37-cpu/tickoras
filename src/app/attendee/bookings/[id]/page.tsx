import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  QrCode,
  Receipt,
  RotateCcw,
  Ticket as TicketIcon,
} from "lucide-react";
import {
  CancelBookingForm,
  CheckPaymentStatusForm,
  RefundRequestForm,
} from "@/components/attendee/booking-actions";
import { ReservationTimer } from "@/components/attendee/reservation-timer";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireViewer } from "@/lib/auth";
import { getAttendeeBooking } from "@/lib/data/attendee";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/domain";
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatXAF,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Booking details" };

export default async function AttendeeBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/attendee/bookings/${id}`);
  const detail = await getAttendeeBooking(id, viewer.id);
  if (!detail) notFound();

  const { booking, items, payments, refunds, tickets } = detail;
  const openRefund = refunds.find((refund) =>
    ["requested", "approved", "processed"].includes(refund.status),
  );
  const canRequestRefund =
    booking.status === "confirmed" &&
    !openRefund &&
    tickets.some((ticket) => ticket.status !== "refunded");
  const pending = booking.status === "pending_payment";
  const pendingLivePayment = payments.find(
    (payment) =>
      !payment.isDemo &&
      ["pending", "initiated", "requires_action"].includes(payment.status),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/attendee/bookings"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All bookings
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline" className="font-mono">
            {booking.reference}
          </Badge>
          <StatusBadge kind="booking" status={booking.status} />
        </div>
      </div>

      {query.paid === "1" ? (
        <Alert tone="success" title="Payment confirmed">
          Your tickets are issued. Find every QR code under{" "}
          <Link href="/attendee/tickets" className="font-semibold underline">
            My tickets
          </Link>
          .
        </Alert>
      ) : null}

      {pending ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/15 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[12.5px] font-semibold text-warning">
              This reservation still needs payment.
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-warning">
              Tickets are only issued after a verified payment. Unpaid seats are
              released automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {booking.reservationExpiresAt ? (
              <ReservationTimer expiresAt={booking.reservationExpiresAt} />
            ) : null}
            {pendingLivePayment ? (
              <CheckPaymentStatusForm bookingId={booking.id} />
            ) : null}
            <Link
              href={`/attendee/checkout/${booking.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-brand-700"
            >
              Complete payment
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}

      {pendingLivePayment ? (
        <Alert tone="info" title="Waiting for your approval">
          A payment request was sent to your phone. Approve the prompt, then use
          &quot;I&apos;ve paid — check status&quot; above. Tickets are issued only
          after the provider confirms the money.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <div className="relative aspect-[16/9] w-full bg-brand-50 sm:aspect-auto sm:w-[38%]">
                {booking.event.coverImageUrl ? (
                  <Image
                    src={booking.event.coverImageUrl}
                    alt={booking.event.title}
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, 300px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-cream font-display text-4xl text-accent-200">
                    {booking.event.title.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 p-5">
                <Link
                  href={`/events/${booking.event.slug}`}
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-300 hover:underline"
                >
                  View event
                </Link>
                <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  {booking.event.title}
                </h1>
                <div className="mt-3 space-y-1.5 text-[12px] text-muted">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-accent-300" />
                    {formatDate(booking.event.startAt)} ·{" "}
                    {formatTime(booking.event.startAt)}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-accent-300" />
                    {booking.event.venueName}, {booking.event.city}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-accent-300" />
                    Booked {formatDateTime(booking.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-accent-300" />
                Order summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="divide-y divide-line rounded-xl border border-line">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-[12.5px] font-medium text-ink">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted">
                        {item.quantity} × {formatXAF(item.unitPriceXaf)}
                      </p>
                    </div>
                    <p className="text-[12.5px] font-semibold text-ink">
                      {formatXAF(item.lineTotalXaf)}
                    </p>
                  </div>
                ))}
              </div>
              <dl className="mt-4 space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-medium text-ink">
                    {formatXAF(booking.subtotalXaf)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Service fee</dt>
                  <dd className="font-medium text-ink">
                    {formatXAF(booking.serviceFeeXaf)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2.5">
                  <dt className="text-[13px] font-semibold text-ink">Total</dt>
                  <dd className="text-[15px] font-semibold text-ink">
                    {formatXAF(booking.totalXaf)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[10.5px] leading-4 text-muted">
                All amounts are in Central African CFA francs (XAF). The service fee
                supports secure ticketing and platform operations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TicketIcon className="h-4 w-4 text-accent-300" />
                Tickets ({tickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {tickets.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-[12px] text-muted">
                  Tickets are issued after payment is verified.
                </p>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink">
                          {ticket.attendeeName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {ticket.ticketTypeName} ·{" "}
                          <span className="font-mono">{ticket.reference}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge kind="ticket" status={ticket.status} />
                        {ticket.status === "valid" || ticket.status === "used" ? (
                          <Link
                            href={`/attendee/tickets/${ticket.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            QR
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent-300" />
                Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {payments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-[12px] text-muted">
                  No payment attempt yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3"
                    >
                      <div>
                        <p className="text-[12px] font-semibold text-ink">
                          {PAYMENT_PROVIDER_LABELS[payment.provider]}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-muted">
                          {formatDateTime(payment.createdAt)}
                          {payment.providerReference
                            ? ` · ${payment.providerReference}`
                            : ""}
                        </p>
                        {payment.failureReason ? (
                          <p className="mt-0.5 text-[10.5px] text-danger">
                            {payment.failureReason}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-ink">
                          {formatXAF(payment.amountXaf)}
                        </span>
                        <StatusBadge
                          kind="payment"
                          status={payment.status}
                          demo={payment.isDemo}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Contact details
            </p>
            <div className="mt-3 space-y-2 text-[12px]">
              <p className="font-medium text-ink">{booking.contactName}</p>
              <p className="break-all text-muted">{booking.contactEmail}</p>
              {booking.contactPhone ? (
                <p className="text-muted">{booking.contactPhone}</p>
              ) : null}
            </div>
            <p className="mt-3 text-[10.5px] leading-4 text-muted">
              Tickets and updates are sent to this email. Keep it current in your
              profile.
            </p>
          </Card>

          {pending ? (
            <Card className="p-5">
              <p className="text-[12px] font-semibold text-ink">Not ready to pay?</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                Release this reservation now and make the seats available to others.
              </p>
              <div className="mt-3">
                <CancelBookingForm bookingId={booking.id} />
              </div>
            </Card>
          ) : null}

          {canRequestRefund ? (
            <Card className="p-5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                <RotateCcw className="h-3.5 w-3.5 text-accent-300" />
                Request a refund
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                Refunds are reviewed by the organizer and TICKORA support. Approved
                refunds are processed by the original payment provider.
              </p>
              <div className="mt-3">
                <RefundRequestForm bookingId={booking.id} />
              </div>
            </Card>
          ) : null}

          {refunds.length > 0 ? (
            <Card className="p-5">
              <p className="text-[12px] font-semibold text-ink">Refund requests</p>
              <div className="mt-3 space-y-2">
                {refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="rounded-lg border border-line p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-semibold text-ink">
                        {formatXAF(refund.amountXaf)}
                      </span>
                      <StatusBadge kind="refund" status={refund.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-muted">
                      {refund.reason}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      {formatDateTime(refund.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {booking.status === "confirmed" ? (
            <div className="flex items-start gap-2 glass-subtle rounded-xl p-4 text-[10.5px] leading-4 text-muted">
              <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-accent-300" />
              <p>
                Payment confirmed. This booking cannot be duplicated — refreshing
                this page will not create new tickets.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
