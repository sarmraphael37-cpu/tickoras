import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Wallet } from "lucide-react";
import { reviewPayoutAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Textarea } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PayoutStatus } from "@/types/database";
import { requireAdmin } from "@/lib/auth";
import { listAdminPayouts } from "@/lib/data/admin";
import { cn, formatDateTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Payouts" };

const FILTERS = ["all", "requested", "approved", "processing", "paid", "rejected"] as const;

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/payouts");
  const { status } = await searchParams;
  const active = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";

  const all = await listAdminPayouts();
  const payouts =
    active === "all"
      ? all
      : all.filter((payout) => payout.status === active);

  const open = all.filter((payout) =>
    ["requested", "approved", "processing"].includes(payout.status),
  );
  const openValue = open.reduce((sum, payout) => sum + payout.amountXaf, 0);
  const paid = all.filter((payout) => payout.status === "paid");
  const paidValue = paid.reduce((sum, payout) => sum + payout.amountXaf, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Payouts"
        description="Move organizer balances to mobile money or bank accounts. Automated payouts are not enabled; settlement is recorded manually with a reference."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Open requests"
          value={String(open.length)}
          hint={`${formatXAF(openValue)} to settle`}
          icon={Wallet}
        />
        <StatCard
          label="Paid out"
          value={formatXAF(paidValue)}
          hint={`${paid.length} settled payouts`}
          icon={Banknote}
        />
        <StatCard
          label="Total requests"
          value={String(all.length)}
          hint="all time"
          icon={Banknote}
        />
      </div>

      <Alert tone="warning">
        Automated mobile money payouts are not live. Only mark a payout paid after the
        transfer has actually been sent and the destination has been verified.
      </Alert>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter === "all"
              ? all.length
              : all.filter((payout) => payout.status === filter).length;
          return (
            <Link
              key={filter}
              href={
                filter === "all"
                  ? "/admin/payouts"
                  : `/admin/payouts?status=${filter}`
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

      {payouts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payouts in this view"
          description="Organizer payout requests appear here once their available balance passes the minimum."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="rounded-2xl border border-line bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[16px] font-semibold text-ink">
                    {formatXAF(payout.amountXaf)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {payout.organizerName}
                  </p>
                </div>
                <StatusBadge
                  kind="payout"
                  status={payout.status as PayoutStatus}
                />
              </div>

              <div className="mt-3 grid gap-1 text-[11px] text-muted sm:grid-cols-2">
                <p className="capitalize">
                  <span className="text-ink">Method:</span>{" "}
                  {payout.method.replace(/_/g, " ")}
                </p>
                <p className="truncate">
                  <span className="text-ink">Destination:</span>{" "}
                  {payout.destination}
                </p>
                <p className="sm:col-span-2">
                  Requested {formatDateTime(payout.createdAt)}
                </p>
              </div>

              {payout.adminNote ? (
                <p className="mt-3 rounded-lg bg-surface p-3 text-[11px] leading-5 text-muted">
                  {payout.adminNote}
                </p>
              ) : null}

              {["requested", "approved", "processing"].includes(payout.status) ? (
                <div className="mt-4 border-t border-line pt-4">
                  {payout.status === "requested" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ActionForm
                        action={reviewPayoutAction}
                        hidden={{ payout_id: payout.id, status: "approved" }}
                        submitLabel="Approve payout"
                        pendingLabel="Approving…"
                        variant="outline"
                        className="space-y-2"
                      >
                        <div>
                          <Label
                            htmlFor={`payout-approve-${payout.id}`}
                            className="text-[10.5px]"
                          >
                            Internal note (optional)
                          </Label>
                          <Textarea
                            id={`payout-approve-${payout.id}`}
                            name="note"
                            className="min-h-[64px] text-[11px]"
                            maxLength={1000}
                          />
                        </div>
                      </ActionForm>
                      <ActionForm
                        action={reviewPayoutAction}
                        hidden={{ payout_id: payout.id, status: "rejected" }}
                        submitLabel="Reject payout"
                        pendingLabel="Rejecting…"
                        variant="danger"
                        className="space-y-2"
                      >
                        <div>
                          <Label
                            htmlFor={`payout-reject-${payout.id}`}
                            className="text-[10.5px]"
                          >
                            Reason (sent to organizer)
                          </Label>
                          <Textarea
                            id={`payout-reject-${payout.id}`}
                            name="note"
                            className="min-h-[64px] text-[11px]"
                            minLength={5}
                            maxLength={1000}
                            required
                          />
                        </div>
                      </ActionForm>
                    </div>
                  ) : payout.status === "approved" ? (
                    <ActionForm
                      action={reviewPayoutAction}
                      hidden={{ payout_id: payout.id, status: "processing" }}
                      submitLabel="Mark processing"
                      pendingLabel="Updating…"
                      variant="outline"
                      className="space-y-2"
                    >
                      <div>
                        <Label
                          htmlFor={`payout-processing-${payout.id}`}
                          className="text-[10.5px]"
                        >
                          Transfer note (optional)
                        </Label>
                        <Textarea
                          id={`payout-processing-${payout.id}`}
                          name="note"
                          className="min-h-[64px] text-[11px]"
                          maxLength={1000}
                          placeholder="e.g. Queued with finance for MTN MoMo transfer."
                        />
                      </div>
                    </ActionForm>
                  ) : (
                    <ActionForm
                      action={reviewPayoutAction}
                      hidden={{ payout_id: payout.id, status: "paid" }}
                      submitLabel="Mark paid"
                      pendingLabel="Updating…"
                      confirm="Confirm the transfer has been sent and the destination verified?"
                      className="space-y-2"
                    >
                      <div>
                        <Label
                          htmlFor={`payout-paid-${payout.id}`}
                          className="text-[10.5px]"
                        >
                          Settlement reference (optional)
                        </Label>
                        <Textarea
                          id={`payout-paid-${payout.id}`}
                          name="note"
                          className="min-h-[64px] text-[11px]"
                          maxLength={1000}
                          placeholder="Transfer reference or receipt number."
                        />
                      </div>
                    </ActionForm>
                  )}
                </div>
              ) : (
                <p className="mt-4 border-t border-line pt-3 text-[10.5px] leading-4 text-muted">
                  This payout is closed. No further action is required.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
