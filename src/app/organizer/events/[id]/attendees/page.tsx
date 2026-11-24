import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventTabs } from "@/components/organizer/event-tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireOrganizer } from "@/lib/auth";
import {
  getOrganizerEvent,
  listOrganizerAttendees,
} from "@/lib/data/organizer";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Event attendees" };

export default async function EventAttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const viewer = await requireOrganizer(`/organizer/events/${id}/attendees`);
  if (!viewer.organizerId) notFound();
  const detail = await getOrganizerEvent(viewer.organizerId, id);
  if (!detail) notFound();

  const allAttendees = await listOrganizerAttendees(viewer.organizerId, 1000);
  const eventAttendees = allAttendees.filter((row) => row.eventId === id);
  const q = (query.q ?? "").trim().toLowerCase();
  const status = query.status ?? "all";
  const attendees = eventAttendees.filter((row) => {
    const matchesQuery =
      !q ||
      row.attendeeName.toLowerCase().includes(q) ||
      row.ticketReference.toLowerCase().includes(q) ||
      row.bookingReference.toLowerCase().includes(q);
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Link
        href={`/organizer/events/${id}`}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to event
      </Link>
      <PageHeader
        eyebrow="Event workspace"
        title="Attendees"
        description={`Issued tickets and check-in status for ${detail.title}.`}
        actions={
          <a
            href={`/api/organizer/events/${id}/attendees.csv`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:border-brand-400"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        }
      />
      <EventTabs eventId={id} active="attendees" />

      <form method="get" className="grid gap-3 glass-subtle rounded-xl p-4 sm:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search name, ticket or booking reference"
            className="h-9 pl-9 text-[12px]"
          />
        </div>
        <Select name="status" defaultValue={status} className="h-9 text-[12px]">
          <option value="all">All ticket states</option>
          <option value="valid">Valid</option>
          <option value="used">Checked in</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </Select>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-700"
        >
          Filter
        </button>
      </form>

      {attendees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No attendees found"
          description="Issued tickets appear here after bookings are confirmed."
        />
      ) : (
        <div className="overflow-hidden glass-subtle rounded-xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Attendee</TH>
              <TH>Ticket reference</TH>
              <TH>Category</TH>
              <TH>Booking</TH>
              <TH>Payment</TH>
              <TH>Ticket status</TH>
              <TH>Checked in</TH>
            </THead>
            <TBody>
              {attendees.map((row) => (
                <TR key={row.ticketId}>
                  <TD className="font-medium text-ink">{row.attendeeName}</TD>
                  <TD>
                    <span className="font-mono text-[10.5px] text-muted">
                      {row.ticketReference}
                    </span>
                  </TD>
                  <TD className="text-[12px]">{row.ticketTypeName}</TD>
                  <TD>
                    <span className="font-mono text-[10.5px] text-muted">
                      {row.bookingReference}
                    </span>
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        row.bookingStatus === "confirmed"
                          ? "success"
                          : row.bookingStatus === "pending_payment"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {row.bookingStatus === "confirmed"
                        ? "Paid"
                        : row.bookingStatus === "pending_payment"
                          ? "Pending"
                          : "Not charged"}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        row.status === "valid"
                          ? "brand"
                          : row.status === "used"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">
                    {row.checkedInAt ? formatDateTime(row.checkedInAt) : "—"}
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
