import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import {
  reviewEventAction,
  suspendEventAction,
} from "@/app/actions/admin";
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
import { getAdminEventDetail } from "@/lib/data/admin";
import { formatDateTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Event detail" };

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(`/admin/events/${id}`);
  const detail = await getAdminEventDetail(id);
  if (!detail) notFound();
  const { event, tiers, summary, bookings } = detail;

  return (
    <div className="space-y-6">
      <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All events
      </Link>

      <PageHeader
        eyebrow="Event record"
        title={event.title}
        description="Full submission, ticket configuration and live sales figures."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="event" status={event.status} />
            {event.status === "published" ? (
              <Link href={`/events/${event.slug}`} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-3 py-1.5 text-[11px] font-semibold text-ink hover:border-brand-400">
                Public page <ExternalLink className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="relative aspect-[16/6] overflow-hidden rounded-xl border border-line bg-brand-50">
        {event.cover_image_url || event.banner_image_url ? (
          <Image src={(event.banner_image_url ?? event.cover_image_url)!} alt={event.title} fill sizes="1200px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-4xl text-accent-300">{event.title}</div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Tickets sold", String(summary?.tickets_sold ?? 0)],
          ["Confirmed orders", String(summary?.orders ?? 0)],
          ["Gross revenue", formatXAF(Number(summary?.gross_revenue ?? 0))],
          ["Check-ins", String(summary?.checked_in ?? 0)],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1.5 text-[17px] font-semibold text-ink">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Submission details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-[12px]">
              <p className="flex items-center gap-2 text-muted"><CalendarDays className="h-3.5 w-3.5 text-brand-400" />{formatDateTime(event.start_at)} → {formatDateTime(event.end_at)}</p>
              <p className="flex items-center gap-2 text-muted"><MapPin className="h-3.5 w-3.5 text-brand-400" />{event.venue_name}, {event.city}</p>
              <p className="text-muted">Organizer: <span className="font-medium text-ink">{event.organizer?.name ?? "—"}</span> · Category: <span className="font-medium text-ink">{event.category?.name ?? "Uncategorised"}</span></p>
              <div className="rounded-lg bg-base p-4 leading-6 text-muted">{event.description || "No description provided."}</div>
              {event.rejection_reason ? (
                <p className="rounded-lg bg-danger/10 p-3 text-[11px] leading-5 text-danger">Rejection reason: {event.rejection_reason}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ticket configuration</CardTitle></CardHeader>
            <CardContent className="p-0 pt-4">
              <TableContainer>
                <THead><TH>Tier</TH><TH>Price</TH><TH>Total</TH><TH>Sold</TH><TH>Reserved</TH><TH>Status</TH></THead>
                <TBody>
                  {tiers.map((tier) => (
                    <TR key={tier.id}>
                      <TD className="font-medium text-ink">{tier.name}</TD>
                      <TD className="font-semibold">{formatXAF(Number(tier.price_xaf))}</TD>
                      <TD>{tier.quantity_total}</TD>
                      <TD>{tier.quantity_sold}</TD>
                      <TD>{tier.quantity_reserved}</TD>
                      <TD><Badge tone={tier.is_active ? "success" : "neutral"}>{tier.is_active ? "On sale" : "Hidden"}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </TableContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent bookings</CardTitle></CardHeader>
            <CardContent className="p-0 pt-4">
              <TableContainer>
                <THead><TH>Reference</TH><TH>Attendee</TH><TH>Total</TH><TH>Status</TH><TH>Date</TH></THead>
                <TBody>
                  {bookings.map((booking) => (
                    <TR key={booking.id}>
                      <TD className="font-mono text-[10.5px]">{booking.reference}</TD>
                      <TD>{booking.contact_name}</TD>
                      <TD className="font-semibold">{formatXAF(Number(booking.total_xaf))}</TD>
                      <TD><StatusBadge kind="booking" status={booking.status} /></TD>
                      <TD className="text-[11px] text-muted">{formatDateTime(booking.created_at)}</TD>
                    </TR>
                  ))}
                </TBody>
              </TableContainer>
              {bookings.length === 0 ? <p className="px-5 pb-5 text-[12px] text-muted">No bookings yet.</p> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[12px] font-semibold text-ink">Moderation</p>
            {event.status === "pending_approval" ? (
              <div className="mt-4 space-y-3">
                <ActionForm action={reviewEventAction} hidden={{ event_id: id, decision: "approve" }} submitLabel="Approve & publish" pendingLabel="Publishing…" variant="outline" />
                <ActionForm action={reviewEventAction} hidden={{ event_id: id, decision: "reject" }} submitLabel="Reject with feedback" pendingLabel="Rejecting…" variant="danger" className="space-y-2">
                  <Label htmlFor="event-feedback" className="text-[10.5px]">Feedback</Label>
                  <Textarea id="event-feedback" name="reason" className="min-h-[64px] text-[11px]" minLength={5} required />
                </ActionForm>
              </div>
            ) : null}
            {event.status === "published" ? (
              <div className="mt-4">
                <ActionForm action={suspendEventAction} hidden={{ event_id: id }} submitLabel="Suspend event" pendingLabel="Suspending…" variant="danger" confirm="Suspend this published event? It will be hidden from the public catalogue." className="space-y-2">
                  <Label htmlFor="suspend-reason" className="text-[10.5px]">Reason</Label>
                  <Textarea id="suspend-reason" name="reason" className="min-h-[64px] text-[11px]" minLength={5} required />
                </ActionForm>
              </div>
            ) : null}
            {!["pending_approval", "published"].includes(event.status) ? (
              <p className="mt-3 text-[11px] text-muted">No moderation action available in this state.</p>
            ) : null}
          </Card>
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Record</p>
            <dl className="mt-3 space-y-2 text-[11px]">
              <div className="flex justify-between"><dt className="text-muted">Created</dt><dd className="text-ink">{formatDateTime(event.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Submitted</dt><dd className="text-ink">{event.submitted_at ? formatDateTime(event.submitted_at) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Published</dt><dd className="text-ink">{event.published_at ? formatDateTime(event.published_at) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Views</dt><dd className="text-ink">{event.views_count}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
