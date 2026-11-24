import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Eye,
  Pencil,
  Plus,
  Search,
  Ticket,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireOrganizer } from "@/lib/auth";
import { listOrganizerEvents } from "@/lib/data/organizer";
import {
  cn,
  formatDate,
  formatShortDate,
  formatTime,
  formatXAF,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Events" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "pending_approval", label: "In review" },
  { key: "draft", label: "Drafts" },
  { key: "rejected", label: "Rejected" },
  { key: "past", label: "Past" },
] as const;

export default async function OrganizerEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; deleted?: string; q?: string }>;
}) {
  const viewer = await requireOrganizer("/organizer/events");
  const { status, deleted, q } = await searchParams;
  const active = FILTERS.some((filter) => filter.key === status) ? status : "all";
  const events = viewer.organizerId
    ? await listOrganizerEvents(viewer.organizerId)
    : [];

  const now = Date.now();
  const term = (q ?? "").trim().toLowerCase();
  const filtered = events.filter((event) => {
    if (
      term &&
      !`${event.title} ${event.city} ${event.venueName} ${event.categoryName ?? ""}`
        .toLowerCase()
        .includes(term)
    ) {
      return false;
    }
    if (active === "all") return true;
    if (active === "past") return new Date(event.endAt).getTime() < now;
    if (active === "published")
      return event.status === "published" && new Date(event.endAt).getTime() >= now;
    return event.status === active;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Events"
        description="Draft, submit and monitor every event you run on TICKORA."
        actions={
          <Link
            href="/organizer/events/create"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New event
          </Link>
        }
      />

      {viewer.organizerStatus === "pending" ? (
        <Alert tone="warning" title="Approval pending">
          You can save drafts now. Submission for review opens when your organizer
          application is approved.
        </Alert>
      ) : null}

      {deleted === "1" ? (
        <Alert tone="success" title="Draft deleted">
          The draft has been removed permanently.
        </Alert>
      ) : null}

      <form
        method="get"
        className="flex flex-wrap gap-3 glass-subtle rounded-xl p-4 shadow-card"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search events, venue or city"
            className="h-9 pl-9 text-[12px]"
          />
        </div>
        {active !== "all" ? (
          <input type="hidden" name="status" value={active} />
        ) : null}
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter.key === "all"
              ? events.length
              : filter.key === "past"
                ? events.filter((event) => new Date(event.endAt).getTime() < now).length
                : filter.key === "published"
                  ? events.filter(
                      (event) =>
                        event.status === "published" &&
                        new Date(event.endAt).getTime() >= now,
                    ).length
                  : events.filter((event) => event.status === filter.key).length;
          return (
            <Link
              key={filter.key}
              href={
                `/organizer/events${filter.key === "all" ? "" : `?status=${filter.key}`}${q ? `${filter.key === "all" ? "?" : "&"}q=${encodeURIComponent(q)}` : ""}`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                active === filter.key
                  ? "border-brand-700 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
              )}
            >
              {filter.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[9.5px]",
                  active === filter.key
                    ? "bg-card/20 text-white"
                    : "bg-surface text-muted",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Create your first event"
          description="Start with a draft, add ticket tiers and artwork, then submit it for TICKORA review."
          actionLabel="Create event"
          actionHref="/organizer/events/create"
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card px-5 py-10 text-center">
          <p className="text-[13px] font-semibold text-ink">No events in this view</p>
          <p className="mt-1 text-[11.5px] text-muted">
            Try a different filter or create a new event.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Event</TH>
              <TH>Date</TH>
              <TH>Status</TH>
              <TH>Sales</TH>
              <TH>Revenue</TH>
              <TH>Views</TH>
              <TH />
            </THead>
            <TBody>
              {filtered.map((event) => {
                const percent =
                  event.capacity > 0
                    ? Math.min(
                        100,
                        Math.round((event.ticketsSold / event.capacity) * 100),
                      )
                    : 0;
                return (
                  <TR key={event.id}>
                    <TD>
                      <Link
                        href={`/organizer/events/${event.id}`}
                        className="group flex items-center gap-3"
                      >
                        <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                          {event.coverImageUrl ? (
                            <Image
                              src={event.coverImageUrl}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center font-display text-lg text-accent-300">
                              {event.title.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-medium text-ink group-hover:text-accent-200">
                            {event.title}
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-muted">
                            {event.categoryName ?? "Uncategorised"} · {event.city}
                          </p>
                        </div>
                      </Link>
                    </TD>
                    <TD className="whitespace-nowrap">
                      <p className="text-[12px] text-ink">
                        {formatShortDate(event.startAt)}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted">
                        {formatTime(event.startAt)}
                      </p>
                    </TD>
                    <TD>
                      <StatusBadge kind="event" status={event.status} />
                      {event.rejectionReason ? (
                        <p className="mt-1 max-w-[160px] truncate text-[10px] text-danger">
                          {event.rejectionReason}
                        </p>
                      ) : null}
                    </TD>
                    <TD>
                      <p className="whitespace-nowrap text-[12px] text-ink">
                        {event.ticketsSold}
                        <span className="text-muted">
                          {" "}
                          / {event.capacity || "∞"}
                        </span>
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="h-1 w-14 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[9.5px] text-muted">{percent}%</span>
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap font-semibold">
                      {formatXAF(event.grossRevenue)}
                    </TD>
                    <TD className="text-[12px] text-muted">
                      {event.viewsCount}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link
                          href={`/organizer/events/${event.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                        <Link
                          href={`/organizer/events/${event.id}/tickets`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink"
                        >
                          <Ticket className="h-3 w-3" />
                          Tickets
                        </Link>
                        <Link
                          href={`/organizer/events/${event.id}/attendees`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink"
                        >
                          <Users className="h-3 w-3" />
                          Attendees
                        </Link>
                        <Link
                          href={`/organizer/bookings?event=${event.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink"
                        >
                          <CalendarDays className="h-3 w-3" />
                          Bookings
                        </Link>
                        <Link
                          href={`/organizer/events/${event.id}/analytics`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink"
                        >
                          <BarChart3 className="h-3 w-3" />
                          Analytics
                        </Link>
                        {["draft", "rejected"].includes(event.status) ? (
                          <Link
                            href={`/organizer/events/${event.id}/edit`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Link>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </TableContainer>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
        <Ticket className="h-3.5 w-3.5 text-accent-300" />
        Sales and revenue figures update from confirmed bookings. Last refreshed{" "}
        {formatDate(new Date())} {formatTime(new Date())}.
      </p>
    </div>
  );
}
