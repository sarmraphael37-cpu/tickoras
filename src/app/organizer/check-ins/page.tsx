import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, ScanLine, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireOrganizer } from "@/lib/auth";
import { listOrganizerCheckIns } from "@/lib/data/organizer";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Check-ins" };

export default async function OrganizerCheckInsPage() {
  const viewer = await requireOrganizer("/organizer/check-ins");
  const checkIns = viewer.organizerId
    ? await listOrganizerCheckIns(viewer.organizerId, 200)
    : [];

  const qrCount = checkIns.filter((checkIn) => checkIn.method === "qr").length;
  const manualCount = checkIns.length - qrCount;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Check-ins"
        description="A complete log of every ticket scanned at your events."
        actions={
          <Link
            href="/scanner"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Open scanner
          </Link>
        }
      />

      {checkIns.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Check-ins"
            value={String(checkIns.length)}
            hint="latest 200 scans"
            icon={UserCheck}
          />
          <StatCard
            label="QR scans"
            value={String(qrCount)}
            hint="camera or QR reader"
            icon={QrCode}
          />
          <StatCard
            label="Manual entries"
            value={String(manualCount)}
            hint="full code entered by staff"
            icon={ScanLine}
          />
        </div>
      ) : null}

      {checkIns.length === 0 ? (
        <EmptyState
          icon={ScanLine}
          title="No check-ins yet"
          description="Scans appear here the moment a valid ticket is admitted. Open the scanner on the door device."
          actionLabel="Open scanner"
          actionHref="/scanner"
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Ticket</TH>
              <TH>Attendee</TH>
              <TH>Event</TH>
              <TH>Type</TH>
              <TH>Method</TH>
              <TH>Scanned</TH>
            </THead>
            <TBody>
              {checkIns.map((checkIn) => (
                <TR key={checkIn.id}>
                  <TD>
                    <span className="font-mono text-[10.5px] text-muted">
                      {checkIn.ticketReference}
                    </span>
                  </TD>
                  <TD className="font-medium">{checkIn.attendeeName}</TD>
                  <TD>
                    <p className="max-w-[220px] truncate text-[12px]">
                      {checkIn.eventTitle}
                    </p>
                  </TD>
                  <TD className="text-[12px]">{checkIn.ticketTypeName}</TD>
                  <TD>
                    <Badge tone={checkIn.method === "qr" ? "brand" : "neutral"}>
                      {checkIn.method === "qr" ? "QR scan" : "Manual"}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">
                    {formatDateTime(checkIn.scannedAt)}
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
