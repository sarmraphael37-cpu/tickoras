import type { Metadata } from "next";
import Link from "next/link";
import { History, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import {
  listScanHistory,
  listScannerEvents,
  type ScanOutcome,
} from "@/lib/data/scanner";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Scan history" };
export const dynamic = "force-dynamic";

const FILTERS: Array<{ key: string; label: string; outcome?: ScanOutcome }> = [
  { key: "all", label: "All" },
  { key: "success", label: "Successful", outcome: "success" },
  { key: "duplicate", label: "Duplicates", outcome: "duplicate" },
  { key: "invalid", label: "Invalid", outcome: "invalid" },
];

const OUTCOME_TONE: Record<ScanOutcome, "success" | "danger" | "warning"> = {
  success: "success",
  duplicate: "warning",
  invalid: "danger",
};

export default async function ScannerHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string; event?: string }>;
}) {
  const viewer = await requireRole(["scanner", "organizer", "admin"], "/scanner/history");
  const { outcome, event } = await searchParams;
  const active = FILTERS.find((filter) => filter.key === outcome)?.key ?? "all";
  const activeFilter = FILTERS.find((filter) => filter.key === active)!;
  const events = await listScannerEvents(viewer);
  const eventId = events.some((item) => item.id === event) ? event! : undefined;

  const rows = await listScanHistory(viewer, {
    eventId,
    outcome: activeFilter.outcome,
    limit: 300,
  });

  const counts = {
    success: rows.filter((row) => row.outcome === "success").length,
    duplicate: rows.filter((row) => row.outcome === "duplicate").length,
    invalid: rows.filter((row) => row.outcome === "invalid").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Door operations"
        title="Scan history"
        description="Every scan attempt on your assigned events — successful, duplicate and invalid."
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const params = new URLSearchParams();
          if (filter.key !== "all") params.set("outcome", filter.key);
          if (eventId) params.set("event", eventId);
          const href = `/scanner/history${params.size ? `?${params}` : ""}`;
          return (
            <Link
              key={filter.key}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition",
                active === filter.key
                  ? "border-brand-700 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
              )}
            >
              {filter.label}
              {filter.key !== "all" ? (
                <span className="rounded-full bg-surface px-1.5 text-[9.5px]">
                  {counts[filter.key as ScanOutcome]}
                </span>
              ) : null}
            </Link>
          );
        })}
        <form method="get" className="ml-auto flex items-center gap-2">
          {active !== "all" ? <input type="hidden" name="outcome" value={active} /> : null}
          <select
            name="event"
            defaultValue={eventId ?? ""}
            className="h-9 rounded-full border border-line bg-card px-3 text-[11.5px] text-ink"
          >
            <option value="">All events</option>
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-full border border-line bg-card px-4 text-[11.5px] font-semibold text-ink transition hover:border-brand-300"
          >
            Filter
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="No scans in this view"
          description="Scan attempts appear here as tickets are checked at the door."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
          <TableContainer>
            <THead>
              <TH>Time</TH>
              <TH>Ticket</TH>
              <TH>Event</TH>
              <TH>Method</TH>
              <TH>Result</TH>
              <TH>Scanner</TH>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="whitespace-nowrap text-[11.5px] text-muted">
                    {formatDateTime(row.scannedAt)}
                  </TD>
                  <TD className="font-mono text-[10.5px]">
                    {row.ticketReference ?? "—"}
                  </TD>
                  <TD className="max-w-[180px] truncate text-[12px]">
                    {row.eventTitle}
                  </TD>
                  <TD>
                    <Badge
                      tone={row.method === "qr" ? "brand" : "neutral"}
                      className="text-[9px] uppercase"
                    >
                      {row.method}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={OUTCOME_TONE[row.outcome]} className="capitalize">
                      {row.outcome === "duplicate" ? "Already used" : row.outcome}
                    </Badge>
                    {row.code && row.outcome !== "success" ? (
                      <p className="mt-0.5 font-mono text-[9px] text-muted">
                        {row.code}
                      </p>
                    ) : null}
                  </TD>
                  <TD className="max-w-[140px] truncate text-[11.5px] text-muted">
                    {row.scannerName}
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableContainer>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[10.5px] leading-4 text-muted">
        <ScanLine className="h-3 w-3 text-brand-400" />
        History covers only events you are authorized to scan. Failed lookups of
        unknown ticket codes are recorded without attendee details.
      </p>
    </div>
  );
}
