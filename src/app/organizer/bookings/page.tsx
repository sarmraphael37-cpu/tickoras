import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  Receipt,
  Search,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/dashboard/page-header";
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
import type { BookingStatus } from "@/types/database";
import { requireOrganizer } from "@/lib/auth";
import { listOrganizerBookings } from "@/lib/data/organizer";
import { formatDateTime, formatShortDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Bookings" };

const PAGE_SIZE = 10;

export default async function OrganizerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    event?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const viewer = await requireOrganizer("/organizer/bookings");
  const params = await searchParams;
  const status = params.status ?? "";
  const eventId = params.event ?? "";
  const q = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "newest";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const all = viewer.organizerId
    ? await listOrganizerBookings(viewer.organizerId, 500)
    : [];

  const matched = all.filter((booking) => {
    if (status && booking.status !== status) return false;
    if (eventId && booking.eventId !== eventId) return false;
    if (
      q &&
      !`${booking.reference} ${booking.contactName} ${booking.contactEmail} ${booking.eventTitle}`
        .toLowerCase()
        .includes(q)
    ) {
      return false;
    }
    return true;
  });
  const sorted = [...matched].sort((a, b) => {
    if (sort === "amount_desc") return b.totalXaf - a.totalXaf;
    if (sort === "amount_asc") return a.totalXaf - b.totalXaf;
    if (sort === "oldest")
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const bookings = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const buildHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (eventId) query.set("event", eventId);
    if (q) query.set("q", q);
    if (sort !== "newest") query.set("sort", sort);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/organizer/bookings?${qs}` : "/organizer/bookings";
  };

  const confirmed = all.filter((booking) => booking.status === "confirmed");
  const pending = all.filter((booking) => booking.status === "pending_payment");
  const gross = confirmed.reduce((sum, booking) => sum + booking.subtotalXaf, 0);
  const fees = confirmed.reduce((sum, booking) => sum + booking.serviceFeeXaf, 0);

  const filters = [
    { key: "", label: "All", count: all.length },
    {
      key: "confirmed",
      label: "Confirmed",
      count: confirmed.length,
    },
    {
      key: "pending_payment",
      label: "Awaiting payment",
      count: pending.length,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: all.filter((booking) => booking.status === "cancelled").length,
    },
    {
      key: "expired",
      label: "Expired",
      count: all.filter((booking) => booking.status === "expired").length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Bookings"
        description="Every order placed on your events, with payment status and ticket counts."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Confirmed"
          value={String(confirmed.length)}
          hint="paid orders"
          icon={Receipt}
        />
        <StatCard
          label="Tickets issued"
          value={String(
            confirmed.reduce((sum, booking) => sum + booking.ticketCount, 0),
          )}
          hint="across confirmed orders"
          icon={Ticket}
        />
        <StatCard
          label="Ticket revenue"
          value={formatXAF(gross)}
          hint="before service fees"
          icon={TrendingUp}
        />
        <StatCard
          label="Service fees"
          value={formatXAF(fees)}
          hint="paid by attendees"
          icon={CalendarDays}
        />
      </div>

      <form
        method="get"
        className="grid gap-3 glass-subtle rounded-xl p-4 shadow-card sm:grid-cols-[1fr_180px_180px_auto]"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search reference, attendee or event"
            className="h-9 pl-9 text-[12px]"
          />
        </div>
        {eventId ? <input type="hidden" name="event" value={eventId} /> : null}
        <Select name="sort" defaultValue={sort} className="h-9 text-[12px]">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount_desc">Highest amount</option>
          <option value="amount_asc">Lowest amount</option>
        </Select>
        <Select name="status" defaultValue={status} className="h-9 text-[12px]">
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending_payment">Awaiting payment</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </Select>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-700"
        >
          Apply
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => (
          <Link
            key={filter.key || "all"}
            href={
              filter.key
                ? `/organizer/bookings?status=${filter.key}${eventId ? `&event=${eventId}` : ""}`
                : eventId
                  ? `/organizer/bookings?event=${eventId}`
                  : "/organizer/bookings"
            }
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
              (status ?? "") === filter.key
                ? "border-brand-700 bg-brand-600 text-white"
                : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink"
            }`}
          >
            {filter.label}
            <span className="rounded-full bg-surface px-1.5 text-[9.5px]">
              {filter.count}
            </span>
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No bookings yet"
          description="When attendees buy tickets to your published events, orders appear here in real time."
          actionLabel="View events"
          actionHref="/organizer/events"
        />
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-[12px] text-muted">
          No bookings match this status.
        </div>
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Reference</TH>
              <TH>Event</TH>
              <TH>Attendee</TH>
              <TH>Placed</TH>
              <TH>Tickets</TH>
              <TH>Total</TH>
              <TH>Fee</TH>
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
                    <Link
                      href={`/organizer/events/${booking.eventId}`}
                      className="block max-w-[200px] truncate font-medium text-ink hover:text-accent-200"
                    >
                      {booking.eventTitle}
                    </Link>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {formatShortDate(booking.eventStartAt)}
                    </p>
                  </TD>
                  <TD>
                    <p className="text-[12px] text-ink">{booking.contactName}</p>
                    <p className="mt-0.5 max-w-[170px] truncate text-[10.5px] text-muted">
                      {booking.contactEmail}
                    </p>
                  </TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">
                    {formatDateTime(booking.createdAt)}
                  </TD>
                  <TD>{booking.ticketCount}</TD>
                  <TD className="whitespace-nowrap font-semibold">
                    {formatXAF(booking.totalXaf)}
                  </TD>
                  <TD className="whitespace-nowrap text-[11.5px] text-muted">
                    {formatXAF(booking.serviceFeeXaf)}
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

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
