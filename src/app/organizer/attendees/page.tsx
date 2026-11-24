import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
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
import type { TicketStatus } from "@/types/database";
import { requireOrganizer } from "@/lib/auth";
import { listOrganizerAttendees } from "@/lib/data/organizer";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Attendees" };

export default async function OrganizerAttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await requireOrganizer("/organizer/attendees");
  const { q = "" } = await searchParams;
  const attendees = viewer.organizerId
    ? await listOrganizerAttendees(viewer.organizerId, 500)
    : [];

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? attendees.filter((attendee) =>
        [
          attendee.attendeeName,
          attendee.ticketReference,
          attendee.bookingReference,
          attendee.eventTitle,
          attendee.ticketTypeName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : attendees;

  const checkedIn = attendees.filter(
    (attendee) => attendee.status === "used",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Attendees"
        description="Every ticket holder for your events. Search by name, ticket or booking reference."
      />

      {attendees.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Ticket holders"
            value={String(attendees.length)}
            hint="latest 500 tickets"
            icon={Users}
          />
          <StatCard
            label="Checked in"
            value={String(checkedIn)}
            hint={
              attendees.length > 0
                ? `${Math.round((checkedIn / attendees.length) * 100)}% attendance`
                : "no tickets yet"
            }
            icon={CheckCircle2}
          />
          <StatCard
            label="Not yet arrived"
            value={String(attendees.length - checkedIn)}
            hint="valid tickets"
            icon={Users}
          />
        </div>
      ) : null}

      <form
        action="/organizer/attendees"
        method="get"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search attendees…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {q ? (
          <Link
            href="/organizer/attendees"
            className="inline-flex h-11 items-center justify-center rounded-full px-4 text-[12px] font-semibold text-muted hover:text-ink"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {attendees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No attendees yet"
          description="Attendees appear here once tickets are issued for your events."
          actionLabel="View events"
          actionHref="/organizer/events"
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-[12px] text-muted">
          No attendees match “{q}”.
        </div>
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Attendee</TH>
              <TH>Event</TH>
              <TH>Ticket</TH>
              <TH>Type</TH>
              <TH>Booking</TH>
              <TH>Status</TH>
              <TH>Checked in</TH>
            </THead>
            <TBody>
              {filtered.map((attendee) => (
                <TR key={attendee.ticketId}>
                  <TD>
                    <p className="font-medium text-ink">{attendee.attendeeName}</p>
                  </TD>
                  <TD>
                    <Link
                      href={`/organizer/events/${attendee.eventId}`}
                      className="block max-w-[200px] truncate text-[12px] text-ink hover:text-accent-200"
                    >
                      {attendee.eventTitle}
                    </Link>
                  </TD>
                  <TD>
                    <span className="font-mono text-[10.5px] text-muted">
                      {attendee.ticketReference}
                    </span>
                  </TD>
                  <TD className="text-[12px]">{attendee.ticketTypeName}</TD>
                  <TD>
                    <span className="font-mono text-[10.5px] text-muted">
                      {attendee.bookingReference}
                    </span>
                  </TD>
                  <TD>
                    <StatusBadge
                      kind="ticket"
                      status={attendee.status as TicketStatus}
                    />
                  </TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">
                    {attendee.checkedInAt
                      ? formatDateTime(attendee.checkedInAt)
                      : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableContainer>
        </div>
      )}
    </div>
  );
}
