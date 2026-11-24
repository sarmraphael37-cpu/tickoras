"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/utils";

export async function markNotificationRead(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured) return;
  const viewer = await requireViewer("/attendee/notifications");
  const id = String(formData.get("notification_id") ?? "");
  const path = safeRedirect(
    String(formData.get("path") ?? ""),
    "/attendee/notifications",
  );
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", viewer.id)
    .is("read_at", null);

  revalidatePath(path);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured) return;
  const viewer = await requireViewer("/attendee/notifications");
  const path = safeRedirect(
    String(formData.get("path") ?? ""),
    "/attendee/notifications",
  );

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", viewer.id)
    .is("read_at", null);

  revalidatePath(path);
  revalidatePath("/", "layout");
}
