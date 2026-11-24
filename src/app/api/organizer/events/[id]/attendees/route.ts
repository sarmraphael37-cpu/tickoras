import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import {
  getOrganizerEvent,
  listOrganizerAttendees,
} from "@/lib/data/organizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer();
  if (!viewer || !viewer.roles.includes("organizer") || !viewer.organizerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const event = await getOrganizerEvent(viewer.organizerId, id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const attendees = (await listOrganizerAttendees(viewer.organizerId, 5000))
    .filter((row) => row.eventId === id);

  const header = [
    "Attendee",
    "Ticket reference",
    "Ticket category",
    "Booking reference",
    "Payment status",
    "Ticket status",
    "Checked in at",
  ];
  const lines = [
    header.map(escapeCsv).join(","),
    ...attendees.map((row) =>
      [
        row.attendeeName,
        row.ticketReference,
        row.ticketTypeName,
        row.bookingReference,
        row.bookingStatus,
        row.status,
        row.checkedInAt ?? "",
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tickora-attendees-${event.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
