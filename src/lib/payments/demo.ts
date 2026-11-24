import { randomUUID } from "node:crypto";
import type {
  PaymentInitResult,
  PaymentProviderAdapter,
  WebhookVerification,
} from "@/lib/payments/types";

/**
 * DEMO provider.
 *
 * It never touches a payment network and never represents real money. A payment
 * created through this adapter is flagged `is_demo = true` in the database and
 * is confirmed exclusively by a server-side RPC. It is disabled in production
 * unless DEMO_PAYMENTS_ENABLED=true is explicitly set.
 */
export const demoPaymentAdapter: PaymentProviderAdapter = {
  id: "demo",
  name: "Demo payment",
  description:
    "Test checkout for development. No money moves and tickets are marked as demo.",
  mode: "demo",
  isConfigured: true,
  supportsRefunds: true,

  async initiate(): Promise<PaymentInitResult> {
    return {
      providerReference: `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: "pending",
      requiresRedirect: false,
      message: "Demo payment — no real money will be charged.",
    };
  },

  async parseWebhook(): Promise<WebhookVerification> {
    // Demo payments are confirmed through the authenticated server action, not
    // a webhook. Reject any attempt to treat a public request as a demo payment.
    return {
      valid: false,
      externalEventId: null,
      providerReference: null,
      amountXaf: null,
      status: null,
      reason: "Demo payments do not accept webhooks.",
    };
  },
};
