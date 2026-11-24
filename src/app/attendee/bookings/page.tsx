import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Receipt,
  Search,
  Ticket,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import type { BookingStatus } from "@/types/database";
import { requireViewer } from "@/lib/auth";
import { listAttendeeBookings } from "@/lib/data/attendee";
import {
  cn,
  countdown,
  formatDate,
  formatShortDate,
  formatXAF,
  relativeTime,
} from "@/lib/utils";

export const metadata: Metadata = { title: "My bookings" };

const STATUSES = [
  "all",
  "pending_payment",
  "confirmed",
  "expired",
  "cancelled",
  "refunded",
] as const;

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Highest amount" },
  { value: "amount_asc", label: "Lowest amount" },
] as const;

const PAGE_SIZE = 8;

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AttendeeBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requireViewer("/attendee/bookings");
  const params = await searchParams;
  const all = await listAttendeeBookings(viewer.id);

  const q = (first(params.q) ?? "").trim().toLowerCase();
  const status = STATUSES.includes(first(params.status) as (typeof STATUSES)[number])
    ? (first(params.status) as (typeof STATUSES)[number])
    : "all";
  const sort = SORTS.some((item) => item.value === first(params.sort))
    ? first(params.sort)!
    : "newest";
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);

  const filtered = all.filter((booking) => {
    const matchesStatus = status === "all" || booking.status === status;
    const matchesQuery =
      !q ||
      booking.reference.toLowerCase().includes(q) ||
      booking.event.title.toLowerCase().includes(q) ||
      booking.event.city.toLowerCase().includes(q) ||
      booking.event.venueName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "oldest") return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (sort === "amount_desc") return b.totalXaf - a.totalXaf;
    if (sort === "amount_asc") return a.totalXaf - b.totalXaf;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const bookings = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const confirmed = all.filter((booking) => booking.status === "confirmed");
  const pending = all.filter((booking) => booking.status === "pending_payment");
  const totalTickets = confirmed.reduce(
    (sum, booking) => sum + booking.ticketCount,
    0,
  );

  const buildHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status !== "all") query.set("status", status);
    if (sort !== "newest") query.set("sort", sort);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/attendee/bookings?${qs}` : "/attendee/bookings";
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Orders"
        title="My Bookings"
        description="Every reservation you have started, paid for or released. Open a booking for its full receipt."
        actions={
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            Book another event
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {all.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Confirmed"
            value={String(confirmed.length)}
            hint="paid orders"
            icon={Receipt}
          />
          <StatCard
            label="Tickets issued"
            value={String(totalTickets)}
            hint="across confirmed orders"
            icon={Ticket}
          />
          <StatCard
            label="Awaiting payment"
            value={String(pending.length)}
            hint={pending.length > 0 ? "complete before expiry" : "nothing pending"}
            icon={Clock3}
          />
        </div>
      ) : null}

      {all.length > 0 ? (
        <form
          method="get"
          className="grid gap-3 rounded-2xl border border-line bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search reference, event or venue"
              className="h-10 pl-10 text-[12px]"
            />
          </div>
          <Select name="status" defaultValue={status} className="h-10 text-[12px]">
            <option value="all">All statuses</option>
            {STATUSES.filter((item) => item !== "all").map((item) => (
              <option key={item} value={item}>
                {item.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <Select name="sort" defaultValue={sort} className="h-10 text-[12px]">
            {SORTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full bg-brand-600 px-5 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            Apply
          </button>
        </form>
      ) : null}

      {all.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings yet"
          description="When you reserve seats, your order appears here with its status, reference and payment history."
          actionLabel="Browse events"
          actionHref="/events"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No bookings match those filters"
          description="Try a different search term or reset the status filter."
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Event</TH>
              <TH>Reference</TH>
              <TH>Booked</TH>
              <TH>Tickets</TH>
              <TH>Total</TH>
              <TH>Payment</TH>
              <TH>Status</TH>
              <TH />
            </THead>
            <TBody>
              {bookings.map((booking) => (
                <TR key={booking.id}>
                  <TD>
                    <p className="max-w-[240px] truncate font-medium text-ink">
                      {booking.event.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatShortDate(booking.event.startAt)} ·{" "}
                      {booking.event.venueName}, {booking.event.city}
                    </p>
                  </TD>
                  <TD>
                    <span className="font-mono text-[11px] text-muted">
                      {booking.reference}
                    </span>
                  </TD>
                  <TD>
                    <p className="text-[12px] text-muted">
                      {relativeTime(booking.createdAt)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {formatDate(booking.createdAt)}
                    </p>
                  </TD>
                  <TD className="text-[12px]">
                    {booking.ticketCount}
                    <span className="text-muted">
                      {booking.ticketCount === 1 ? " ticket" : " tickets"}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap font-semibold">
                    {formatXAF(booking.totalXaf)}
                  </TD>
                  <TD>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        booking.status === "confirmed"
                          ? "text-success"
                          : booking.status === "pending_payment"
                            ? "text-warning"
                            : "text-muted",
                      )}
                    >
                      {booking.status === "confirmed"
                        ? "Paid"
                        : booking.status === "pending_payment"
                          ? "Awaiting payment"
                          : booking.status === "refunded"
                            ? "Refunded"
                            : "Not charged"}
                    </span>
                  </TD>
                  <TD>
                    <StatusBadge kind="booking" status={booking.status as BookingStatus} />
                    {booking.status === "pending_payment" &&
                    booking.reservationExpiresAt ? (
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-warning">
                        <Clock3 className="h-3 w-3" />
                        {countdown(booking.reservationExpiresAt)} left
                      </p>
                    ) : null}
                  </TD>
                  <TD>
                    <Link
                      href={
                        booking.status === "pending_payment"
                          ? `/attendee/checkout/${booking.id}`
                          : `/attendee/bookings/${booking.id}`
                      }
                      className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold text-accent-300 hover:underline"
                    >
                      {booking.status === "pending_payment" ? "Pay now" : "View"}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
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
