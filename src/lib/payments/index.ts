import "server-only";

import type { PaymentProvider } from "@/types/database";
import { demoPaymentAdapter } from "@/lib/payments/demo";
import { mtnMomoAdapter } from "@/lib/payments/mtn";
import { cardPaymentAdapter, orangeMoneyAdapter } from "@/lib/payments/live";
import type { PaymentProviderAdapter } from "@/lib/payments/types";

const adapters: Record<PaymentProvider, PaymentProviderAdapter> = {
  demo: demoPaymentAdapter,
  mtn_momo: mtnMomoAdapter,
  orange_money: orangeMoneyAdapter,
  card: cardPaymentAdapter,
};

export function getPaymentProvider(provider: PaymentProvider) {
  return adapters[provider];
}

export const isDemoPaymentEnabled =
  process.env.DEMO_PAYMENTS_ENABLED === "true" ||
  process.env.NODE_ENV !== "production";

export interface PaymentMethodOption {
  id: PaymentProvider;
  name: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  isDemo: boolean;
}

export function getPaymentMethodOptions(): PaymentMethodOption[] {
  return (Object.keys(adapters) as PaymentProvider[]).map((id) => {
    const adapter = adapters[id];
    const demoBlocked = id === "demo" && !isDemoPaymentEnabled;
    return {
      id,
      name: adapter.name,
      description: adapter.description,
      available: adapter.isConfigured && !demoBlocked,
      unavailableReason: demoBlocked
        ? "Demo payments are disabled in this environment."
        : adapter.unavailableReason,
      isDemo: adapter.mode === "demo",
    };
  });
}
