import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
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
import { requireAdmin } from "@/lib/auth";
import { listAdminTickets } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Tickets" };

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin("/admin/tickets");
  const { q, status } = await searchParams;
  const all = await listAdminTickets(500);
  const term = (q ?? "").trim().toLowerCase();
  const visible = all.filter((ticket) => {
    if (status && ticket.status !== status) return false;
    return (
      !term ||
      `${ticket.reference} ${ticket.attendeeName} ${ticket.eventTitle} ${ticket.bookingReference}`
        .toLowerCase()
        .includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Tickets"
        description="Every issued ticket across the platform. Raw QR tokens are never exposed here."
      />

      <form method="get" className="grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Search reference, attendee or event" className="h-9 pl-9 text-[12px]" />
        </div>
        <Select name="status" defaultValue={status ?? ""} className="h-9 text-[12px]">
          <option value="">All ticket states</option>
          <option value="valid">Valid</option>
          <option value="used">Checked in</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </Select>
        <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-[12px] font-semibold text-white hover:bg-brand-700">Filter</button>
      </form>

      {visible.length === 0 ? (
        <EmptyState icon={QrCode} title="No tickets found" description="Issued tickets will appear here after payments are confirmed." />
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <TableContainer>
            <THead>
              <TH>Ticket reference</TH><TH>Event</TH><TH>Attendee</TH><TH>Type</TH><TH>Booking</TH><TH>Status</TH><TH>Checked in</TH>
            </THead>
            <TBody>
              {visible.map((ticket) => (
                <TR key={ticket.id}>
                  <TD className="font-mono text-[10.5px]">{ticket.reference}</TD>
                  <TD><Link href={`/admin/events/${ticket.eventId}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-ink hover:text-accent-200">{ticket.eventTitle}</Link></TD>
                  <TD className="text-[12px]">{ticket.attendeeName}</TD>
                  <TD className="text-[12px] text-muted">{ticket.ticketType}</TD>
                  <TD className="font-mono text-[10px] text-muted">{ticket.bookingReference}</TD>
                  <TD><Badge tone={ticket.status === "valid" ? "brand" : ticket.status === "used" ? "success" : "neutral"}>{ticket.status}</Badge></TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">{ticket.checkedInAt ? formatDateTime(ticket.checkedInAt) : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </TableContainer>
        </div>
      )}
    </div>
  );
}
