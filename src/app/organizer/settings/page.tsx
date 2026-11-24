import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  CreditCard,
  HelpCircle,
  Percent,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrganizer } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/data/settings";
import { formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function OrganizerSettingsPage() {
  await requireOrganizer("/organizer/settings");
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Settings"
        description="Platform rules that affect your events, and links to the account settings you control."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Platform terms</CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              Managed by TICKORA administrators. These apply to every event.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="divide-y divide-line rounded-xl border border-line">
              <div className="flex items-start justify-between gap-4 px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <Percent className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
                  <div>
                    <dt className="text-[12.5px] font-medium text-ink">
                      Service fee
                    </dt>
                    <dd className="mt-0.5 text-[10.5px] leading-4 text-muted">
                      Added to the attendee&apos;s total at checkout and retained by
                      TICKORA. It does not reduce your ticket revenue.
                    </dd>
                  </div>
                </div>
                <dd className="shrink-0 text-[12px] font-semibold text-ink">
                  {settings.serviceFeePercent}% (min{" "}
                  {formatXAF(settings.minServiceFee)})
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4 px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
                  <div>
                    <dt className="text-[12.5px] font-medium text-ink">
                      Reservation window
                    </dt>
                    <dd className="mt-0.5 text-[10.5px] leading-4 text-muted">
                      Seats are held for this long while an attendee pays. Unpaid
                      reservations are released automatically.
                    </dd>
                  </div>
                </div>
                <dd className="shrink-0 text-[12px] font-semibold text-ink">
                  {settings.reservationMinutes} min
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4 px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
                  <div>
                    <dt className="text-[12.5px] font-medium text-ink">
                      Payout minimum
                    </dt>
                    <dd className="mt-0.5 text-[10.5px] leading-4 text-muted">
                      The smallest balance you can request at once.
                    </dd>
                  </div>
                </div>
                <dd className="shrink-0 text-[12px] font-semibold text-ink">
                  {formatXAF(settings.payoutMinimum)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4 px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
                  <div>
                    <dt className="text-[12.5px] font-medium text-ink">
                      Payment providers
                    </dt>
                    <dd className="mt-0.5 text-[10.5px] leading-4 text-muted">
                      Demo payments are clearly marked test transactions. MTN MoMo,
                      Orange Money and card stay disabled until production credentials
                      and webhook signatures are configured.
                    </dd>
                  </div>
                </div>
                <dd className="shrink-0">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                      settings.demoPaymentsEnabled
                        ? "bg-warning/15 text-warning"
                        : "bg-surface text-muted"
                    }`}
                  >
                    {settings.demoPaymentsEnabled
                      ? "Demo enabled"
                      : "Demo disabled"}
                  </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Your controls
            </p>
            <ul className="mt-3 space-y-2 text-[11.5px]">
              <li>
                <Link
                  href="/organizer/profile"
                  className="flex items-center justify-between gap-2 text-ink hover:text-accent-200"
                >
                  Organizer profile
                  <ArrowUpRight className="h-3 w-3 text-muted" />
                </Link>
              </li>
              <li>
                <Link
                  href="/organizer/payouts"
                  className="flex items-center justify-between gap-2 text-ink hover:text-accent-200"
                >
                  Payouts & destinations
                  <ArrowUpRight className="h-3 w-3 text-muted" />
                </Link>
              </li>
              <li>
                <Link
                  href="/organizer/staff"
                  className="flex items-center justify-between gap-2 text-ink hover:text-accent-200"
                >
                  Door team access
                  <ArrowUpRight className="h-3 w-3 text-muted" />
                </Link>
              </li>
              <li>
                <Link
                  href="/attendee/security"
                  className="flex items-center justify-between gap-2 text-ink hover:text-accent-200"
                >
                  Password & session
                  <ArrowUpRight className="h-3 w-3 text-muted" />
                </Link>
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-accent-300" />
              Publishing policy
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Events must be reviewed by TICKORA before going live. Once published,
              event details are locked to protect buyers. Contact support for
              exceptional changes.
            </p>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <HelpCircle className="h-4 w-4 text-accent-300" />
              Need help?
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Email{" "}
              <a
                href={`mailto:${settings.supportEmail}`}
                className="font-medium text-accent-300 hover:underline"
              >
                {settings.supportEmail}
              </a>{" "}
              for approvals, payouts or event changes.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
