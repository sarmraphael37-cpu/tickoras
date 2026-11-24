import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sign-out endpoint.
 *
 * A plain route handler is used instead of a Server Action so stale action IDs
 * after a dev restart cannot break the header's sign-out form.
 */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
