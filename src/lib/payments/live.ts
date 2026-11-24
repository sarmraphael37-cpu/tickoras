import type { PaymentProviderAdapter } from "@/lib/payments/types";

const pendingReason =
  "Integration scaffolded. Provider credentials, API contract and signature verification must be completed before go-live.";

/**
 * Real payment adapters deliberately refuse to produce fake successes.
 * They are enabled only once a provider-specific implementation, server-side
 * signature verification and reconciliation job have been completed.
 */
export const mtnMomoAdapter: PaymentProviderAdapter = {
  id: "mtn_momo",
  name: "MTN Mobile Money",
  description: "MTN MoMo collection for Cameroon (XAF).",
  mode: "live",
  isConfigured: false,
  supportsRefunds: false,
  unavailableReason: pendingReason,
  async initiate() {
    throw new Error(pendingReason);
  },
  async parseWebhook() {
    throw new Error(pendingReason);
  },
};

export const orangeMoneyAdapter: PaymentProviderAdapter = {
  id: "orange_money",
  name: "Orange Money",
  description: "Orange Money Web Payment for Cameroon (XAF).",
  mode: "live",
  isConfigured: false,
  supportsRefunds: false,
  unavailableReason: pendingReason,
  async initiate() {
    throw new Error(pendingReason);
  },
  async parseWebhook() {
    throw new Error(pendingReason);
  },
};

export const cardPaymentAdapter: PaymentProviderAdapter = {
  id: "card",
  name: "Card payment",
  description: "Visa and Mastercard processing through a PCI-compliant provider.",
  mode: "live",
  isConfigured: false,
  supportsRefunds: false,
  unavailableReason: pendingReason,
  async initiate() {
    throw new Error(pendingReason);
  },
  async parseWebhook() {
    throw new Error(pendingReason);
  },
};
