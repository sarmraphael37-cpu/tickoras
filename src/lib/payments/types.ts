import "server-only";

import type { PaymentProvider, PaymentStatus } from "@/types/database";

export interface PaymentInitContext {
  bookingId: string;
  bookingReference: string;
  /** Internal payment.provider_reference — used as the provider transaction id. */
  providerReference: string;
  amountXaf: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  returnUrl: string;
  callbackUrl: string;
}

export interface PaymentInitResult {
  providerReference: string;
  status: PaymentStatus;
  requiresRedirect: boolean;
  redirectUrl?: string;
  message?: string;
}

export interface WebhookVerification {
  valid: boolean;
  externalEventId: string | null;
  providerReference: string | null;
  amountXaf: number | null;
  status: PaymentStatus | null;
  reason?: string;
}

/**
 * Payment adapter contract. Every provider must prove authenticity on the
 * server before a booking can be confirmed. The browser never confirms money.
 */
export interface PaymentProviderAdapter {
  id: PaymentProvider;
  name: string;
  description: string;
  mode: "demo" | "live";
  isConfigured: boolean;
  supportsRefunds: boolean;
  unavailableReason?: string;
  initiate(context: PaymentInitContext): Promise<PaymentInitResult>;
  parseWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<WebhookVerification>;
  /**
   * Optional: query the provider for the authoritative status of a
   * transaction. Used for user-initiated status refreshes and webhook
   * reconciliation. Never trust a browser redirect as proof of payment.
   */
  getPaymentStatus?(providerReference: string): Promise<{
    status: PaymentStatus;
    amountXaf: number | null;
    reason?: string;
  }>;
}

export class PaymentProviderNotConfiguredError extends Error {
  constructor(provider: string, reason: string) {
    super(`${provider} is not configured: ${reason}`);
    this.name = "PaymentProviderNotConfiguredError";
  }
}
