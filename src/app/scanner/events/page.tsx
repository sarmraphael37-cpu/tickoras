import type { Metadata } from "next";
import { ArrowRight, CalendarDays, MapPin, ScanLine } from "lucide-react";
import { ScannerEventCard } from "@/components/scanner/event-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth";
import { listScannerEventCards } from "@/lib/data/scanner";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Assigned events" };
export const dynamic = "force-dynamic";

export default async function ScannerEventsPage() {
  const viewer = await requireRole(
    ["scanner", "organizer", "admin"],
    "/scanner/events",
  );
  const events = await listScannerEventCards(viewer);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Door operations"
        title="Assigned events"
        description="Every event you are authorized to check tickets for."
      />

      {events.length === 0 ? (
        <EmptyState
          icon={ScanLine}
          title="No events assigned"
          description="Your organizer has not assigned you to any events yet."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <ScannerEventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {events.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-ink">
              Schedule &amp; venues
            </h2>
          </div>
          <ul className="divide-y divide-line">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-ink">
                    {event.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                    <MapPin className="h-3 w-3 text-brand-400" />
                    {event.venueName}, {event.city}
                  </p>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-muted">
                  <CalendarDays className="h-3.5 w-3.5 text-brand-400" />
                  {formatDateTime(event.startsAt)}
                  <ArrowRight className="ml-1 h-3 w-3 text-faint" />
                  <a
                    href={`/scanner/scan?event=${event.id}`}
                    className="font-semibold text-accent-300 hover:underline"
                  >
                    Scan
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
