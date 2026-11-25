import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Za-z0-9_-]{3,32}$/;

/** Referral link tracker: /r/CODE → records click, redirects to event. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!CODE_RE.test(code) || !isSupabaseConfigured) {
    return NextResponse.redirect(`${base}/events`, 302);
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("resolve_marketing_code", {
    p_code: code,
  });
  const resolved = data as {
    kind?: string;
    event_slug?: string;
  } | null;

  if (resolved?.kind === "referral" && resolved.event_slug) {
    // Best-effort click tracking — never block the redirect on failure.
    void supabase.rpc("track_marketing_click", { p_code: code });
    return NextResponse.redirect(
      `${base}/events/${resolved.event_slug}?ref=${encodeURIComponent(code.toUpperCase())}`,
      302,
    );
  }

  return NextResponse.redirect(`${base}/events`, 302);
}
