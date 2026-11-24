import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, FlaskConical, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
import type { PaymentProvider, PaymentStatus } from "@/types/database";
import { requireAdmin } from "@/lib/auth";
import { listAdminPayments } from "@/lib/data/admin";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/domain";
import { cn, formatDateTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

const FILTERS = [
  "all",
  "initiated",
  "pending",
  "requires_action",
  "succeeded",
  "failed",
  "refunded",
  "cancelled",
] as const;

function providerLabel(provider: string): string {
  return (
    PAYMENT_PROVIDER_LABELS[provider as PaymentProvider] ?? provider
  );
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/payments");
  const { status } = await searchParams;
  const active = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";

  const all = await listAdminPayments(500);
  const payments =
    active === "all"
      ? all
      : all.filter((payment) => payment.status === active);

  const succeeded = all.filter((payment) => payment.status === "succeeded");
  const successfulValue = succeeded.reduce(
    (sum, payment) => sum + payment.amountXaf,
    0,
  );
  const demoCount = all.filter((payment) => payment.isDemo).length;
  const attention = all.filter((payment) =>
    ["initiated", "pending", "requires_action"].includes(payment.status),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Payments"
        description="Provider attempts recorded by the payment adapter. Real provider settlement is only shown when verified by the provider."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Succeeded value"
          value={formatXAF(successfulValue)}
          hint={`${succeeded.length} verified attempts`}
          icon={ShieldCheck}
        />
        <StatCard
          label="Awaiting outcome"
          value={String(attention)}
          hint="initiated, pending or action required"
          icon={CreditCard}
        />
        <StatCard
          label="Demo attempts"
          value={String(demoCount)}
          hint="never move real money"
          icon={FlaskConical}
        />
      </div>

      <Alert tone="info">
        Demo payments are clearly tagged and settle inside TICKORA only. MTN Mobile
        Money, Orange Money and card channels remain disabled until production
        credentials and webhook signature verification are configured.
      </Alert>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter === "all"
              ? all.length
              : all.filter((payment) => payment.status === filter).length;
          return (
            <Link
              key={filter}
              href={
                filter === "all"
                  ? "/admin/payments"
                  : `/admin/payments?status=${filter}`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition",
                active === filter
                  ? "border-brand-700 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
              )}
            >
              {filter.replace(/_/g, " ")}
              <span className="rounded-full bg-surface px-1.5 text-[9.5px]">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments in this view"
          description="Payment attempts appear when attendees start a checkout."
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Booking</TH>
              <TH>Event</TH>
              <TH>Method</TH>
              <TH>Provider ref</TH>
              <TH>Amount</TH>
              <TH>When</TH>
              <TH>Status</TH>
            </THead>
            <TBody>
              {payments.map((payment) => (
                <TR key={payment.id}>
                  <TD>
                    <span className="font-mono text-[10.5px] text-ink">
                      {payment.bookingReference || "—"}
                    </span>
                    <p className="mt-0.5 text-[10px] capitalize text-muted">
                      {payment.bookingStatus.replace(/_/g, " ")}
                    </p>
                  </TD>
                  <TD>
                    <span className="block max-w-[190px] truncate text-[12px]">
                      {payment.eventTitle || "Event"}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-[12px]">
                      {providerLabel(payment.provider)}
                    </span>
                    {payment.isDemo ? (
                      <Badge
                        tone="outline"
                        className="ml-1.5 font-mono text-[8.5px] tracking-[0.1em]"
                      >
                        DEMO
                      </Badge>
                    ) : null}
                  </TD>
                  <TD>
                    <span className="font-mono text-[10px] text-muted">
                      {payment.providerReference ?? "—"}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap font-semibold">
                    {formatXAF(payment.amountXaf)}
                  </TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">
                    {formatDateTime(payment.createdAt)}
                  </TD>
                  <TD>
                    <StatusBadge
                      kind="payment"
                      status={payment.status as PaymentStatus}
                      demo={payment.isDemo}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableContainer>
        </div>
      )}

      <p className="text-[10.5px] leading-4 text-muted">
        Showing the {all.length} most recent attempts. A payment is only reported as
        succeeded after the adapter confirms it, and real provider refunds remain
        pending until the provider acknowledges settlement.
      </p>
    </div>
  );
}
