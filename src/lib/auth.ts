import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { AppRole } from "@/types/database";
import type { Viewer } from "@/lib/domain";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/utils";

const ROLE_PRIORITY: AppRole[] = ["admin", "organizer", "scanner", "attendee"];

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const [{ data: profile }, { data: roleRows }, { data: organizer }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, is_suspended")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase
        .from("organizers")
        .select("id, name, status")
        .eq("owner_id", user.id)
        .maybeSingle(),
    ]);

  const roles = (roleRows ?? [])
    .map((row) => row.role)
    .filter((role): role is AppRole =>
      ["attendee", "organizer", "admin", "scanner"].includes(role),
    );

  if (roles.length === 0) roles.push("attendee");

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName:
      profile?.full_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "TICKORA member",
    avatarUrl: profile?.avatar_url ?? null,
    phone: profile?.phone ?? null,
    roles,
    organizerId: organizer?.id ?? null,
    organizerStatus: organizer?.status ?? null,
    organizerName: organizer?.name ?? null,
    isSuspended: profile?.is_suspended ?? false,
  };
});

export function primaryRole(viewer: Viewer): AppRole {
  return ROLE_PRIORITY.find((role) => viewer.roles.includes(role)) ?? "attendee";
}

export function dashboardPathFor(viewer: Viewer): string {
  switch (primaryRole(viewer)) {
    case "admin":
      return "/admin";
    case "organizer":
      return "/organizer";
    case "service_provider":
      return viewer.roles.includes("organizer")
        ? "/organizer"
        : "/provider";
    case "scanner":
      return viewer.roles.includes("attendee") ? "/attendee" : "/scanner";
    default:
      return "/attendee";
  }
}

export async function requireViewer(nextPath = "/"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(safeRedirect(nextPath))}`);
  }
  if (viewer.isSuspended) {
    redirect("/account-suspended");
  }
  return viewer;
}

export async function requireRole(
  allowed: AppRole[],
  nextPath = "/",
): Promise<Viewer> {
  const viewer = await requireViewer(nextPath);
  if (!allowed.some((role) => viewer.roles.includes(role))) {
    redirect("/unauthorized");
  }
  return viewer;
}

export async function requireAdmin(nextPath = "/admin"): Promise<Viewer> {
  return requireRole(["admin"], nextPath);
}

export async function requireOrganizer(nextPath = "/organizer"): Promise<Viewer> {
  return requireRole(["organizer"], nextPath);
}
