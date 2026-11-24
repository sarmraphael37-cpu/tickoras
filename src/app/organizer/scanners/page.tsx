import type { Metadata } from "next";
import Link from "next/link";
import { ScanLine, ShieldCheck, UserPlus, Users } from "lucide-react";
import {
  addStaffAction,
  removeStaffAction,
} from "@/app/actions/organizer";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireOrganizer } from "@/lib/auth";
import {
  listOrganizerEvents,
  listOrganizerStaff,
} from "@/lib/data/organizer";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Scanner management" };

export default async function OrganizerScannersPage() {
  const viewer = await requireOrganizer("/organizer/scanners");

  if (!viewer.organizerId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Manage"
          title="Scanner management"
          description="An organizer profile is required to assign door staff."
        />
        <Alert tone="warning">No organizer profile is linked to your account.</Alert>
      </div>
    );
  }

  const [staff, events, checkIns] = await Promise.all([
    listOrganizerStaff(viewer.organizerId),
    listOrganizerEvents(viewer.organizerId),
    import("@/lib/data/organizer").then((module) =>
      module.listOrganizerCheckIns(viewer.organizerId!, 8),
    ),
  ]);

  const assignable = events.filter(
    (event) => !["cancelled", "completed"].includes(event.status),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Scanner management"
        description="Give trusted team members permission to check in tickets for specific events."
        actions={
          <Link
            href="/scanner"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Open scanner
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-accent-300" />
              Assign a scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {assignable.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line bg-base p-4 text-[12px] text-muted">
                Create an event before assigning door staff.
              </p>
            ) : (
              <ActionForm
                action={addStaffAction}
                submitLabel="Assign scanner"
                pendingLabel="Assigning…"
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="staff-event">Event</Label>
                  <Select id="staff-event" name="event_id" required>
                    {assignable.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="staff-email">Account email</Label>
                  <Input
                    id="staff-email"
                    name="email"
                    type="email"
                    placeholder="scanner@example.com"
                    required
                  />
                  <p className="mt-1.5 text-[10.5px] leading-4 text-muted">
                    The user must already have a TICKORA account.
                  </p>
                </div>
                <div>
                  <Label htmlFor="staff-role">Permission</Label>
                  <Select id="staff-role" name="role" defaultValue="scanner">
                    <option value="scanner">Scanner — check in tickets</option>
                    <option value="manager">Manager — also manage the door team</option>
                  </Select>
                </div>
              </ActionForm>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-300" />
                Assigned team ({staff.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              {staff.length === 0 ? (
                <div className="px-5 pb-6 sm:px-6">
                  <EmptyState
                    icon={Users}
                    title="No scanners assigned"
                    description="Invite a team member by email to give them access to the door scanner."
                    className="border-0 py-8"
                  />
                </div>
              ) : (
                <TableContainer>
                  <THead>
                    <TH>Member</TH>
                    <TH>Event</TH>
                    <TH>Permission</TH>
                    <TH>Assigned</TH>
                    <TH />
                  </THead>
                  <TBody>
                    {staff.map((member) => (
                      <TR key={member.id}>
                        <TD>
                          <p className="font-medium text-ink">{member.name}</p>
                          <p className="mt-0.5 text-[10.5px] text-muted">
                            {member.email}
                          </p>
                        </TD>
                        <TD className="text-[12px]">{member.eventTitle}</TD>
                        <TD>
                          <Badge tone={member.role === "manager" ? "brand" : "neutral"}>
                            {member.role}
                          </Badge>
                        </TD>
                        <TD className="whitespace-nowrap text-[11px] text-muted">
                          {formatDateTime(member.createdAt)}
                        </TD>
                        <TD>
                          <ActionForm
                            action={removeStaffAction}
                            hidden={{ staff_id: member.id }}
                            submitLabel="Remove"
                            pendingLabel="Removing…"
                            variant="ghost"
                            confirm="Remove this scanner from the event?"
                          />
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
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-300" />
                Recent check-ins
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {checkIns.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line bg-base p-4 text-[12px] text-muted">
                  No tickets have been scanned yet.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {checkIns.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[11.5px]">
                      <span className="font-medium text-ink">
                        {entry.attendeeName}
                      </span>
                      <span className="text-muted">
                        {entry.eventTitle} · {entry.ticketTypeName}
                      </span>
                      <span className="text-[10px] text-muted">
                        {formatDateTime(entry.scannedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
