import type { Metadata } from "next";
import { CreditCard, Settings, ShieldCheck, Wallet } from "lucide-react";
import { updateSettingAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { listPlatformSettingRows } from "@/lib/data/admin";
import { getPaymentMethodOptions } from "@/lib/payments";
import { defaultPlatformSettings } from "@/lib/data/settings";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

type SettingKind = "number" | "boolean" | "text";

interface SettingField {
  key: string;
  label: string;
  description: string;
  kind: SettingKind;
  fallback: string;
  suffix?: string;
}

const FIELDS: SettingField[] = [
  {
    key: "service_fee_percent",
    label: "Service fee (%)",
    description: "Percentage added to ticket subtotals at checkout.",
    kind: "number",
    fallback: String(defaultPlatformSettings.serviceFeePercent),
    suffix: "%",
  },
  {
    key: "min_service_fee",
    label: "Minimum service fee",
    description: "Floor applied when the percentage is small.",
    kind: "number",
    fallback: String(defaultPlatformSettings.minServiceFee),
    suffix: "XAF",
  },
  {
    key: "reservation_minutes",
    label: "Reservation window",
    description: "Minutes an unpaid booking holds ticket inventory.",
    kind: "number",
    fallback: String(defaultPlatformSettings.reservationMinutes),
    suffix: "min",
  },
  {
    key: "payout_minimum",
    label: "Minimum payout",
    description: "Lowest amount an organizer can request.",
    kind: "number",
    fallback: String(defaultPlatformSettings.payoutMinimum),
    suffix: "XAF",
  },
  {
    key: "demo_payments_enabled",
    label: "Demo payments",
    description: "Allow the clearly-labelled demo provider outside development.",
    kind: "boolean",
    fallback: "false",
  },
  {
    key: "support_email",
    label: "Support email",
    description: "Shown on public help and contact pages.",
    kind: "text",
    fallback: defaultPlatformSettings.supportEmail,
  },
  {
    key: "support_phone",
    label: "Support phone",
    description: "Optional phone number for attendee support.",
    kind: "text",
    fallback: "",
  },
  {
    key: "platform_name",
    label: "Platform name",
    description: "The name used in transactional messages.",
    kind: "text",
    fallback: defaultPlatformSettings.platformName,
  },
];

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export default async function AdminSettingsPage() {
  await requireAdmin("/admin/settings");
  const rows = await listPlatformSettingRows();
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const paymentMethods = getPaymentMethodOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Settings"
        description="Numbers used by the live booking engine and the contact details shown across the public site."
      />

      <Alert tone="warning">
        Changing the reservation window or service fee changes how new bookings are
        priced and held. Existing confirmed bookings are never recalculated.
      </Alert>

      <div className="grid gap-5 lg:grid-cols-2">
        {FIELDS.map((field) => {
          const row = byKey.get(field.key);
          const current = row ? textValue(row.value) : field.fallback;
          const updatedAt = row?.updated_at;
          return (
            <Card key={field.key}>
              <CardHeader>
                <CardTitle className="text-[14px]">{field.label}</CardTitle>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  {field.description}
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <ActionForm
                  action={updateSettingAction}
                  hidden={{ key: field.key }}
                  submitLabel="Save setting"
                  pendingLabel="Saving…"
                  variant="outline"
                  className="space-y-3"
                >
                  <div>
                    <Label htmlFor={`setting-${field.key}`} className="sr-only">
                      {field.label}
                    </Label>
                    {field.kind === "boolean" ? (
                      <Select
                        id={`setting-${field.key}`}
                        name="value"
                        defaultValue={current === "true" ? "true" : "false"}
                        className="h-10 text-[12px]"
                      >
                        <option value="false">Disabled</option>
                        <option value="true">Enabled</option>
                      </Select>
                    ) : (
                      <div className="relative">
                        <Input
                          id={`setting-${field.key}`}
                          name="value"
                          type={field.kind === "number" ? "number" : "text"}
                          min={field.kind === "number" ? 0 : undefined}
                          step={field.kind === "number" ? "any" : undefined}
                          defaultValue={current}
                          placeholder={field.fallback}
                          className={cnWithSuffix(field.suffix)}
                          required
                        />
                        {field.suffix ? (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted">
                            {field.suffix}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <p className="font-mono text-[9.5px] text-muted">
                    key: {field.key}
                    {updatedAt
                      ? ` · updated ${formatDateTime(updatedAt)}`
                      : " · default value"}
                  </p>
                </ActionForm>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[14px]">
            <Wallet className="h-4 w-4 text-accent-300" />
            Payment providers
          </CardTitle>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            Live status read from the server environment. Provider credentials and
            webhook secrets are environment variables — they are never stored or
            editable here, so a dashboard compromise cannot alter payment routing.
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <ul className="divide-y divide-line">
            {paymentMethods.map((method) => (
              <li
                key={method.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-4 w-4 text-muted" />
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">
                      {method.name}
                      {method.isDemo ? (
                        <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
                          Demo
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[10.5px] text-muted">
                      {method.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={
                      method.available
                        ? "text-[11px] font-semibold text-success"
                        : "text-[11px] font-semibold text-muted"
                    }
                  >
                    {method.available ? "Available at checkout" : "Not configured"}
                  </p>
                  {!method.available && method.unavailableReason ? (
                    <p className="max-w-[260px] text-right text-[10px] leading-4 text-muted">
                      {method.unavailableReason}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-[10.5px] leading-4 text-muted">
            All amounts are denominated in XAF (Central African CFA franc). The
            currency is fixed by the payment providers and cannot be changed from
            the dashboard.
          </p>
        </CardContent>
      </Card>

      <div className="glass-subtle rounded-xl p-4 text-[11px] leading-5 text-muted">
        <p className="flex items-center gap-1.5 font-semibold text-ink">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-300" />
          What is not configurable here
        </p>
        <p className="mt-1.5">
          Payment provider credentials, webhook secrets and Supabase service keys are
          environment variables, never dashboard settings. Real payment providers stay
          disabled until their credentials and signatures are verified. Demo payments
          must also be permitted by the environment and are always labelled in the UI.
        </p>
        <p className="mt-1.5 flex items-center gap-1.5">
          <Settings className="h-3 w-3 shrink-0" />
          Values are stored in the allowlisted <code>platform_settings</code> table and
          written to the audit log.
        </p>
      </div>
    </div>
  );
}

function cnWithSuffix(suffix?: string): string {
  return suffix ? "pr-14 text-[12px]" : "text-[12px]";
}
