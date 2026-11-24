import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Release tickets held by unpaid bookings once the reservation window lapses.
 * Call from a scheduler with `Authorization: Bearer $CRON_SECRET`.
 */
async function handle(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET is not configured. Set it in the environment before scheduling this route.",
      },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("expire_stale_bookings", {
      p_limit: 200,
    });
    if (error) {
      console.error("[tickora] expire_stale_bookings:", error.message);
      return NextResponse.json(
        { error: "Could not expire stale reservations." },
        { status: 500 },
      );
    }
    return NextResponse.json({
      expired: Number(data ?? 0),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[tickora] cron auth:", error);
    return NextResponse.json(
      { error: "Server is not configured for privileged operations." },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
