import type {
  PaymentInitContext,
  PaymentInitResult,
  PaymentProviderAdapter,
  WebhookVerification,
} from "@/lib/payments/types";
import type { PaymentStatus } from "@/types/database";

/**
 * MTN Mobile Money Collections adapter (Cameroon, XAF).
 *
 * Implements the official MoMo Collections API:
 *   POST {base}/collection/token/                 — OAuth2 client credentials
 *   POST {base}/collection/v1_0/requesttopay       — push payment prompt to payer
 *   GET  {base}/collection/v1_0/requesttopay/{ref} — authoritative status
 *
 * Authentication model: MTN callbacks carry no signature we can verify, so a
 * webhook is NEVER trusted on its own. Every confirmation — webhook or
 * user-initiated refresh — is reconciled by querying the status endpoint
 * server-side and comparing amount + reference against our payment record.
 *
 * Required env (server-only, never NEXT_PUBLIC_):
 *   MTN_MOMO_API_URL            e.g. https://sandbox.momodeveloper.mtn.com
 *   MTN_MOMO_API_USER           API user from the MoMo developer portal
 *   MTN_MOMO_API_KEY            API key from the MoMo developer portal
 *   MTN_MOMO_SUBSCRIPTION_KEY   Ocp-Apim-Subscription-Key product key
 *   MTN_MOMO_TARGET_ENVIRONMENT "sandbox" (default) or "mtn" for production
 */

const API_URL = process.env.MTN_MOMO_API_URL?.replace(/\/$/, "") ?? "";
const API_USER = process.env.MTN_MOMO_API_USER ?? "";
const API_KEY = process.env.MTN_MOMO_API_KEY ?? "";
const SUBSCRIPTION_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? "";
const TARGET_ENVIRONMENT =
  process.env.MTN_MOMO_TARGET_ENVIRONMENT === "mtn" ? "mtn" : "sandbox";

const isConfigured = Boolean(
  API_URL && API_USER && API_KEY && SUBSCRIPTION_KEY,
);

const unavailableReason = isConfigured
  ? undefined
  : "MTN MoMo credentials are not configured. Set MTN_MOMO_API_URL, MTN_MOMO_API_USER, MTN_MOMO_API_KEY and MTN_MOMO_SUBSCRIPTION_KEY.";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");
  const response = await fetch(`${API_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`MTN MoMo token request failed (${response.status}).`);
  }
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!payload.access_token) {
    throw new Error("MTN MoMo token response had no access_token.");
  }
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

function authHeaders(referenceId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${cachedToken?.value ?? ""}`,
    "X-Reference-Id": referenceId,
    "X-Target-Environment": TARGET_ENVIRONMENT,
    "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
    "Content-Type": "application/json",
  };
}

const MOMO_STATUS_MAP: Record<string, PaymentStatus> = {
  PENDING: "pending",
  SUCCESSFUL: "succeeded",
  FAILED: "failed",
};

interface MomoStatusResponse {
  status?: string;
  amount?: string;
  currency?: string;
  financialTransactionId?: string;
  reason?: { message?: string };
}

async function fetchTransactionStatus(reference: string): Promise<{
  status: PaymentStatus;
  amountXaf: number | null;
  reason?: string;
}> {
  const token = await getAccessToken();
  void token;
  const response = await fetch(
    `${API_URL}/collection/v1_0/requesttopay/${encodeURIComponent(reference)}`,
    { headers: authHeaders(reference), cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`MTN MoMo status request failed (${response.status}).`);
  }
  const payload = (await response.json()) as MomoStatusResponse;
  const mapped = MOMO_STATUS_MAP[payload.status ?? ""] ?? "pending";
  return {
    status: mapped,
    amountXaf:
      payload.amount !== undefined ? Number.parseInt(payload.amount, 10) : null,
    reason: payload.reason?.message,
  };
}

export const mtnMomoAdapter: PaymentProviderAdapter = {
  id: "mtn_momo",
  name: "MTN Mobile Money",
  description:
    "Approve the payment prompt sent to your MTN MoMo line. XAF only.",
  mode: "live",
  isConfigured,
  supportsRefunds: false,
  unavailableReason,

  async initiate(context: PaymentInitContext): Promise<PaymentInitResult> {
    if (!isConfigured) {
      throw new Error(unavailableReason);
    }
    const phone = (context.attendeePhone ?? "").replace(/[^\d+]/g, "");
    if (!phone) {
      throw new Error(
        "An MTN MoMo number is required. Add your phone number to your profile and try again.",
      );
    }
    const token = await getAccessToken();
    void token;

    const reference = context.providerReference;
    const response = await fetch(`${API_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: authHeaders(reference),
      cache: "no-store",
      body: JSON.stringify({
        amount: String(context.amountXaf),
        currency: "XAF",
        externalId: context.bookingReference,
        payer: {
          partyIdType: "MSISDN",
          partyId: phone,
        },
      }),
    });

    if (response.status === 202) {
      return {
        providerReference: reference,
        status: "pending",
        requiresRedirect: false,
        message:
          "Payment request sent. Check your phone and approve the MTN MoMo prompt.",
      };
    }
    if (response.status === 409) {
      // A request for this reference already exists — reuse it.
      return {
        providerReference: reference,
        status: "pending",
        requiresRedirect: false,
        message:
          "A payment request is already pending for this booking. Approve it on your phone.",
      };
    }
    const detail = await response.text().catch(() => "");
    throw new Error(
      `MTN MoMo could not start the payment (${response.status}). ${detail.slice(0, 200)}`,
    );
  },

  async getPaymentStatus(providerReference: string) {
    if (!isConfigured) {
      throw new Error(unavailableReason);
    }
    return fetchTransactionStatus(providerReference);
  },

  async parseWebhook(
    _rawBody: string,
    headers: Headers,
  ): Promise<WebhookVerification> {
    if (!isConfigured) {
      return {
        valid: false,
        externalEventId: null,
        providerReference: null,
        amountXaf: null,
        status: null,
        reason: unavailableReason,
      };
    }
    const reference =
      headers.get("x-reference-id") ?? headers.get("X-Reference-Id") ?? "";
    if (!reference) {
      return {
        valid: false,
        externalEventId: null,
        providerReference: null,
        amountXaf: null,
        status: null,
        reason: "Missing X-Reference-Id header.",
      };
    }
    try {
      const result = await fetchTransactionStatus(reference);
      return {
        valid: true,
        externalEventId: null,
        providerReference: reference,
        amountXaf: result.amountXaf,
        status: result.status,
        reason: result.reason,
      };
    } catch (error) {
      return {
        valid: false,
        externalEventId: null,
        providerReference: reference,
        amountXaf: null,
        status: null,
        reason: error instanceof Error ? error.message : "Status check failed.",
      };
    }
  },
};
