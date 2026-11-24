import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, QrCode, Search, Ticket } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireViewer } from "@/lib/auth";
import { listAttendeeTickets } from "@/lib/data/attendee";
import { formatDate, formatTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My tickets" };

export default async function AttendeeTicketsPage() {
  const viewer = await requireViewer("/attendee/tickets");
  const tickets = await listAttendeeTickets(viewer.id);
  const now = Date.now();

  const upcoming = tickets
    .filter(
      (ticket) =>
        ticket.status === "valid" &&
        new Date(ticket.eventEndAt).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.eventStartAt).getTime() - new Date(b.eventStartAt).getTime(),
    );
  const other = tickets
    .filter((ticket) => !upcoming.some((item) => item.id === ticket.id))
    .sort(
      (a, b) =>
        new Date(b.eventStartAt).getTime() - new Date(a.eventStartAt).getTime(),
    );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your wallet"
        title="My tickets"
        description="Every TICKORA ticket issued to your account. Open a ticket to show its QR code at the door."
        actions={
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[12px] font-semibold text-ink transition hover:border-brand-300"
          >
            <Search className="h-3.5 w-3.5" />
            Find events
          </Link>
        }
      />

      {tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets yet"
          description="Your digital tickets will live here after a booking is confirmed. Explore events to get started."
          actionLabel="Browse events"
          actionHref="/events"
        />
      ) : null}

      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">
              Upcoming ({upcoming.length})
            </h2>
            <Badge tone="success">Ready to scan</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {upcoming.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative aspect-[16/9] w-full bg-brand-50 sm:aspect-auto sm:w-[36%]">
                    {ticket.coverImageUrl ? (
                      <Image
                        src={ticket.coverImageUrl}
                        alt={ticket.eventTitle}
                        fill
                        sizes="(max-width: 640px) 100vw, 220px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-cream font-display text-3xl text-accent-200">
                        {ticket.eventTitle.charAt(0)}
                      </div>
                    )}
                    <div className="absolute left-3 top-3">
                      <StatusBadge kind="ticket" status={ticket.status} />
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="brand">{ticket.ticketTypeName}</Badge>
                      <span className="text-[10px] text-muted">
                        {relativeTime(ticket.eventStartAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
                      {ticket.eventTitle}
                    </h3>
                    <div className="mt-2 space-y-1 text-[11.5px] text-muted">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-accent-300" />
                        {formatDate(ticket.eventStartAt)} ·{" "}
                        {formatTime(ticket.eventStartAt)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-accent-300" />
                        <span className="truncate">
                          {ticket.venueName}, {ticket.city}
                        </span>
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                      <span className="font-mono text-[10.5px] text-muted">
                        {ticket.reference}
                      </span>
                      <Link
                        href={`/attendee/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-300 hover:underline"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Open QR
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {other.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Past & inactive ({other.length})
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {other.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/attendee/tickets/${ticket.id}`}
                className="group flex items-center gap-3 glass-subtle rounded-xl p-3.5 transition hover:border-brand-200"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                  {ticket.coverImageUrl ? (
                    <Image
                      src={ticket.coverImageUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-display text-xl text-accent-300">
                      {ticket.eventTitle.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-ink group-hover:text-accent-200">
                    {ticket.eventTitle}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {formatDate(ticket.eventStartAt)} · {ticket.ticketTypeName}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    {ticket.reference}
                  </p>
                </div>
                <StatusBadge kind="ticket" status={ticket.status} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
