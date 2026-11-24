import { NextResponse } from "next/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Status = "ok" | "degraded" | "error";

async function check(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    return { status: "ok" as Status };
  } catch (error) {
    console.error(`[tickora] health ${label}:`, error);
    return { status: "error" as Status };
  }
}

/**
 * Public health probe. Reports component status only — never credentials,
 * row data, or internal error details.
 */
export async function GET() {
  const checks: Record<string, { status: Status }> = {
    app: { status: "ok" },
  };

  checks.supabase = isSupabaseConfigured
    ? await check("supabase", async () => {
        const supabase = await createClient();
        const { error } = await supabase
          .from("categories")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
      })
    : { status: "error" };

  checks.database = checks.supabase.status === "ok"
    ? await check("database", async () => {
        const supabase = await createClient();
        const { error } = await supabase
          .from("platform_settings")
          .select("key", { count: "exact", head: true })
          .limit(1);
        if (error) throw error;
      })
    : { status: "error" };

  checks.storage = await check("storage", async () => {
    const admin = createAdminClient();
    const { error } = await admin.storage.listBuckets();
    if (error) throw error;
  });

  const overall: Status = Object.values(checks).every((c) => c.status === "ok")
    ? "ok"
    : Object.values(checks).some((c) => c.status === "ok")
      ? "degraded"
      : "error";

  return NextResponse.json(
    {
      status: overall,
      service: "tickora",
      siteUrl,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: overall === "error" ? 503 : 200 },
  );
}
