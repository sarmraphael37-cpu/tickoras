import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface PlatformSettings {
  serviceFeePercent: number;
  minServiceFee: number;
  reservationMinutes: number;
  payoutMinimum: number;
  supportEmail: string;
  platformName: string;
  demoPaymentsEnabled: boolean;
}

export const defaultPlatformSettings: PlatformSettings = {
  serviceFeePercent: 5,
  minServiceFee: 200,
  reservationMinutes: 15,
  payoutMinimum: 10000,
  supportEmail: "support@tickora.cm",
  platformName: "TICKORA",
  demoPaymentsEnabled: false,
};

function numberValue(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (!isSupabaseConfigured) return defaultPlatformSettings;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("platform_settings").select("key, value");
    const map = new Map((data ?? []).map((row) => [row.key, row.value]));
    return {
      serviceFeePercent: numberValue(
        map.get("service_fee_percent"),
        defaultPlatformSettings.serviceFeePercent,
      ),
      minServiceFee: numberValue(
        map.get("min_service_fee"),
        defaultPlatformSettings.minServiceFee,
      ),
      reservationMinutes: numberValue(
        map.get("reservation_minutes"),
        defaultPlatformSettings.reservationMinutes,
      ),
      payoutMinimum: numberValue(
        map.get("payout_minimum"),
        defaultPlatformSettings.payoutMinimum,
      ),
      supportEmail:
        typeof map.get("support_email") === "string"
          ? (map.get("support_email") as string)
          : defaultPlatformSettings.supportEmail,
      platformName:
        typeof map.get("platform_name") === "string"
          ? (map.get("platform_name") as string)
          : defaultPlatformSettings.platformName,
      demoPaymentsEnabled:
        map.get("demo_payments_enabled") === true ||
        map.get("demo_payments_enabled") === "true",
    };
  } catch {
    return defaultPlatformSettings;
  }
}
