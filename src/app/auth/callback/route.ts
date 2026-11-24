import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeRedirect } from "@/lib/utils";

export const dynamic = "force-dynamic";

function loginError(request: NextRequest, reason: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirect(searchParams.get("next"), "");

  if (!isSupabaseConfigured) return loginError(request, "not_configured");

  const supabase = await createClient();
  let authenticated = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authenticated = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    authenticated = !error;
  }

  if (!authenticated) return loginError(request, "link_expired");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return loginError(request, "link_expired");

  let destination = next;
  if (!destination) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((row) => row.role as string));
    destination = roleSet.has("admin")
      ? "/admin"
      : roleSet.has("organizer")
        ? "/organizer"
        : "/attendee";
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const requestHost = request.headers.get("host") ?? "";
  if (isLocal) {
    return NextResponse.redirect(`${origin}${destination}`);
  }
  // Only trust the forwarded host when it matches the actual request host —
  // otherwise a spoofed header could turn this into an open redirect.
  if (forwardedHost && forwardedHost === requestHost) {
    return NextResponse.redirect(`https://${forwardedHost}${destination}`);
  }
  return NextResponse.redirect(`${origin}${destination}`);
}
