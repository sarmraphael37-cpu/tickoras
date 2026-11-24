import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Ticket as TicketIcon,
  User,
} from "lucide-react";
import { TicketActions } from "@/components/attendee/ticket-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireViewer } from "@/lib/auth";
import { getAttendeeTicket } from "@/lib/data/attendee";
import {
  formatDate,
  formatDateTime,
  formatTime,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Your ticket" };

export default async function AttendeeTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireViewer(`/attendee/tickets/${id}`);
  const ticket = await getAttendeeTicket(id, viewer.id);
  if (!ticket) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/attendee/tickets"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to tickets
        </Link>
        <TicketActions
          reference={ticket.reference}
          svg={ticket.qrSvg}
          eventTitle={ticket.eventTitle}
          attendeeName={ticket.attendeeName}
          ticketType={ticket.ticketTypeName}
          date={`${formatDate(ticket.eventStartAt)} · ${formatTime(ticket.eventStartAt)}`}
          venue={`${ticket.venueName}, ${ticket.city}`}
          bookingReference={ticket.bookingReference}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="relative aspect-[16/7] w-full bg-brand-50">
            {ticket.coverImageUrl ? (
              <Image
                src={ticket.coverImageUrl}
                alt={ticket.eventTitle}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 760px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-cream font-display text-4xl text-accent-200">
                {ticket.eventTitle}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-forest/60 via-forest/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="dark" className="bg-card/90 text-ice">
                  {ticket.ticketTypeName}
                </Badge>
                <StatusBadge kind="ticket" status={ticket.status} />
              </div>
              <h1 className="mt-2 font-display text-[26px] leading-tight text-white sm:text-[32px]">
                {ticket.eventTitle}
              </h1>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Date
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-ink">
                    {formatDate(ticket.eventStartAt)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {formatTime(ticket.eventStartAt)} – {formatTime(ticket.eventEndAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Venue
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-ink">
                    {ticket.venueName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {ticket.city}, Cameroon
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Ticket holder
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-ink">
                    {ticket.attendeeName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {viewer.email}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                  <TicketIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Booking
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-ink">
                    {ticket.bookingReference}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">
                    Ticket {ticket.reference}
                  </p>
                </div>
              </div>
            </div>

            {ticket.checkedInAt ? (
              <Alert
                tone="info"
                title="Checked in"
                className="mt-5"
              >
                This ticket was scanned on {formatDateTime(ticket.checkedInAt)}.
              </Alert>
            ) : ticket.status === "valid" ? (
              <Alert tone="success" title="Ready for entry" className="mt-5">
                Show this QR code at the entrance. Each ticket can be scanned once.
              </Alert>
            ) : (
              <Alert tone="warning" title="This ticket is no longer valid" className="mt-5">
                Contact support or the organizer if you believe this is a mistake.
              </Alert>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Link
                href={`/events/${ticket.eventSlug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[11.5px] font-semibold text-ink transition hover:border-brand-300"
              >
                Event page
              </Link>
              <Link
                href={`/attendee/bookings`}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-accent-300 hover:underline"
              >
                View booking history
              </Link>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card id="ticket-qr" className="p-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Entry code
            </p>
            <div
              className="mx-auto mt-4 w-full max-w-[260px] glass-subtle rounded-xl p-3 [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: ticket.qrSvg }}
              aria-label={`QR code for ticket ${ticket.reference}`}
            />
            <p className="mt-3 font-mono text-[11px] font-semibold tracking-wide text-ink">
              {ticket.reference}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold text-accent-200">
              <ShieldCheck className="h-3 w-3" />
              Verified by TICKORA
            </div>
          </Card>

          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
              <Clock className="h-3.5 w-3.5 text-accent-300" />
              Before you arrive
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-muted">
              <li>• Arrive early; doors may close once the venue is full.</li>
              <li>• Screenshots of the QR code are accepted.</li>
              <li>• Do not share your code — it admits one person once.</li>
              <li>• Bring a valid ID matching the ticket holder.</li>
            </ul>
          </div>

          <div className="flex items-start gap-2 glass-subtle rounded-xl p-4 text-[10.5px] leading-4 text-muted">
            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-accent-300" />
            <p>
              This code is issued server-side and linked to your account. It is never
              shared with other attendees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
