import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CreditCard, Receipt, RotateCcw } from "lucide-react";
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
import { requireViewer } from "@/lib/auth";
import {
  listAttendeePayments,
  listAttendeeRefunds,
} from "@/lib/data/attendee";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/domain";
import { formatDateTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

export default async function AttendeePaymentsPage() {
  const viewer = await requireViewer("/attendee/payments");
  const [payments, refunds] = await Promise.all([
    listAttendeePayments(viewer.id),
    listAttendeeRefunds(viewer.id),
  ]);

  const succeeded = payments.filter((payment) => payment.status === "succeeded");
  const totalPaid = succeeded.reduce((sum, payment) => sum + payment.amountXaf, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Money"
        title="Payments & refunds"
        description="Every payment attempt and refund request linked to your TICKORA account."
      />

      {payments.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Payments"
            value={String(payments.length)}
            hint="attempts recorded"
            icon={CreditCard}
          />
          <StatCard
            label="Successful"
            value={String(succeeded.length)}
            hint="verified transactions"
            icon={Receipt}
          />
          <StatCard
            label="Total paid"
            value={formatXAF(totalPaid)}
            hint="verified only"
            icon={Receipt}
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-line bg-surface p-4 text-[11px] leading-5 text-muted">
        Demo payments are clearly labelled and never move real money. MTN Mobile
        Money, Orange Money and card payments stay disabled until their production
        credentials and webhook signatures are configured and verified. Payment
        statuses are set only by TICKORA&apos;s verified server-side flows and cannot be
        edited here.
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-ink">Payment history</h2>
        {payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments yet"
            description="Payment attempts appear here after you start a checkout."
            actionLabel="Find an event"
            actionHref="/events"
          />
        ) : (
          <div className="overflow-hidden glass rounded-2xl shadow-card">
            <TableContainer>
              <THead>
                <TH>Payment ref</TH>
                <TH>Event</TH>
                <TH>Booking</TH>
                <TH>Method</TH>
                <TH>Date</TH>
                <TH>Amount</TH>
                <TH>Currency</TH>
                <TH>Status</TH>
                <TH />
              </THead>
              <TBody>
                {payments.map((payment) => (
                  <TR key={payment.id}>
                    <TD>
                      <span className="font-mono text-[10px] text-muted">
                        {payment.id.slice(0, 8).toUpperCase()}
                      </span>
                    </TD>
                    <TD>
                      <p className="max-w-[220px] truncate font-medium text-ink">
                        {payment.eventTitle || "Event"}
                      </p>
                    </TD>
                    <TD>
                      <span className="font-mono text-[11px] text-muted">
                        {payment.bookingReference}
                      </span>
                    </TD>
                    <TD>
                      <span className="text-[12px]">
                        {PAYMENT_PROVIDER_LABELS[payment.provider]}
                      </span>
                      {payment.isDemo ? (
                        <Badge
                          tone="outline"
                          className="ml-1.5 font-mono text-[8.5px] tracking-[0.1em]"
                        >
                          DEMO
                        </Badge>
                      ) : null}
                      {payment.providerReference ? (
                        <p className="mt-0.5 font-mono text-[10px] text-muted">
                          {payment.providerReference}
                        </p>
                      ) : null}
                    </TD>
                    <TD className="whitespace-nowrap text-[11.5px] text-muted">
                      {formatDateTime(payment.createdAt)}
                    </TD>
                    <TD className="whitespace-nowrap font-semibold">
                      {formatXAF(payment.amountXaf)}
                    </TD>
                    <TD>
                      <Badge tone="neutral" className="font-mono text-[10px]">
                        XAF
                      </Badge>
                    </TD>
                    <TD>
                      <StatusBadge
                        kind="payment"
                        status={payment.status}
                        demo={payment.isDemo}
                      />
                    </TD>
                    <TD>
                      <Link
                        href={`/attendee/bookings/${payment.bookingId}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold text-accent-300 hover:underline"
                      >
                        Booking
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableContainer>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
          <RotateCcw className="h-4 w-4 text-accent-300" />
          Refund requests
        </h2>
        {refunds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-card p-5 text-[12px] text-muted">
            You have not requested a refund. Refunds can be requested from a confirmed
            booking while tickets are still unused.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {refunds.map((refund) => (
              <div
                key={refund.id}
                className="glass-subtle rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink">
                    {formatXAF(refund.amountXaf)}
                  </p>
                  <StatusBadge kind="refund" status={refund.status} />
                </div>
                <p className="mt-1 text-[10.5px] text-muted">
                  Booking{" "}
                  <span className="font-mono">{refund.bookingReference ?? "—"}</span>
                </p>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted">
                  {refund.reason}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  Requested {formatDateTime(refund.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
        {refunds.some((refund) => refund.status === "approved") ? (
          <Alert tone="info">
            Approved refunds are sent back through the original payment provider. Real
            provider refunds stay pending until the provider confirms settlement.
          </Alert>
        ) : null}
      </section>
    </div>
  );
}
