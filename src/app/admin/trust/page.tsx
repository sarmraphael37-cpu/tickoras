import type { Metadata } from "next";
import {
  BadgeCheck,
  MessageSquareWarning,
  ShieldAlert,
  Star,
} from "lucide-react";
import {
  ComplaintStatusButtons,
  ReviewModerationButtons,
  VerificationReviewButtons,
} from "@/components/trust/trust-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  getTrustStats,
  listAllComplaints,
  listVerificationRequests,
} from "@/lib/data/trust";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Trust & Safety" };
export const dynamic = "force-dynamic";

const TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  pending: "warning",
  info_requested: "warning",
  rejected: "danger",
  suspended: "danger",
  open: "warning",
  investigating: "warning",
  resolved: "success",
};

export default async function AdminTrustPage() {
  await requireAdmin("/admin/trust");
  const stats = await getTrustStats();

  const [verifications, complaints, reportedReviews] = isSupabaseConfigured
    ? await Promise.all([
        listVerificationRequests(),
        listAllComplaints(),
        (async () => {
          const supabase = await createClient();
          const { data } = await supabase
            .from("public_reviews")
            .select("*, reviewer:profiles!user_id(full_name)")
            .in("status", ["reported", "pending"])
            .order("created_at", { ascending: false })
            .limit(50);
          return (data ?? []) as any[];
        })(),
      ])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Trust & Safety"
        description="Verification applications, complaints, review moderation and account trust signals."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending verifications" value={String(stats.pendingVerifications)} icon={BadgeCheck} />
        <StatCard label="Open complaints" value={String(stats.openComplaints)} hint={`${stats.investigatingComplaints} investigating`} icon={MessageSquareWarning} />
        <StatCard label="Reported reviews" value={String(stats.reportedReviews)} hint={`${stats.pendingReviews} pending`} icon={Star} />
        <StatCard label="Verified orgs / providers" value={`${stats.verifiedOrganizers} / ${stats.verifiedProviders}`} hint={`${stats.suspendedProviders} inactive providers`} icon={ShieldAlert} />
      </div>

      {/* Verification applications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">
            Verification applications ({verifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {verifications.length === 0 ? (
            <p className="text-[12px] text-muted">No applications yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {verifications.map((v) => (
                <div key={v.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink">
                      {v.subject_type === "organizer" ? "Organizer" : "Service provider"}{" "}
                      <span className="font-mono text-[10px] font-normal text-muted">
                        {v.subject_id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatDate(v.created_at)} · {v.documents.length} doc(s)
                      {v.notes ? ` · “${v.notes.slice(0, 80)}”` : ""}
                    </p>
                    {v.documents.length > 0 ? (
                      <p className="mt-1 text-[10px] text-muted">
                        {v.documents.map((d) => d.label).join(", ")}
                      </p>
                    ) : null}
                    {v.admin_note ? (
                      <p className="mt-1 text-[10.5px] text-ink">Note: {v.admin_note}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={TONE[v.status] ?? "neutral"}>{v.status.replace("_", " ")}</Badge>
                    {v.status === "pending" || v.status === "info_requested" ? (
                      <VerificationReviewButtons requestId={v.id} />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complaints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">
            Complaints & disputes ({complaints.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {complaints.length === 0 ? (
            <p className="text-[12px] text-muted">No complaints.</p>
          ) : (
            <div className="divide-y divide-line">
              {complaints.map((c) => (
                <div key={c.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-ink">
                        {c.subject}{" "}
                        <span className="font-mono text-[10px] font-normal text-muted">
                          {c.reference}
                        </span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted">
                        {c.description}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {formatDate(c.created_at)}
                        {c.event_title ? ` · ${c.event_title}` : ""}
                        {c.evidence.length > 0 ? ` · ${c.evidence.length} evidence link(s)` : ""}
                        {c.admin_note ? ` · note: ${c.admin_note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={TONE[c.status] ?? "neutral"}>{c.status}</Badge>
                      <ComplaintStatusButtons complaintId={c.id} status={c.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reported reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">
            Reported & pending reviews ({reportedReviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {reportedReviews.length === 0 ? (
            <p className="text-[12px] text-muted">Nothing to moderate.</p>
          ) : (
            <div className="divide-y divide-line">
              {reportedReviews.map((r) => (
                <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink">
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}{" "}
                      <span className="text-[11px] font-normal text-muted">
                        by {(r as any).reviewer?.full_name ?? "user"} ·{" "}
                        {r.target_type} · {formatDate(r.created_at)}
                      </span>
                    </p>
                    {r.comment ? (
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted">{r.comment}</p>
                    ) : null}
                  </div>
                  <ReviewModerationButtons reviewId={r.id} status={r.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
