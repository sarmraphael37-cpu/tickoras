import type { Metadata } from "next";
import Link from "next/link";
import { Flag, RotateCcw } from "lucide-react";
import { reviewRefundAction, settleRefundAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RefundStatus } from "@/types/database";
import { requireAdmin } from "@/lib/auth";
import { listAdminRefunds } from "@/lib/data/admin";
import { cn, formatDateTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Refunds" };

const FILTERS = ["all", "requested", "approved", "processed", "rejected"] as const;

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/refunds");
  const { status } = await searchParams;
  const active = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";

  const all = await listAdminRefunds();
  const refunds =
    active === "all"
      ? all
      : all.filter((refund) => refund.status === active);

  const requested = all.filter((refund) => refund.status === "requested");
  const approved = all.filter((refund) => refund.status === "approved");
  const approvedValue = approved.reduce(
    (sum, refund) => sum + refund.amountXaf,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Refunds"
        description="Review attendee refund requests. Demo refunds settle immediately; real provider refunds wait for confirmation."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Awaiting review"
          value={String(requested.length)}
          hint="requests needing a decision"
          icon={Flag}
        />
        <StatCard
          label="Approved"
          value={String(approved.length)}
          hint={`${formatXAF(approvedValue)} pending settlement`}
          icon={RotateCcw}
        />
        <StatCard
          label="Total requests"
          value={String(all.length)}
          hint="all time"
          icon={RotateCcw}
        />
      </div>

      <Alert tone="info">
        Approving a demo refund releases the seats and marks the request processed.
        Approving a real payment refund records the approval only; the request stays
        open until the provider confirms the transfer.
      </Alert>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter === "all"
              ? all.length
              : all.filter((refund) => refund.status === filter).length;
          return (
            <Link
              key={filter}
              href={
                filter === "all"
                  ? "/admin/refunds"
                  : `/admin/refunds?status=${filter}`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition",
                active === filter
                  ? "border-brand-700 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
              )}
            >
              {filter}
              <span className="rounded-full bg-surface px-1.5 text-[9.5px]">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {refunds.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No refunds in this view"
          description="Refund requests appear when attendees ask for their money back from a confirmed booking."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {refunds.map((refund) => (
            <div
              key={refund.id}
              className="rounded-2xl border border-line bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[16px] font-semibold text-ink">
                    {formatXAF(refund.amountXaf)}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    Booking{" "}
                    <span className="font-mono">{refund.bookingReference || "—"}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {refund.isDemo ? (
                    <Badge
                      tone="outline"
                      className="font-mono text-[8.5px] tracking-[0.1em]"
                    >
                      DEMO
                    </Badge>
                  ) : null}
                  <StatusBadge
                    kind="refund"
                    status={refund.status as RefundStatus}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-1 text-[11px] text-muted sm:grid-cols-2">
                <p className="truncate">
                  <span className="text-ink">Requester:</span>{" "}
                  {refund.requesterName}
                </p>
                <p className="truncate">{refund.requesterEmail || "No email"}</p>
                <p className="capitalize">
                  <span className="text-ink">Provider:</span>{" "}
                  {refund.provider?.replace(/_/g, " ") ?? "Unknown"}
                </p>
                <p>Requested {formatDateTime(refund.createdAt)}</p>
              </div>

              <p className="mt-3 rounded-lg bg-surface p-3 text-[11.5px] leading-5 text-muted">
                {refund.reason}
              </p>

              {refund.status === "requested" ? (
                <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  <ActionForm
                    action={reviewRefundAction}
                    hidden={{ refund_id: refund.id, decision: "approve" }}
                    submitLabel="Approve refund"
                    pendingLabel="Approving…"
                    variant="outline"
                    confirm="Approve this refund? Demo payments are settled immediately."
                    className="space-y-2"
                  >
                    <div>
                      <Label
                        htmlFor={`refund-approve-${refund.id}`}
                        className="text-[10.5px]"
                      >
                        Internal note (optional)
                      </Label>
                      <Textarea
                        id={`refund-approve-${refund.id}`}
                        name="note"
                        className="min-h-[64px] text-[11px]"
                        maxLength={1000}
                        placeholder="Context for the audit log."
                      />
                    </div>
                  </ActionForm>

                  <ActionForm
                    action={reviewRefundAction}
                    hidden={{ refund_id: refund.id, decision: "reject" }}
                    submitLabel="Decline request"
                    pendingLabel="Declining…"
                    variant="danger"
                    className="space-y-2"
                  >
                    <div>
                      <Label
                        htmlFor={`refund-reject-${refund.id}`}
                        className="text-[10.5px]"
                      >
                        Reason (sent to requester)
                      </Label>
                      <Textarea
                        id={`refund-reject-${refund.id}`}
                        name="note"
                        className="min-h-[64px] text-[11px]"
                        minLength={5}
                        maxLength={1000}
                        required
                      />
                    </div>
                  </ActionForm>
                </div>
              ) : refund.status === "approved" && !refund.isDemo ? (
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  <p className="text-[10.5px] leading-4 text-warning">
                    Awaiting provider reconciliation. Once the refund has actually
                    been sent, record the settlement reference below.
                  </p>
                  <ActionForm
                    action={settleRefundAction}
                    hidden={{ refund_id: refund.id }}
                    submitLabel="Mark refund settled"
                    pendingLabel="Recording…"
                    confirm="Confirm the refund was verified with the provider or paid out manually?"
                    className="space-y-2"
                  >
                    <div>
                      <Label
                        htmlFor={`refund-ref-${refund.id}`}
                        className="text-[10.5px]"
                      >
                        Settlement / provider reference
                      </Label>
                      <Input
                        id={`refund-ref-${refund.id}`}
                        name="reference"
                        className="h-9 text-[11.5px]"
                        maxLength={200}
                        placeholder="e.g. MTN MoMo refund reference"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`refund-note-${refund.id}`}
                        className="text-[10.5px]"
                      >
                        Verification note (optional)
                      </Label>
                      <Textarea
                        id={`refund-note-${refund.id}`}
                        name="note"
                        className="min-h-[56px] text-[11px]"
                        maxLength={1000}
                        placeholder="How the refund was verified."
                      />
                    </div>
                  </ActionForm>
                </div>
              ) : (
                <p className="mt-4 border-t border-line pt-3 text-[10.5px] leading-4 text-muted">
                  No further action is required for this request.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
