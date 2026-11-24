import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  Pencil,
  ScanLine,
  Send,
  Ticket,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  deleteEventAction,
  submitEventAction,
} from "@/app/actions/organizer";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventTabs } from "@/components/organizer/event-tabs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { requireOrganizer } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/data/organizer";
import {
  formatDateTime,
  formatShortDate,
  formatTime,
  formatXAF,
  isEventPast,
  relativeTime,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Event details" };

export default async function OrganizerEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string; saved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const viewer = await requireOrganizer(`/organizer/events/${id}`);
  if (!viewer.organizerId) notFound();
  const detail = await getOrganizerEvent(viewer.organizerId, id);
  if (!detail) notFound();

  const editable = ["draft", "rejected"].includes(detail.status);
  const past = isEventPast(detail.endAt);
  const percent =
    detail.capacity > 0
      ? Math.min(100, Math.round((detail.ticketsSold / detail.capacity) * 100))
      : 0;
  const remaining = Math.max(0, detail.capacity - detail.ticketsSold);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All events
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="event" status={detail.status} />
          {detail.status === "published" ? (
            <Link
              href={`/events/${detail.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 text-[10.5px] font-semibold text-ink hover:border-brand-300"
            >
              Public page
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>

      {query.submitted === "1" ? (
        <Alert tone="success" title="Submitted for review">
          TICKORA will review this event. You will be notified when it is published or
          returned with feedback.
        </Alert>
      ) : null}
      {query.saved === "1" ? (
        <Alert tone="success" title="Draft saved">
          Your changes are saved privately. Submit when you are ready for review.
        </Alert>
      ) : null}
      {detail.status === "rejected" ? (
        <Alert tone="danger" title="Changes requested">
          {detail.rejectionReason ??
            "TICKORA returned this event. Review the details, update the draft and submit again."}
        </Alert>
      ) : null}
      {detail.status === "pending_approval" ? (
        <Alert tone="info" title="Awaiting TICKORA review">
          Editing is locked while this event is in the approval queue. You will be
          notified once it is published or returned.
        </Alert>
      ) : null}
      {detail.status === "suspended" ? (
        <Alert tone="danger" title="Event suspended">
          This event is hidden from the public catalogue. Contact TICKORA support for
          details.
        </Alert>
      ) : null}

      <EventTabs eventId={id} active="overview" />

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href={`/organizer/events/${id}/tickets`}
          className="rounded-lg border border-line bg-card p-3 text-[11.5px] font-medium text-muted transition hover:border-brand-400 hover:text-ink"
        >
          Manage tickets →
        </Link>
        <Link
          href={`/organizer/events/${id}/attendees`}
          className="rounded-lg border border-line bg-card p-3 text-[11.5px] font-medium text-muted transition hover:border-brand-400 hover:text-ink"
        >
          View attendees →
        </Link>
        <Link
          href={`/organizer/bookings?event=${id}`}
          className="rounded-lg border border-line bg-card p-3 text-[11.5px] font-medium text-muted transition hover:border-brand-400 hover:text-ink"
        >
          View bookings →
        </Link>
      </div>

      <div className="overflow-hidden glass rounded-2xl shadow-card">
        <div className="relative aspect-[16/6] w-full bg-brand-50">
          {detail.coverImageUrl ? (
            <Image
              src={detail.coverImageUrl}
              alt={detail.title}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-cream font-display text-4xl text-accent-200">
              {detail.title}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-forest/55 to-transparent" />
          <div className="absolute inset-x-5 bottom-4">
            {detail.categoryName ? (
              <Badge tone="dark" className="bg-card/90 text-ice">
                {detail.categoryName}
              </Badge>
            ) : null}
            <h1 className="mt-2 font-display text-[26px] leading-tight text-white sm:text-[34px]">
              {detail.title}
            </h1>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="space-y-1.5 text-[12px] text-muted">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-accent-300" />
              {formatDateTime(detail.startAt)} ·{" "}
              {formatShortDate(detail.endAt) !== formatShortDate(detail.startAt)
                ? `${formatShortDate(detail.endAt)} ${formatTime(detail.endAt)}`
                : formatTime(detail.endAt)}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent-300" />
              {detail.venueName}, {detail.city}
            </p>
            <p className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-accent-300" />
              {past ? "Event ended" : `Starts ${relativeTime(detail.startAt)}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editable ? (
              <>
                <Link
                  href={`/organizer/events/${detail.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-brand-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit draft
                </Link>
                {viewer.organizerStatus === "approved" ? (
                  <ActionForm
                    action={submitEventAction}
                    hidden={{ event_id: detail.id }}
                    submitLabel="Submit for review"
                    pendingLabel="Submitting…"
                    variant="outline"
                    confirm="Submit this event to TICKORA for review? Editing locks until the review is complete."
                  >
                    <span className="sr-only">Submit</span>
                  </ActionForm>
                ) : null}
                <ActionForm
                  action={deleteEventAction}
                  hidden={{ event_id: detail.id }}
                  submitLabel="Delete draft"
                  pendingLabel="Deleting…"
                  variant="ghost"
                  confirm="Delete this draft permanently? This cannot be undone."
                >
                  <Trash2 className="hidden" />
                </ActionForm>
              </>
            ) : detail.status === "published" && !past ? (
              <Link
                href="/scanner"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-brand-700"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Open scanner
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {editable && viewer.organizerStatus !== "approved" ? (
        <Alert tone="warning" title="Submission unavailable">
          Your organizer profile is not approved yet. You can keep editing this draft;
          submit it once TICKORA approves your organization.
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tickets sold"
          value={String(detail.ticketsSold)}
          hint={
            detail.capacity > 0
              ? `${remaining} of ${detail.capacity} remaining`
              : "uncapped capacity"
          }
          icon={Ticket}
        />
        <StatCard
          label="Gross revenue"
          value={formatXAF(detail.grossRevenue)}
          hint={`${detail.orders} confirmed order${detail.orders === 1 ? "" : "s"}`}
          icon={TrendingUp}
        />
        <StatCard
          label="Checked in"
          value={String(detail.checkedIn)}
          hint={
            detail.ticketsSold > 0
              ? `${Math.round((detail.checkedIn / detail.ticketsSold) * 100)}% of tickets`
              : "no tickets yet"
          }
          icon={CheckCircle2}
        />
        <StatCard
          label="Page views"
          value={String(detail.viewsCount)}
          hint="public event page"
          icon={Eye}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-accent-300" />
                Ticket tiers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              {detail.ticketTypes.length === 0 ? (
                <p className="px-5 pb-5 text-[12px] text-muted sm:px-6">
                  No ticket tiers yet.
                </p>
              ) : (
                <TableContainer>
                  <THead>
                    <TH>Tier</TH>
                    <TH>Price</TH>
                    <TH>Sold</TH>
                    <TH>Reserved</TH>
                    <TH>Capacity</TH>
                    <TH>Limits</TH>
                    <TH>Status</TH>
                  </THead>
                  <TBody>
                    {detail.ticketTypes.map((tier) => (
                      <TR key={tier.id}>
                        <TD>
                          <p className="font-medium text-ink">{tier.name}</p>
                          {tier.description ? (
                            <p className="mt-0.5 max-w-[220px] truncate text-[10.5px] text-muted">
                              {tier.description}
                            </p>
                          ) : null}
                        </TD>
                        <TD className="whitespace-nowrap font-semibold">
                          {Number(tier.price_xaf) === 0
                            ? "Free"
                            : formatXAF(Number(tier.price_xaf))}
                        </TD>
                        <TD>{tier.quantity_sold}</TD>
                        <TD>{tier.quantity_reserved}</TD>
                        <TD>{tier.quantity_total}</TD>
                        <TD className="text-[11px] text-muted">
                          {tier.min_per_order}–{tier.max_per_order}
                        </TD>
                        <TD>
                          <Badge tone={tier.is_active ? "success" : "neutral"}>
                            {tier.is_active ? "On sale" : "Hidden"}
                          </Badge>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {detail.event.description ? (
                <div className="space-y-3 text-[12.5px] leading-6 text-muted">
                  {detail.event.description.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted">No description yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Sales progress
            </p>
            <p className="mt-2 text-[24px] font-semibold tracking-tight text-ink">
              {percent}%
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {detail.capacity > 0
                ? `${detail.ticketsSold} sold · ${remaining} remaining`
                : `${detail.ticketsSold} sold · uncapped capacity`}
            </p>
            <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[11.5px]">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Orders</dt>
                <dd className="font-medium text-ink">{detail.orders}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Check-in rate</dt>
                <dd className="font-medium text-ink">
                  {detail.ticketsSold > 0
                    ? `${Math.round((detail.checkedIn / detail.ticketsSold) * 100)}%`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Capacity</dt>
                <dd className="font-medium text-ink">
                  {detail.capacity > 0 ? detail.capacity : "Uncapped"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <Users className="h-3.5 w-3.5 text-accent-300" />
              Door team
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Assign staff to scan tickets for this event. You can also scan from your
              own account.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href="/organizer/staff"
                className="text-[11px] font-semibold text-accent-300 hover:underline"
              >
                Manage staff →
              </Link>
              <Link
                href="/scanner"
                className="text-[11px] font-semibold text-accent-300 hover:underline"
              >
                Open scanner →
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Record
            </p>
            <dl className="mt-3 space-y-2 text-[11px]">
              <div>
                <dt className="text-muted">Created</dt>
                <dd className="font-medium text-ink">
                  {formatDateTime(detail.event.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Last updated</dt>
                <dd className="font-medium text-ink">
                  {formatDateTime(detail.event.updated_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Submitted</dt>
                <dd className="font-medium text-ink">
                  {detail.event.submitted_at
                    ? formatDateTime(detail.event.submitted_at)
                    : "Not submitted"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Published</dt>
                <dd className="font-medium text-ink">
                  {detail.event.published_at
                    ? formatDateTime(detail.event.published_at)
                    : "Not published"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
