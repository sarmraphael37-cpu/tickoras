import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { VerificationForm } from "@/components/trust/trust-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOrganizer } from "@/lib/auth";
import { getMyVerificationRequest } from "@/lib/data/trust";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Verification" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  pending: "warning",
  info_requested: "warning",
  rejected: "danger",
  suspended: "danger",
};

export default async function OrganizerVerificationPage() {
  const viewer = await requireOrganizer("/organizer/verification");
  if (!viewer.organizerId) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No organizer profile"
        description="Verification is available once your organizer account exists."
      />
    );
  }

  const request = await getMyVerificationRequest("organizer", viewer.organizerId);
  const active = request && ["pending", "info_requested"].includes(request.status);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Trust & safety"
        title="Get verified"
        description="Verified organizers display a badge across TICKORA, building attendee confidence and unlocking trust features."
      />

      {request ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              Latest application
              <Badge tone={STATUS_TONE[request.status] ?? "neutral"}>
                {request.status.replace("_", " ")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4 text-[12px] text-muted">
            <p>Submitted {formatDate(request.created_at)}</p>
            {request.documents.length > 0 ? (
              <p>{request.documents.length} document(s) attached</p>
            ) : null}
            {request.admin_note ? (
              <p className="rounded-lg border border-line bg-surface p-3 text-ink">
                Reviewer note: {request.admin_note}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!active ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">New verification application</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <VerificationForm
              subjectType="organizer"
              subjectId={viewer.organizerId}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-5 text-[12.5px] text-muted">
            Your application is under review. We&apos;ll update the status here —
            no need to resubmit.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
