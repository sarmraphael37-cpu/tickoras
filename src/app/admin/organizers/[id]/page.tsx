import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, Phone } from "lucide-react";
import { setOrganizerStatusAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getAdminOrganizerDetail } from "@/lib/data/admin";
import { formatDateTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Organizer detail" };

export default async function AdminOrganizerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(`/admin/organizers/${id}`);
  const detail = await getAdminOrganizerDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/organizers" className="inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" />
        All organizers
      </Link>
      <PageHeader
        eyebrow="Organizer record"
        title={detail.organizer.name}
        description="Application details, owner information and live performance."
        actions={<StatusBadge kind="organizer" status={detail.organizer.status} />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              {[
                ["Events", String(detail.events.length)],
                ["Tickets sold", String(detail.summary.ticketsSold)],
                ["Orders", String(detail.summary.orders)],
                ["Gross revenue", formatXAF(detail.summary.grossRevenue)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-base p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
                  <p className="mt-1.5 text-[16px] font-semibold text-ink">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Events</CardTitle></CardHeader>
            <CardContent className="p-0 pt-4">
              {detail.events.length === 0 ? (
                <p className="px-5 pb-5 text-[12px] text-muted">No events submitted yet.</p>
              ) : (
                <TableContainer>
                  <THead><TH>Event</TH><TH>Date</TH><TH>Status</TH><TH /></THead>
                  <TBody>
                    {detail.events.map((event) => (
                      <TR key={event.id}>
                        <TD className="font-medium text-ink">{event.title}</TD>
                        <TD className="whitespace-nowrap text-[11px] text-muted">{formatDateTime(event.start_at)}</TD>
                        <TD><StatusBadge kind="event" status={event.status} /></TD>
                        <TD><Link href={`/admin/events/${event.id}`} className="text-[11px] font-semibold text-accent-300 hover:underline">Inspect →</Link></TD>
                      </TR>
                    ))}
                  </TBody>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Owner</p>
            <p className="mt-3 text-[13px] font-semibold text-ink">{detail.owner?.full_name ?? "Unknown"}</p>
            <div className="mt-3 space-y-2 text-[11px] text-muted">
              <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-brand-400" />{detail.owner?.email ?? "—"}</p>
              {detail.owner?.phone ? <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-brand-400" />{detail.owner.phone}</p> : null}
              <p className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-brand-400" />Applied {formatDateTime(detail.owner?.created_at ?? detail.organizer.created_at)}</p>
            </div>
            <Link href={`/admin/users?profile=${detail.owner?.id ?? ""}`} className="mt-4 inline-flex text-[11px] font-semibold text-accent-300 hover:underline">View user record →</Link>
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold text-ink">Approval controls</p>
            {detail.organizer.status === "rejected" && detail.organizer.rejection_reason ? (
              <p className="mt-2 rounded-lg bg-danger/10 p-3 text-[11px] leading-5 text-danger">{detail.organizer.rejection_reason}</p>
            ) : null}
            <div className="mt-4 space-y-3">
              <ActionForm action={setOrganizerStatusAction} hidden={{ organizer_id: id, status: "approved" }} submitLabel="Approve" pendingLabel="Approving…" variant="outline" />
              <ActionForm action={setOrganizerStatusAction} hidden={{ organizer_id: id, status: "suspended" }} submitLabel="Suspend" pendingLabel="Suspending…" variant="danger" confirm="Suspend this organization? Its events will stop selling." />
              <ActionForm action={setOrganizerStatusAction} hidden={{ organizer_id: id, status: "rejected" }} submitLabel="Reject" pendingLabel="Rejecting…" variant="danger" className="space-y-2">
                <Label htmlFor="reject-reason" className="text-[10.5px]">Reason</Label>
                <Textarea id="reject-reason" name="reason" className="min-h-[64px] text-[11px]" minLength={5} required />
              </ActionForm>
              {detail.organizer.status !== "pending" ? (
                <ActionForm action={setOrganizerStatusAction} hidden={{ organizer_id: id, status: "pending" }} submitLabel="Return to pending" pendingLabel="Updating…" variant="ghost" />
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Contact</p>
            <p className="mt-3 break-all text-[12px] text-ink">{detail.organizer.email ?? "No public email"}</p>
            {detail.organizer.phone ? <p className="mt-1 text-[12px] text-muted">{detail.organizer.phone}</p> : null}
            {detail.organizer.city ? <p className="mt-1 text-[12px] text-muted">{detail.organizer.city}</p> : null}
            <Badge tone="neutral" className="mt-3 font-mono">/{detail.organizer.slug}</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
}
