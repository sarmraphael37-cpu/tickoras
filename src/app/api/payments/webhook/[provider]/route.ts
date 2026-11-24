import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentProvider } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDERS: PaymentProvider[] = [
  "mtn_momo",
  "orange_money",
  "card",
];

function signatureIsValid(body: string, header: string, secret: string): boolean {
  const supplied = header.startsWith("sha256=")
    ? header.slice("sha256=".length)
    : header;
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(supplied.toLowerCase(), "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Idempotent webhook intake. Events are recorded only after HMAC verification.
 * No payment or booking status is changed until a provider-specific parser and
 * reconciliation job are implemented; real providers remain unconfigured.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as PaymentProvider)) {
    return NextResponse.json(
      {
        error:
          provider === "demo"
            ? "Demo payments settle in-process and do not send webhooks."
            : "Unknown payment provider.",
      },
      { status: 404 },
    );
  }

  const adapter = getPaymentProvider(provider as PaymentProvider);

  // MTN MoMo callbacks carry no shared-secret signature. Authenticity is
  // proven by querying the provider's status API server-side and matching
  // reference + amount against our payment record before finalizing.
  if (provider === "mtn_momo") {
    return handleMtnWebhook(request, adapter, provider as PaymentProvider);
  }

  if (!adapter.isConfigured || !env.PAYMENT_WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        error:
          "Webhook intake is disabled. Provider credentials, contract and shared secret must be configured and verified before go-live.",
        provider: adapter.name,
      },
      { status: 503 },
    );
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";
  if (!signatureIsValid(body, signature, env.PAYMENT_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const externalEventId = request.headers.get("x-webhook-event-id")?.trim();
  if (!externalEventId || externalEventId.length > 200) {
    return NextResponse.json(
      { error: "A valid x-webhook-event-id header is required." },
      { status: 400 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("payment_webhook_events").insert({
      provider,
      external_event_id: externalEventId,
      payload: payload as never,
      signature_valid: true,
      processed_at: null,
      processing_error:
        "Provider parser not configured; event recorded for reconciliation only.",
    });
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error("[tickora] webhook insert:", error.message);
      return NextResponse.json(
        { error: "Could not record this webhook event." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { received: true, duplicate: false, reconciled: false },
      { status: 202 },
    );
  } catch (error) {
    console.error("[tickora] webhook admin client:", error);
    return NextResponse.json(
      { error: "Server is not configured for privileged operations." },
      { status: 503 },
    );
  }
}

/**
 * MTN MoMo webhook: record the event, then reconcile against the provider's
 * authoritative status endpoint. A callback alone never confirms payment.
 */
async function handleMtnWebhook(
  request: NextRequest,
  adapter: ReturnType<typeof getPaymentProvider>,
  provider: PaymentProvider,
) {
  if (!adapter.isConfigured || !isSupabaseConfigured) {
    return NextResponse.json(
      { error: "MTN MoMo is not configured on this deployment." },
      { status: 503 },
    );
  }

  const body = await request.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(body);
  } catch {
    payload = { raw: body.slice(0, 2000) };
  }

  const verification = await adapter.parseWebhook(body, request.headers);
  const reference = verification.providerReference;

  try {
    const supabase = createAdminClient();

    // Persist the callback for audit before doing anything else.
    await supabase.from("payment_webhook_events").insert({
      provider,
      external_event_id: reference ?? `momo-${Date.now()}`,
      payload: payload as never,
      signature_valid: verification.valid,
      processed_at: null,
      processing_error: verification.valid
        ? null
        : (verification.reason ?? "Verification failed"),
    });

    if (!verification.valid || !reference) {
      return NextResponse.json(
        { error: verification.reason ?? "Could not verify this callback." },
        { status: 401 },
      );
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("id, booking_id, amount_xaf, status")
      .eq("provider", "mtn_momo")
      .eq("provider_reference", reference)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json(
        { error: "Unknown payment reference." },
        { status: 404 },
      );
    }

    if (
      verification.amountXaf !== null &&
      verification.amountXaf !== payment.amount_xaf
    ) {
      console.error(
        `[tickora] MTN amount mismatch ref=${reference} remote=${verification.amountXaf} expected=${payment.amount_xaf}`,
      );
      return NextResponse.json(
        { error: "Amount mismatch — flagged for review." },
        { status: 409 },
      );
    }

    if (verification.status === "succeeded") {
      const { error } = await supabase.rpc("process_verified_payment", {
        p_payment_id: payment.id,
        p_provider_reference: reference,
        p_payload: {
          source: "mtn_momo_webhook",
          callback: payload as never,
        },
      });
      if (error) {
        console.error("[tickora] MTN finalize:", error.message);
        return NextResponse.json(
          { error: "Verification succeeded but finalization failed." },
          { status: 500 },
        );
      }
    } else if (verification.status === "failed") {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          failure_reason: verification.reason ?? "Provider reported failure.",
        })
        .eq("id", payment.id)
        .in("status", ["pending", "initiated", "requires_action"]);
    }

    return NextResponse.json({ received: true, status: verification.status });
  } catch (error) {
    console.error("[tickora] MTN webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
