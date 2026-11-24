import { describe, expect, it } from "vitest";
import { demoPaymentAdapter } from "@/lib/payments/demo";
import {
  cardPaymentAdapter,
  mtnMomoAdapter,
  orangeMoneyAdapter,
} from "@/lib/payments/live";
import { friendlyDbError } from "@/lib/errors";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/domain";

describe("payment adapters", () => {
  it("marks the demo adapter as demo and configured", () => {
    expect(demoPaymentAdapter.mode).toBe("demo");
    expect(demoPaymentAdapter.isConfigured).toBe(true);
    expect(demoPaymentAdapter.supportsRefunds).toBe(true);
  });

  it("rejects webhooks for demo payments", async () => {
    const verification = await demoPaymentAdapter.parseWebhook(
      "{}",
      new Headers(),
    );
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain("do not accept webhooks");
  });

  it("keeps live adapters unconfigured until providers are verified", () => {
    for (const adapter of [mtnMomoAdapter, orangeMoneyAdapter, cardPaymentAdapter]) {
      expect(adapter.mode).toBe("live");
      expect(adapter.isConfigured).toBe(false);
      expect(adapter.unavailableReason).toContain("signature verification");
    }
  });

  it("does not fabricate live payment successes", async () => {
    await expect(
      mtnMomoAdapter.initiate({
        bookingId: "00000000-0000-4000-8000-000000000000",
        bookingReference: "TKT-TEST",
        amountXaf: 10_000,
        attendeeName: "Test Attendee",
        attendeeEmail: "test@example.com",
        attendeePhone: null,
        returnUrl: "https://example.com/return",
        callbackUrl: "https://example.com/callback",
      }),
    ).rejects.toThrow(/credentials/i);
  });

  it("maps provider keys to display labels", () => {
    expect(PAYMENT_PROVIDER_LABELS.demo).toBe("Demo payment");
    expect(PAYMENT_PROVIDER_LABELS.mtn_momo).toBe("MTN Mobile Money");
    expect(PAYMENT_PROVIDER_LABELS.orange_money).toBe("Orange Money");
    expect(PAYMENT_PROVIDER_LABELS.card).toBe("Card payment");
  });

  it("maps payment error codes to safe messages", () => {
    expect(friendlyDbError({ message: "PAYMENT_ALREADY_COMPLETE" })).toContain(
      "already been paid",
    );
    expect(friendlyDbError({ message: "SALES_CLOSED" })).toContain("not open");
    expect(friendlyDbError({ code: "42501" })).toContain("permission");
  });
});
