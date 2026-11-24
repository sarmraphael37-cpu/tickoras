import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ScanLine,
  Ticket,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { EventStatus } from "@/types/database";
import { requireRole } from "@/lib/auth";
import { getScannerEventDetail } from "@/lib/data/scanner";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Event" };
export const dynamic = "force-dynamic";

export default async function ScannerEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireRole(
    ["scanner", "organizer", "admin"],
    `/scanner/events/${id}`,
  );
  const detail = await getScannerEventDetail(viewer, id);
  if (!detail) notFound();
  const { event, stats, recent } = detail;

  return (
    <div className="space-y-6">
      <Link
        href="/scanner/events"
        className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All events
      </Link>

      <div className="relative aspect-[16/6] overflow-hidden rounded-2xl border border-line bg-brand-50">
        {event.coverImageUrl ? (
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="1200px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-5xl text-accent-300">
            {event.title.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/90 to-transparent p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="event" status={event.status as EventStatus} />
          </div>
          <h1 className="mt-2 font-display text-[24px] leading-tight text-white sm:text-[30px]">
            {event.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-white/80">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDateTime(event.startsAt)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.venueName}, {event.city}
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Expected"
          value={String(stats.expected)}
          hint="tickets issued"
          icon={Ticket}
        />
        <StatCard
          label="Checked in"
          value={String(stats.checkedIn)}
          hint="successful scans"
          icon={Users}
        />
        <StatCard
          label="Remaining"
          value={String(stats.remaining)}
          hint="still expected"
          icon={ScanLine}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/scanner/scan?event=${event.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-[13px] font-semibold text-white shadow-glow transition hover:bg-brand-500"
        >
          <ScanLine className="h-4 w-4" />
          Scan tickets for this event
        </Link>
        <Link
          href={`/scanner/history?event=${event.id}`}
          className="inline-flex items-center rounded-full border border-line bg-card px-5 py-3 text-[12.5px] font-semibold text-ink transition hover:border-brand-300"
        >
          View scan history
        </Link>
      </div>

      {event.description ? (
        <Card className="p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
            About this event
          </h2>
          <p className="mt-2 whitespace-pre-line text-[12.5px] leading-6 text-muted">
            {event.description}
          </p>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-ink">Recent check-ins</h2>
        <Card className="divide-y divide-line p-0">
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12px] text-muted">
              No check-ins recorded for this event yet.
            </p>
          ) : (
            recent.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-ink">
                    {entry.attendeeName}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
                    {entry.ticketReference}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge
                    tone={entry.method === "qr" ? "brand" : "neutral"}
                    className="text-[9px] uppercase"
                  >
                    {entry.method}
                  </Badge>
                  <p className="mt-1 text-[10px] text-muted">
                    {relativeTime(entry.scannedAt)} · {entry.scannedByName}
                  </p>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}
