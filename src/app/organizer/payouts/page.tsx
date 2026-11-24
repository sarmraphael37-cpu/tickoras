import type { Metadata } from "next";
import { Banknote, Info, Wallet } from "lucide-react";
import { requestPayoutAction } from "@/app/actions/organizer";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
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
import { requireOrganizer } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/data/settings";
import {
  getOrganizerBalance,
  listOrganizerPayouts,
} from "@/lib/data/organizer";
import { formatDateTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Payouts" };

export default async function OrganizerPayoutsPage() {
  const viewer = await requireOrganizer("/organizer/payouts");
  const settings = await getPlatformSettings();

  if (!viewer.organizerId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Money"
          title="Payouts"
          description="An organizer profile is required to request payouts."
        />
        <Alert tone="warning">No organizer profile is linked to your account.</Alert>
      </div>
    );
  }

  const [payouts, balance] = await Promise.all([
    listOrganizerPayouts(viewer.organizerId),
    getOrganizerBalance(viewer.organizerId),
  ]);

  const pending = payouts
    .filter((payout) => ["requested", "approved", "processing"].includes(payout.status))
    .reduce((sum, payout) => sum + payout.amountXaf, 0);
  const paid = payouts
    .filter((payout) => payout.status === "paid")
    .reduce((sum, payout) => sum + payout.amountXaf, 0);
  const canRequest = balance >= settings.payoutMinimum;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Payouts"
        description="Move confirmed ticket revenue from your TICKORA balance to your mobile money or bank account."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Available"
          value={formatXAF(balance)}
          hint={`minimum ${formatXAF(settings.payoutMinimum)}`}
          icon={Wallet}
        />
        <StatCard
          label="In progress"
          value={formatXAF(pending)}
          hint="requested, approved or processing"
          icon={Banknote}
        />
        <StatCard
          label="Paid out"
          value={formatXAF(paid)}
          hint="settled payouts"
          icon={Banknote}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Request a payout</CardTitle>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Requests are reviewed by TICKORA before funds are sent. You can request
              up to your available balance.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {!canRequest ? (
              <Alert tone="info" className="mb-4">
                Your available balance is below the {formatXAF(settings.payoutMinimum)}{" "}
                minimum. Keep selling tickets and check back.
              </Alert>
            ) : null}

            <ActionForm
              action={requestPayoutAction}
              submitLabel="Request payout"
              pendingLabel="Requesting…"
              className="space-y-4"
            >
              <div>
                <Label htmlFor="payout-amount">Amount (XAF)</Label>
                <Input
                  id="payout-amount"
                  name="amount"
                  type="number"
                  min={settings.payoutMinimum}
                  max={Math.max(0, Math.floor(balance))}
                  step={1}
                  placeholder={String(settings.payoutMinimum)}
                  required
                  disabled={!canRequest}
                />
              </div>
              <div>
                <Label htmlFor="payout-method">Method</Label>
                <Select
                  id="payout-method"
                  name="method"
                  defaultValue="mtn_momo"
                  disabled={!canRequest}
                  required
                >
                  <option value="mtn_momo">MTN Mobile Money</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="bank_transfer">Bank transfer</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="payout-destination">Destination</Label>
                <Input
                  id="payout-destination"
                  name="destination"
                  placeholder="+237 6XX XXX XXX or account number"
                  maxLength={120}
                  required
                  disabled={!canRequest}
                />
                <p className="mt-1.5 text-[10px] leading-4 text-muted">
                  Use the exact number or account name registered to you. Incorrect
                  details delay payouts.
                </p>
              </div>
            </ActionForm>

            <p className="mt-4 flex items-start gap-1.5 border-t border-line pt-3 text-[10px] leading-4 text-muted">
              <Info className="mt-px h-3 w-3 shrink-0" />
              Automated mobile money payouts are not enabled yet. Approved payouts are
              settled manually and marked paid with a provider reference.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout history</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {payouts.length === 0 ? (
              <p className="px-5 pb-6 text-[12px] text-muted sm:px-6">
                No payouts requested yet.
              </p>
            ) : (
              <TableContainer>
                <THead>
                  <TH>Amount</TH>
                  <TH>Method</TH>
                  <TH>Destination</TH>
                  <TH>Reference</TH>
                  <TH>Requested</TH>
                  <TH>Status</TH>
                </THead>
                <TBody>
                  {payouts.map((payout) => (
                    <TR key={payout.id}>
                      <TD className="whitespace-nowrap font-semibold">
                        {formatXAF(payout.amountXaf)}
                      </TD>
                      <TD className="text-[12px] capitalize">
                        {payout.method.replace("_", " ")}
                      </TD>
                      <TD className="max-w-[180px] truncate text-[11px] text-muted">
                        {payout.destination}
                      </TD>
                      <TD>
                        <span className="font-mono text-[10px] text-muted">
                          {payout.reference ?? "—"}
                        </span>
                      </TD>
                      <TD className="whitespace-nowrap text-[11px] text-muted">
                        {formatDateTime(payout.createdAt)}
                      </TD>
                      <TD>
                        <StatusBadge kind="payout" status={payout.status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
