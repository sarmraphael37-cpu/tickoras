import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Service-role client. NEVER import this into a Client Component.
 * Used only for webhooks, cron jobs and privileged admin operations.
 */
export function createAdminClient() {
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for admin access.");
  }
  return createClient<Database>(supabaseUrl, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
