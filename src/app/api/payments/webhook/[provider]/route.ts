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
