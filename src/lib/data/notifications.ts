import "server-only";

import type { NotificationRow } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, href, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[tickora] notifications:", error.message);
    return [];
  }
  return (data ?? []) as NotificationRow[];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
