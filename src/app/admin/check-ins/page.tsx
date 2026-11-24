import type { Metadata } from "next";
import { CheckCircle2, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { listAdminCheckIns, listAdminTickets } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Check-ins" };

export default async function AdminCheckInsPage() {
  await requireAdmin("/admin/check-ins");
  const [checkIns, tickets] = await Promise.all([
    listAdminCheckIns(500),
    listAdminTickets(1000),
  ]);
  const valid = tickets.filter((ticket) => ticket.status === "valid").length;
  const used = tickets.filter((ticket) => ticket.status === "used").length;
  const rate = valid + used > 0 ? Math.round((used / (valid + used)) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Check-ins"
        description="Live door activity and check-in performance across every event."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total scans" value={String(checkIns.length)} icon={ScanLine} />
        <StatCard label="Checked-in tickets" value={String(used)} icon={CheckCircle2} />
        <StatCard label="Check-in rate" value={`${rate}%`} hint="of issued tickets" icon={CheckCircle2} />
      </div>

      <div className="glass overflow-hidden rounded-xl">
        <TableContainer>
          <THead>
            <TH>Ticket</TH><TH>Attendee</TH><TH>Event</TH><TH>Type</TH><TH>Method</TH><TH>Scanner</TH><TH>Time</TH>
          </THead>
          <TBody>
            {checkIns.map((entry) => (
              <TR key={entry.id}>
                <TD className="font-mono text-[10.5px]">{entry.ticketReference}</TD>
                <TD className="text-[12px]">{entry.attendeeName}</TD>
                <TD className="text-[12px]">{entry.eventTitle}</TD>
                <TD className="text-[12px] text-muted">{entry.ticketType}</TD>
                <TD><Badge tone={entry.method === "qr" ? "brand" : "neutral"}>{entry.method}</Badge></TD>
                <TD className="text-[11px] text-muted">{entry.scannedByName}</TD>
                <TD className="whitespace-nowrap text-[11px] text-muted">{formatDateTime(entry.scannedAt)}</TD>
              </TR>
            ))}
          </TBody>
        </TableContainer>
        {checkIns.length === 0 ? <p className="px-5 py-10 text-center text-[12px] text-muted">No check-ins recorded yet.</p> : null}
      </div>
    </div>
  );
}
