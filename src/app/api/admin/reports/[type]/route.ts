import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import {
  getAdminAnalytics,
  listAdminBookings,
  listAdminEvents,
  listAdminOrganizers,
  listAdminPayments,
  listAdminRefunds,
  listAdminTickets,
  listAdminUsers,
} from "@/lib/data/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = [
  "financial",
  "bookings",
  "tickets",
  "users",
  "organizers",
  "refunds",
  "events",
] as const;

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const viewer = await getViewer();
  if (!viewer?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { type } = await params;
  if (!TYPES.includes(type as (typeof TYPES)[number])) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }
  const days = Number(request.nextUrl.searchParams.get("days") ?? 30);

  let rows: unknown[][] = [];
  if (type === "financial") {
    const analytics = await getAdminAnalytics(days);
    rows = [
      ["Metric", "Value"],
      ["Gross volume (XAF)", analytics.totals.grossVolume],
      ["Platform revenue (XAF)", analytics.totals.platformRevenue],
      ["Refund volume (XAF)", analytics.totals.refundVolume],
      ["Succeeded payments", analytics.totals.succeededPayments],
      ["Confirmed bookings", analytics.totals.confirmedBookings],
    ];
  } else if (type === "bookings") {
    const bookings = await listAdminBookings(1000);
    rows = [
      ["Reference", "Event", "Attendee", "Tickets", "Total XAF", "Status", "Created"],
      ...bookings.map((b) => [b.reference, b.eventTitle, b.contactName, b.ticketCount, b.totalXaf, b.status, b.createdAt]),
    ];
  } else if (type === "tickets") {
    const tickets = await listAdminTickets(2000);
    rows = [
      ["Reference", "Event", "Attendee", "Type", "Booking", "Status", "Checked in"],
      ...tickets.map((t) => [t.reference, t.eventTitle, t.attendeeName, t.ticketType, t.bookingReference, t.status, t.checkedInAt ?? ""]),
    ];
  } else if (type === "users") {
    const users = await listAdminUsers(2000);
    rows = [
      ["Name", "Email", "Phone", "Roles", "Suspended", "Created"],
      ...users.map((u) => [u.fullName, u.email, u.phone ?? "", u.roles.join("|"), u.isSuspended ? "yes" : "no", u.createdAt]),
    ];
  } else if (type === "organizers") {
    const organizers = await listAdminOrganizers();
    rows = [
      ["Organization", "Slug", "Owner", "Email", "City", "Events", "Status", "Created"],
      ...organizers.map((o) => [o.name, o.slug, o.ownerName ?? "", o.ownerEmail ?? "", o.city ?? "", o.eventCount, o.status, o.created_at]),
    ];
  } else if (type === "refunds") {
    const refunds = await listAdminRefunds();
    rows = [
      ["ID", "Booking", "Requester", "Amount XAF", "Status", "Reason", "Created"],
      ...refunds.map((r) => [r.id, r.bookingReference, r.requesterName, r.amountXaf, r.status, r.reason, r.createdAt]),
    ];
  } else {
    const events = await listAdminEvents();
    rows = [
      ["Title", "Slug", "Organizer", "City", "Status", "Tickets sold", "Gross revenue XAF", "Start"],
      ...events.map((e) => [e.title, e.slug, e.organizerName, e.city, e.status, e.ticketsSold, e.grossRevenue, e.startAt]),
    ];
  }

  return new NextResponse(toCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tickora-${type}-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
