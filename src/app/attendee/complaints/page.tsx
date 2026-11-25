import type { Metadata } from "next";
import { MessageSquareWarning } from "lucide-react";
import { ComplaintForm } from "@/components/trust/trust-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewer } from "@/lib/auth";
import { listMyComplaints } from "@/lib/data/trust";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Complaints" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  open: "warning",
  investigating: "warning",
  resolved: "success",
  rejected: "neutral",
};

export default async function AttendeeComplaintsPage() {
  const viewer = await requireViewer("/attendee/complaints");
  const complaints = await listMyComplaints(viewer.id);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Support"
        title="Complaints & disputes"
        description="Report an issue with an event, organizer or booking. Our trust team investigates every case."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">New complaint</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ComplaintForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">
              Your complaints ({complaints.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {complaints.length === 0 ? (
              <EmptyState
                icon={MessageSquareWarning}
                title="No complaints yet"
                description="Issues you report will appear here with live status updates."
              />
            ) : (
              <div className="divide-y divide-line">
                {complaints.map((c) => (
                  <div key={c.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12.5px] font-semibold text-ink">
                        {c.subject}
                      </p>
                      <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>
                        {c.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                      {c.reference} · {formatDate(c.created_at)}
                      {c.event_title ? ` · ${c.event_title}` : ""}
                    </p>
                    {c.admin_note ? (
                      <p className="mt-1.5 rounded-lg bg-surface p-2 text-[11px] text-muted">
                        {c.admin_note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
