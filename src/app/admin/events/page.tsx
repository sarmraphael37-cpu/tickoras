import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ExternalLink, ShieldOff } from "lucide-react";
import { suspendEventAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
import type { EventStatus } from "@/types/database";
import { requireAdmin } from "@/lib/auth";
import { listAdminEvents } from "@/lib/data/admin";
import { cn, formatShortDate, formatXAF, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Events" };

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending_approval", label: "In review" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
  { key: "completed", label: "Completed" },
];

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/events");
  const { status } = await searchParams;
  const active = FILTERS.some((filter) => filter.key === status)
    ? status!
    : "all";
  const events = await listAdminEvents(active === "all" ? undefined : active);
  const all = active === "all" ? events : await listAdminEvents();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Events"
        description="The full event catalogue across every organizer, including drafts and suspended events."
        actions={
          <Link
            href="/admin/approvals"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[12px] font-semibold text-ink transition hover:border-brand-300"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Approval queue
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter.key === "all"
              ? all.length
              : all.filter((event) => event.status === filter.key).length;
          return (
            <Link
              key={filter.key}
              href={
                filter.key === "all"
                  ? "/admin/events"
                  : `/admin/events?status=${filter.key}`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                active === filter.key
                  ? "border-brand-700 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
              )}
            >
              {filter.label}
              <span className="rounded-full bg-surface px-1.5 text-[9.5px]">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events in this view"
          description="Events appear here as organizers create and submit them."
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Event</TH>
              <TH>Organizer</TH>
              <TH>Date</TH>
              <TH>Sales</TH>
              <TH>Revenue</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </THead>
            <TBody>
              {events.map((event) => (
                <TR key={event.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                        {event.coverImageUrl ? (
                          <Image
                            src={event.coverImageUrl}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-display text-base text-accent-300">
                            {event.title.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[190px] truncate font-medium text-ink">
                          {event.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {event.city} · {event.venueName}
                        </p>
                        {event.isFeatured ? (
                          <Badge tone="brand" className="mt-1 text-[9px]">
                            Featured
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <p className="max-w-[150px] truncate text-[12px]">
                      {event.organizerName}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      Created {relativeTime(event.createdAt)}
                    </p>
                  </TD>
                  <TD className="whitespace-nowrap text-[11.5px] text-muted">
                    {formatShortDate(event.startAt)}
                  </TD>
                  <TD>{event.ticketsSold}</TD>
                  <TD className="whitespace-nowrap font-semibold">
                    {formatXAF(event.grossRevenue)}
                  </TD>
                  <TD>
                    <StatusBadge
                      kind="event"
                      status={event.status as EventStatus}
                    />
                    {event.rejectionReason ? (
                      <p className="mt-1 max-w-[170px] truncate text-[10px] text-danger">
                        {event.rejectionReason}
                      </p>
                    ) : null}
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-1.5">
                      {event.status === "published" ? (
                        <>
                          <Link
                            href={`/events/${event.slug}`}
                            className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-accent-300 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Public page
                          </Link>
                          <details className="group">
                            <summary className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-[10.5px] font-semibold text-danger hover:underline">
                              <ShieldOff className="h-3 w-3" />
                              Suspend
                            </summary>
                            <div className="mt-2 w-[220px] rounded-lg border border-line bg-surface p-3">
                              <ActionForm
                                action={suspendEventAction}
                                hidden={{ event_id: event.id }}
                                submitLabel="Confirm suspension"
                                pendingLabel="Suspending…"
                                variant="danger"
                                className="space-y-2"
                              >
                                <div>
                                  <Label
                                    htmlFor={`suspend-${event.id}`}
                                    className="text-[10.5px]"
                                  >
                                    Reason (sent to organizer)
                                  </Label>
                                  <Textarea
                                    id={`suspend-${event.id}`}
                                    name="reason"
                                    className="min-h-[64px] text-[11px]"
                                    minLength={5}
                                    maxLength={2000}
                                    required
                                  />
                                </div>
                              </ActionForm>
                            </div>
                          </details>
                        </>
                      ) : event.status === "pending_approval" ? (
                        <Link
                          href="/admin/approvals"
                          className="whitespace-nowrap text-[11px] font-semibold text-accent-300 hover:underline"
                        >
                          Review →
                        </Link>
                      ) : event.status === "suspended" ? (
                        <Link
                          href={`/events/${event.slug}`}
                          className="whitespace-nowrap text-[11px] font-semibold text-accent-300 hover:underline"
                        >
                          Slug
                        </Link>
                      ) : (
                        <span className="text-[10.5px] text-muted">No action</span>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableContainer>
        </div>
      )}

      <p className="text-[10.5px] leading-4 text-muted">
        Suspending hides an event from the public catalogue and notifies the organizer.
        Suspended events can be reviewed again from the approvals queue after the
        organizer fixes the issue.
      </p>
    </div>
  );
}
