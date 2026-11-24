import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  BookingStatus,
  EventStatus,
  OrganizerStatus,
} from "@/types/database";
import { requireAdmin } from "@/lib/auth";
import { adminGlobalSearch } from "@/lib/data/admin";
import { formatXAF, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin("/admin/search");
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query.length >= 2 ? await adminGlobalSearch(query) : null;
  const total = results
    ? results.users.length +
      results.organizers.length +
      results.events.length +
      results.bookings.length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform control"
        title="Global search"
        description="Search across user accounts, organizer applications, events and bookings."
      />

      <form method="get" className="flex items-center gap-2">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Name, email, event title, venue, booking reference…"
          className="h-10 w-full max-w-xl rounded-full border border-line bg-card px-4 text-[12.5px] text-ink placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-full bg-brand-600 px-5 text-[12px] font-semibold text-white transition hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      {query && query.length < 2 ? (
        <EmptyState
          icon={SearchX}
          title="Type at least 2 characters"
          description="Shorter queries return too many partial matches to be useful."
        />
      ) : null}

      {results && total === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`No results for “${query}”`}
          description="Try a different name, email, event title, city or booking reference."
        />
      ) : null}

      {results && total > 0 ? (
        <div className="space-y-6">
          {results.users.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
                Users ({results.users.length})
              </h2>
              <Card className="divide-y divide-line p-0">
                {results.users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users?q=${encodeURIComponent(user.email)}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink">
                        {user.fullName || "Unnamed account"}
                        {user.isSuspended ? (
                          <Badge tone="danger" className="ml-2 text-[9px]">
                            Suspended
                          </Badge>
                        ) : null}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {user.email}
                        {user.phone ? ` · ${user.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.roles.map((role) => (
                        <Badge key={role} tone="neutral" className="capitalize">
                          {role}
                        </Badge>
                      ))}
                      <span className="text-[10.5px] text-muted">
                        Joined {relativeTime(user.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          {results.organizers.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
                Organizers ({results.organizers.length})
              </h2>
              <Card className="divide-y divide-line p-0">
                {results.organizers.map((organizer) => (
                  <Link
                    key={organizer.id}
                    href={`/admin/organizers/${organizer.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink">
                        {organizer.name}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {organizer.ownerName ?? "No owner"}
                        {organizer.city ? ` · ${organizer.city}` : ""} ·{" "}
                        {organizer.eventCount} events
                      </p>
                    </div>
                    <StatusBadge
                      kind="organizer"
                      status={organizer.status as OrganizerStatus}
                    />
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          {results.events.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
                Events ({results.events.length})
              </h2>
              <Card className="divide-y divide-line p-0">
                {results.events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink">
                        {event.title}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {event.organizerName} · {event.city} ·{" "}
                        {event.venueName} · {event.ticketsSold} sold ·{" "}
                        {formatXAF(event.grossRevenue)}
                      </p>
                    </div>
                    <StatusBadge
                      kind="event"
                      status={event.status as EventStatus}
                    />
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          {results.bookings.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
                Bookings ({results.bookings.length})
              </h2>
              <Card className="divide-y divide-line p-0">
                {results.bookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11.5px] font-semibold text-ink">
                        {booking.reference}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {booking.contactName} · {booking.eventTitle || "Event"} ·{" "}
                        {booking.ticketCount} ticket
                        {booking.ticketCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-semibold text-ink">
                        {formatXAF(booking.totalXaf)}
                      </span>
                      <StatusBadge
                        kind="booking"
                        status={booking.status as BookingStatus}
                      />
                    </div>
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
