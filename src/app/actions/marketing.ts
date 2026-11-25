"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { requireOrganizer, requireViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------

const promoSchema = z.object({
  eventId: z.string().uuid().optional().or(z.literal("")),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,32}$/, "3–32 chars: letters, numbers, - _"),
  description: z.string().trim().max(300).optional().default(""),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.coerce.number().int().min(1).max(100_000_000),
  maxUses: z.coerce.number().int().min(1).max(1_000_000).optional().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  minOrderXaf: z.coerce.number().int().min(0).max(100_000_000).optional().default(0),
  startsAt: z.string().optional().default(""),
  endsAt: z.string().optional().default(""),
});

export async function createPromoCode(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireOrganizer("/organizer/marketing");
  if (!viewer.organizerId) return actionError("Organizer profile required.");
  const limited = rateLimit(`promo:${viewer.id}`, 20, 60_000);
  if (!limited.allowed) return actionError("Too many requests. Try again later.");

  const parsed = promoSchema.safeParse({
    eventId: formData.get("event_id") || undefined,
    code: formData.get("code"),
    description: formData.get("description") ?? "",
    discountType: formData.get("discount_type"),
    discountValue: formData.get("discount_value"),
    maxUses: formData.get("max_uses") ?? "",
    minOrderXaf: formData.get("min_order_xaf") ?? 0,
    startsAt: formData.get("starts_at") ?? "",
    endsAt: formData.get("ends_at") ?? "",
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid promo code.");
  }
  const d = parsed.data;
  if (d.discountType === "percent" && d.discountValue > 100) {
    return actionError("Percentage discounts cannot exceed 100%.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").insert({
    organizer_id: viewer.organizerId,
    event_id: d.eventId || null,
    code: d.code,
    description: d.description || null,
    discount_type: d.discountType,
    discount_value: d.discountValue,
    max_uses: d.maxUses,
    min_order_xaf: d.minOrderXaf,
    starts_at: d.startsAt ? new Date(d.startsAt).toISOString() : null,
    ends_at: d.endsAt ? new Date(d.endsAt).toISOString() : null,
  });
  if (error) return actionError(friendlyDbError(error, "Could not create promo code."));

  revalidatePath("/organizer/marketing");
  return actionSuccess(`Promo code ${d.code} created.`);
}

export async function setPromoStatus(formData: FormData) {
  if (!isSupabaseConfigured) return;
  const viewer = await requireOrganizer("/organizer/marketing");
  if (!viewer.organizerId) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["active", "paused"].includes(status)) return;
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase
    .from("promo_codes")
    .update({ status: status as "active" | "paused" })
    .eq("id", id)
    .eq("organizer_id", viewer.organizerId);
  revalidatePath("/organizer/marketing");
}

export async function deletePromoCode(formData: FormData) {
  if (!isSupabaseConfigured) return;
  const viewer = await requireOrganizer("/organizer/marketing");
  if (!viewer.organizerId) return;
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase
    .from("promo_codes")
    .delete()
    .eq("id", id)
    .eq("organizer_id", viewer.organizerId);
  revalidatePath("/organizer/marketing");
}

// ---------------------------------------------------------------------------
// Referral links (attendees)
// ---------------------------------------------------------------------------

function randomCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function getOrCreateReferralLink(
  eventId: string,
): Promise<{ code: string } | { error: string }> {
  if (!isSupabaseConfigured) return { error: "Supabase is not configured." };
  if (!z.string().uuid().safeParse(eventId).success) return { error: "Invalid event." };
  const viewer = await requireViewer("/events");
  const limited = rateLimit(`referral:${viewer.id}`, 10, 60_000);
  if (!limited.allowed) return { error: "Too many requests. Try again later." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("referral_links")
    .select("code")
    .eq("event_id", eventId)
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (existing) return { code: existing.code };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(8);
    const { error } = await supabase
      .from("referral_links")
      .insert({ event_id: eventId, user_id: viewer.id, code });
    if (!error) return { code };
    if (error.code !== "23505") {
      return { error: friendlyDbError(error, "Could not create referral link.") };
    }
  }
  return { error: "Could not generate a unique code. Try again." };
}

// ---------------------------------------------------------------------------
// Affiliates (organizer recruits; user self-registers for an organizer)
// ---------------------------------------------------------------------------

export async function registerAsAffiliate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/organizer/marketing");
  const organizerSlug = String(formData.get("organizer_slug") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const audienceSize = String(formData.get("audience_size") ?? "");

  if (displayName.length < 2) return actionError("Enter your display name.");

  const supabase = await createClient();
  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("slug", organizerSlug)
    .eq("status", "approved")
    .maybeSingle();
  if (!organizer) return actionError("Organizer not found.");

  // Prevent organizer self-affiliation
  const { data: orgRow } = await supabase
    .from("organizers")
    .select("owner_id")
    .eq("id", organizer.id)
    .single();
  if (orgRow?.owner_id === viewer.id) {
    return actionError("Organizers cannot affiliate with their own events.");
  }

  const limited = rateLimit(`affiliate:${viewer.id}`, 10, 60_000);
  if (!limited.allowed) return actionError("Too many requests. Try again later.");

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(8);
    const { error } = await supabase.from("affiliate_profiles").insert({
      user_id: viewer.id,
      organizer_id: organizer.id,
      display_name: displayName,
      platform: platform || null,
      audience_size: audienceSize ? Number(audienceSize) : null,
      code,
    });
    if (!error) {
      revalidatePath("/organizer/marketing");
      return actionSuccess(
        "Affiliate application submitted. The organizer will review it.",
      );
    }
    if (error.code === "23505") {
      const { data: dup } = await supabase
        .from("affiliate_profiles")
        .select("id, status")
        .eq("user_id", viewer.id)
        .eq("organizer_id", organizer.id)
        .maybeSingle();
      if (dup) {
        return actionError(
          `You already applied (${dup.status}). Contact the organizer.`,
        );
      }
      continue;
    }
    return actionError(friendlyDbError(error, "Could not submit application."));
  }
  return actionError("Could not generate a unique code. Try again.");
}

export async function setAffiliateStatus(
  affiliateId: string,
  status: "approved" | "rejected" | "suspended",
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireOrganizer("/organizer/marketing");
  if (!viewer.organizerId) return actionError("Organizer profile required.");
  if (!z.string().uuid().safeParse(affiliateId).success) {
    return actionError("Invalid affiliate.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_affiliate_status", {
    p_affiliate_id: affiliateId,
    p_status: status,
  });
  if (error) return actionError(friendlyDbError(error, "Could not update status."));
  revalidatePath("/organizer/marketing");
  return actionSuccess(`Affiliate ${status}.`);
}

// ---------------------------------------------------------------------------
// Organizer marketing settings (referral rewards + affiliate commission)
// ---------------------------------------------------------------------------

export async function updateMarketingSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireOrganizer("/organizer/marketing");
  if (!viewer.organizerId) return actionError("Organizer profile required.");

  const parsed = z
    .object({
      referralEnabled: z.enum(["true", "false"]),
      referralRewardType: z.enum([
        "fixed",
        "percent",
        "discount_voucher",
        "loyalty_points",
      ]),
      referralRewardValue: z.coerce.number().int().min(0).max(10_000_000),
      affiliateCommissionType: z.enum(["percent", "fixed"]),
      affiliateCommissionValue: z.coerce.number().int().min(0).max(100),
    })
    .safeParse({
      referralEnabled: formData.get("referral_enabled"),
      referralRewardType: formData.get("referral_reward_type"),
      referralRewardValue: formData.get("referral_reward_value") ?? 0,
      affiliateCommissionType: formData.get("affiliate_commission_type"),
      affiliateCommissionValue: formData.get("affiliate_commission_value") ?? 0,
    });
  if (!parsed.success) return actionError("Invalid settings.");
  const d = parsed.data;
  if (d.referralRewardType === "percent" && d.referralRewardValue > 100) {
    return actionError("Referral percent cannot exceed 100%.");
  }
  if (d.affiliateCommissionType === "percent" && d.affiliateCommissionValue > 50) {
    return actionError("Affiliate commission cannot exceed 50%.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizers")
    .update({
      referral_enabled: d.referralEnabled === "true",
      referral_reward_type: d.referralRewardType,
      referral_reward_value: d.referralRewardValue,
      affiliate_commission_type: d.affiliateCommissionType,
      affiliate_commission_value: d.affiliateCommissionValue,
    })
    .eq("id", viewer.organizerId);
  if (error) return actionError(friendlyDbError(error, "Could not save settings."));

  revalidatePath("/organizer/marketing");
  return actionSuccess("Marketing settings saved.");
}
