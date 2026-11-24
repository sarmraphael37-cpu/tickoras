import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  ScanLine,
  Ticket,
  Users,
} from "lucide-react";
import { ScannerEventCard } from "@/components/scanner/event-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireRole } from "@/lib/auth";
import {
  listRecentCheckIns,
  listScannerEventCards,
} from "@/lib/data/scanner";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Scanner overview" };
export const dynamic = "force-dynamic";

export default async function ScannerOverviewPage() {
  const viewer = await requireRole(
    ["scanner", "organizer", "admin"],
    "/scanner",
  );
  const events = await listScannerEventCards(viewer);
  const recent = await listRecentCheckIns(
    events.map((event) => event.id),
    8,
  );

  const totals = events.reduce(
    (acc, event) => ({
      expected: acc.expected + event.expected,
      checkedIn: acc.checkedIn + event.checkedIn,
      remaining: acc.remaining + event.remaining,
    }),
    { expected: 0, checkedIn: 0, remaining: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
            Welcome back
          </p>
          <h1 className="mt-1 font-display text-[26px] leading-tight text-ink sm:text-[32px]">
            {viewer.fullName.split(" ")[0]}, here&apos;s your door
          </h1>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {events.length} assigned event{events.length === 1 ? "" : "s"} ·{" "}
            {totals.checkedIn} checked in so far
          </p>
        </div>
        <Link
          href="/scanner/scan"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[12.5px] font-semibold text-white shadow-glow transition hover:bg-brand-500"
        >
          <ScanLine className="h-4 w-4" />
          Open scanner
        </Link>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={ScanLine}
          title="No events assigned yet"
          description="Ask the organizer to add you as a scanner from their Staff & scanners page. You will see your events here once assigned."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Expected attendees"
              value={String(totals.expected)}
              hint="tickets issued across assigned events"
              icon={Ticket}
            />
            <StatCard
              label="Checked in"
              value={String(totals.checkedIn)}
              hint="successful door scans"
              icon={Users}
            />
            <StatCard
              label="Remaining"
              value={String(totals.remaining)}
              hint="still expected at the gate"
              icon={ScanLine}
            />
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-ink">
                Assigned events
              </h2>
              <Link
                href="/scanner/events"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-300 hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {events.slice(0, 3).map((event) => (
                <ScannerEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <ClipboardList className="h-4 w-4 text-accent-300" />
                Recent scan activity
              </h2>
              <Link
                href="/scanner/history"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-300 hover:underline"
              >
                Full history <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <Card className="divide-y divide-line p-0">
              {recent.length === 0 ? (
                <p className="px-5 py-8 text-center text-[12px] text-muted">
                  No tickets checked in yet on your assigned events.
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
                      <p className="mt-0.5 truncate text-[10.5px] text-muted">
                        {entry.eventTitle} · {entry.ticketTypeName}
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
                        {relativeTime(entry.scannedAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

