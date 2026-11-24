import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  MapPin,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import {
  reviewEventAction,
  reviewOrganizerAction,
} from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth";
import { listAdminEvents, listAdminOrganizers } from "@/lib/data/admin";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Event approvals" };

export default async function AdminEventApprovalsPage() {
  await requireAdmin("/admin/events/pending");
  const [organizers, events] = await Promise.all([
    listAdminOrganizers("pending"),
    listAdminEvents("pending_approval"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform control"
        title="Event approvals"
        description="Review organizer applications and submitted events. Every decision is recorded."
        actions={
          <Badge tone="brand">
            <ClipboardCheck className="h-3 w-3" />
            {organizers.length + events.length} awaiting review
          </Badge>
        }
      />

      {organizers.length === 0 && events.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Everything is reviewed"
          description="New organizer applications and event submissions will appear here."
        />
      ) : null}

      {organizers.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Organizer applications ({organizers.length})
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {organizers.map((organizer) => (
              <Card key={organizer.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">
                      {organizer.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {organizer.ownerEmail ?? "No email"} · {organizer.city ?? "No city"}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      Applied {relativeTime(organizer.created_at)}
                    </p>
                  </div>
                  <StatusBadge kind="organizer" status={organizer.status} />
                </div>
                {organizer.description ? (
                  <p className="mt-3 line-clamp-3 rounded-lg bg-base p-3 text-[11.5px] leading-5 text-muted">
                    {organizer.description}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  <ActionForm
                    action={reviewOrganizerAction}
                    hidden={{ organizer_id: organizer.id, decision: "approve" }}
                    submitLabel="Approve organizer"
                    pendingLabel="Approving…"
                    variant="outline"
                  >
                    <span className="sr-only">Approve</span>
                  </ActionForm>
                  <ActionForm
                    action={reviewOrganizerAction}
                    hidden={{ organizer_id: organizer.id, decision: "reject" }}
                    submitLabel="Reject application"
                    pendingLabel="Rejecting…"
                    variant="danger"
                    className="space-y-2"
                  >
                    <Label htmlFor={`org-reason-${organizer.id}`} className="text-[10.5px]">
                      Reason (required)
                    </Label>
                    <Textarea
                      id={`org-reason-${organizer.id}`}
                      name="reason"
                      className="min-h-[64px] text-[11px]"
                      minLength={5}
                      maxLength={1000}
                      required
                    />
                  </ActionForm>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {events.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Submitted events ({events.length})
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {events.map((event) => (
              <Card key={event.id} className="p-5">
                <div className="flex gap-4">
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                    {event.coverImageUrl ? (
                      <Image src={event.coverImageUrl} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-display text-xl text-accent-300">
                        {event.title.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{event.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {event.organizerName} · {event.city}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted">
                      <CalendarDays className="h-3 w-3 text-brand-400" />
                      {formatDateTime(event.startAt)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted">
                      <MapPin className="h-3 w-3 text-brand-400" />
                      {event.venueName}, {event.city}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      Submitted {relativeTime(event.submittedAt ?? event.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  <ActionForm
                    action={reviewEventAction}
                    hidden={{ event_id: event.id, decision: "approve" }}
                    submitLabel="Publish event"
                    pendingLabel="Publishing…"
                    variant="outline"
                  >
                    <span className="sr-only">Approve</span>
                  </ActionForm>
                  <ActionForm
                    action={reviewEventAction}
                    hidden={{ event_id: event.id, decision: "reject" }}
                    submitLabel="Request corrections"
                    pendingLabel="Sending…"
                    variant="danger"
                    className="space-y-2"
                  >
                    <Label htmlFor={`event-reason-${event.id}`} className="text-[10.5px]">
                      Feedback (required)
                    </Label>
                    <Textarea
                      id={`event-reason-${event.id}`}
                      name="reason"
                      className="min-h-[64px] text-[11px]"
                      minLength={5}
                      maxLength={2000}
                      required
                    />
                  </ActionForm>
                </div>
                <Link
                  href={`/admin/events/${event.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
                >
                  Inspect full submission →
                </Link>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Alert tone="info">
        <span className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Organizers cannot approve their own events. Approval is performed only by
          authenticated administrators and written to the audit log.
        </span>
      </Alert>
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <UserCheck className="h-3.5 w-3.5 text-brand-400" />
        Rejected events remain editable so organizers can fix and resubmit them.
      </div>
    </div>
  );
}
