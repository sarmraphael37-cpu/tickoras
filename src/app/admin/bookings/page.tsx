import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Search, Ticket, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
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
import type { BookingStatus } from "@/types/database";
import { requireAdmin } from "@/lib/auth";
import { listAdminBookings } from "@/lib/data/admin";
import { cn, formatDateTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Bookings" };

const FILTERS = [
  "all",
  "pending_payment",
  "confirmed",
  "expired",
  "cancelled",
  "refunded",
] as const;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin("/admin/bookings");
  const { status, q } = await searchParams;
  const active = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";
  const search = (q ?? "").trim().toLowerCase();

  const all = await listAdminBookings(500);
  const filtered = all.filter((booking) => {
    const matchesStatus = active === "all" || booking.status === active;
    const matchesSearch =
      !search ||
      booking.reference.toLowerCase().includes(search) ||
      booking.contactName.toLowerCase().includes(search) ||
      booking.contactEmail.toLowerCase().includes(search) ||
      booking.eventTitle.toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });

  const confirmed = all.filter((booking) => booking.status === "confirmed");
  const bookedValue = confirmed.reduce(
    (sum, booking) => sum + booking.totalXaf,
    0,
  );
  const ticketsIssued = confirmed.reduce(
    (sum, booking) => sum + booking.ticketCount,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Bookings"
        description="Every ticket order across the platform. Totals include the service fee charged to the buyer."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Orders"
          value={String(all.length)}
          hint={`${confirmed.length} confirmed`}
          icon={Ticket}
        />
        <StatCard
          label="Confirmed value"
          value={formatXAF(bookedValue)}
          hint="includes service fees"
          icon={TrendingUp}
        />
        <StatCard
          label="Tickets issued"
          value={String(ticketsIssued)}
          hint="confirmed orders only"
          icon={CreditCard}
        />
      </div>

      <form
        method="get"
        className="flex flex-wrap items-center gap-2 glass-subtle rounded-xl p-3"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search reference, buyer, email or event"
            className="h-9 pl-8 text-[12px]"
          />
        </div>
        {active !== "all" ? (
          <input type="hidden" name="status" value={active} />
        ) : null}
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-full bg-brand-600 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-700"
        >
          Search
        </button>
        {q ? (
          <Link
            href={
              active === "all"
                ? "/admin/bookings"
                : `/admin/bookings?status=${active}`
            }
            className="text-[11px] font-medium text-muted hover:text-ink"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter === "all"
              ? all.length
              : all.filter((booking) => booking.status === filter).length;
          const href = new URLSearchParams();
          if (filter !== "all") href.set("status", filter);
          if (q) href.set("q", q);
          return (
            <Link
              key={filter}
              href={
                href.toString()
                  ? `/admin/bookings?${href.toString()}`
                  : "/admin/bookings"
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition",
                active === filter
                  ? "border-brand-700 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
              )}
            >
              {filter.replace(/_/g, " ")}
              <span className="rounded-full bg-surface px-1.5 text-[9.5px]">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No bookings in this view"
          description={
            search
              ? "No order matches that search. Try a different reference or buyer."
              : "Bookings appear here as attendees reserve and pay for tickets."
          }
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Reference</TH>
              <TH>Event</TH>
              <TH>Buyer</TH>
              <TH>Tickets</TH>
              <TH>Total</TH>
              <TH>Created</TH>
              <TH>Status</TH>
            </THead>
            <TBody>
              {filtered.map((booking) => (
                <TR key={booking.id}>
                  <TD>
                    <span className="font-mono text-[10.5px] text-ink">
                      {booking.reference}
                    </span>
                  </TD>
                  <TD>
                    {booking.eventSlug ? (
                      <Link
                        href={`/events/${booking.eventSlug}`}
                        className="block max-w-[210px] truncate font-medium text-ink hover:text-accent-300 hover:underline"
                      >
                        {booking.eventTitle || "Event"}
                      </Link>
                    ) : (
                      <span className="max-w-[210px] truncate text-[12px]">
                        {booking.eventTitle || "Event"}
                      </span>
                    )}
                  </TD>
                  <TD>
                    <p className="max-w-[180px] truncate text-[12px]">
                      {booking.contactName || "—"}
                    </p>
                    <p className="mt-0.5 max-w-[180px] truncate text-[10.5px] text-muted">
                      {booking.contactEmail}
                    </p>
                  </TD>
                  <TD>{booking.ticketCount}</TD>
                  <TD className="whitespace-nowrap">
                    <p className="font-semibold">{formatXAF(booking.totalXaf)}</p>
                    {booking.serviceFeeXaf > 0 ? (
                      <p className="mt-0.5 text-[10px] text-muted">
                        fee {formatXAF(booking.serviceFeeXaf)}
                      </p>
                    ) : null}
                  </TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">
                    {formatDateTime(booking.createdAt)}
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
        </div>
      )}

      <p className="text-[10.5px] leading-4 text-muted">
        Showing the {all.length} most recent orders. Reservation totals are fixed
        server-side at checkout, so this view always matches what the buyer was charged.
      </p>
    </div>
  );
}
