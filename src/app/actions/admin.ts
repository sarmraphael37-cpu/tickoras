"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { getViewer, requireAdmin } from "@/lib/auth";
import { env, isSupabaseConfigured } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { slugify } from "@/lib/utils";

async function adminContext(
  path: string,
): Promise<{ viewer: Awaited<ReturnType<typeof requireAdmin>> } | { error: ActionState }> {
  if (!isSupabaseConfigured) {
    return { error: actionError("Supabase is not configured.") };
  }
  const viewer = await requireAdmin(path);
  return { viewer };
}

/**
 * Best-effort audit entry for administrative writes that do not flow through a
 * dedicated review RPC. Failures are logged but never block the operation —
 * the underlying write is still protected by RLS and server-side checks.
 */
async function logAdminAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.rpc("admin_log_action", {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_metadata: metadata as Json,
  });
  if (error) {
    console.error(`[tickora] audit log ${action}:`, error.message);
  }
}

export async function reviewOrganizerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/approvals");
  if ("error" in context) return context.error;

  const parsed = z
    .object({
      organizerId: z.string().uuid(),
      decision: z.enum(["approve", "reject"]),
      reason: z.string().trim().max(1000).optional().default(""),
    })
    .safeParse({
      organizerId: formData.get("organizer_id"),
      decision: formData.get("decision"),
      reason: formData.get("reason") ?? "",
    });
  if (!parsed.success) return actionError("Invalid organizer review.");
  if (parsed.data.decision === "reject" && parsed.data.reason.length < 5) {
    return actionError("Add a short reason so the organizer knows what to fix.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_organizer", {
    p_organizer_id: parsed.data.organizerId,
    p_approve: parsed.data.decision === "approve",
    p_reason: parsed.data.reason || null,
  });
  if (error) return actionError(friendlyDbError(error, "Could not review this organizer."));

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/organizers");
  revalidatePath("/admin");
  return actionSuccess(
    parsed.data.decision === "approve"
      ? "Organizer approved. They can now submit events."
      : "Organizer application rejected.",
  );
}

export async function reviewEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/approvals");
  if ("error" in context) return context.error;

  const parsed = z
    .object({
      eventId: z.string().uuid(),
      decision: z.enum(["approve", "reject"]),
      reason: z.string().trim().max(2000).optional().default(""),
    })
    .safeParse({
      eventId: formData.get("event_id"),
      decision: formData.get("decision"),
      reason: formData.get("reason") ?? "",
    });
  if (!parsed.success) return actionError("Invalid event review.");
  if (parsed.data.decision === "reject" && parsed.data.reason.length < 5) {
    return actionError("Add a short reason so the organizer knows what to fix.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_event", {
    p_event_id: parsed.data.eventId,
    p_approve: parsed.data.decision === "approve",
    p_reason: parsed.data.reason || null,
  });
  if (error) return actionError(friendlyDbError(error, "Could not review this event."));

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/events");
  return actionSuccess(
    parsed.data.decision === "approve"
      ? "Event published to the public catalogue."
      : "Event returned to the organizer with your note.",
  );
}

export async function suspendEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/events");
  if ("error" in context) return context.error;

  const parsed = z
    .object({
      eventId: z.string().uuid(),
      reason: z.string().trim().min(5, "Give a reason for the suspension.").max(2000),
    })
    .safeParse({
      eventId: formData.get("event_id"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid suspension.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_suspend_event", {
    p_event_id: parsed.data.eventId,
    p_reason: parsed.data.reason,
  });
  if (error) return actionError(friendlyDbError(error, "Could not suspend this event."));

  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/events");
  return actionSuccess("Event suspended and the organizer notified.");
}

export async function reviewRefundAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/refunds");
  if ("error" in context) return context.error;

  const parsed = z
    .object({
      refundId: z.string().uuid(),
      decision: z.enum(["approve", "reject"]),
      note: z.string().trim().max(1000).optional().default(""),
    })
    .safeParse({
      refundId: formData.get("refund_id"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? "",
    });
  if (!parsed.success) return actionError("Invalid refund review.");
  if (parsed.data.decision === "reject" && parsed.data.note.length < 5) {
    return actionError("Add a short note explaining the decision.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_refund", {
    p_refund_id: parsed.data.refundId,
    p_approve: parsed.data.decision === "approve",
    p_note: parsed.data.note || null,
  });
  if (error) return actionError(friendlyDbError(error, "Could not review this refund."));

  revalidatePath("/admin/refunds");
  revalidatePath("/admin");
  return actionSuccess(
    parsed.data.decision === "approve"
      ? "Refund approved. Demo refunds are completed; real refunds stay pending provider reconciliation."
      : "Refund request declined.",
  );
}

export async function settleRefundAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/refunds");
  if ("error" in context) return context.error;

  const parsed = z
    .object({
      refundId: z.string().uuid(),
      reference: z.string().trim().max(200).optional().default(""),
      note: z.string().trim().max(1000).optional().default(""),
    })
    .safeParse({
      refundId: formData.get("refund_id"),
      reference: formData.get("reference") ?? "",
      note: formData.get("note") ?? "",
    });
  if (!parsed.success) return actionError("Invalid refund settlement.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_settle_refund", {
    p_refund_id: parsed.data.refundId,
    p_reference: parsed.data.reference || null,
    p_note: parsed.data.note || null,
  });
  if (error) return actionError(friendlyDbError(error, "Could not settle this refund."));

  revalidatePath("/admin/refunds");
  revalidatePath("/admin");
  return actionSuccess("Refund marked as settled. Inventory and payment records updated.");
}

export async function reviewPayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/payouts");
  if ("error" in context) return context.error;

  const parsed = z
    .object({
      payoutId: z.string().uuid(),
      status: z.enum(["approved", "processing", "paid", "rejected"]),
      note: z.string().trim().max(1000).optional().default(""),
    })
    .safeParse({
      payoutId: formData.get("payout_id"),
      status: formData.get("status"),
      note: formData.get("note") ?? "",
    });
  if (!parsed.success) return actionError("Invalid payout update.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_payout", {
    p_payout_id: parsed.data.payoutId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || null,
  });
  if (error) return actionError(friendlyDbError(error, "Could not update this payout."));

  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
  return actionSuccess(`Payout marked ${parsed.data.status}.`);
}

export async function toggleSuspensionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/users");
  if ("error" in context) return context.error;
  const viewer = context.viewer;

  const parsed = z
    .object({
      userId: z.string().uuid(),
      suspend: z.enum(["true", "false"]),
    })
    .safeParse({
      userId: formData.get("user_id"),
      suspend: formData.get("suspend"),
    });
  if (!parsed.success) return actionError("Invalid user update.");
  if (parsed.data.userId === viewer.id) {
    return actionError("You cannot suspend your own account.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: parsed.data.suspend === "true" })
    .eq("id", parsed.data.userId);
  if (error) return actionError(friendlyDbError(error, "Could not update this account."));

  await logAdminAction(
    supabase,
    parsed.data.suspend === "true" ? "user.suspended" : "user.reactivated",
    "user",
    parsed.data.userId,
  );

  revalidatePath("/admin/users");
  return actionSuccess(
    parsed.data.suspend === "true" ? "Account suspended." : "Account restored.",
  );
}

export async function updateRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/users");
  if ("error" in context) return context.error;
  const viewer = context.viewer;

  const parsed = z
    .object({
      userId: z.string().uuid(),
      role: z.enum(["attendee", "organizer", "scanner", "admin"]),
      operation: z.enum(["add", "remove"]),
    })
    .safeParse({
      userId: formData.get("user_id"),
      role: formData.get("role"),
      operation: formData.get("operation"),
    });
  if (!parsed.success) return actionError("Invalid role update.");
  if (
    parsed.data.userId === viewer.id &&
    parsed.data.role === "admin" &&
    parsed.data.operation === "remove"
  ) {
    return actionError("You cannot remove your own administrator role.");
  }

  const supabase = await createClient();

  // Never allow the platform to lose its last administrator.
  if (parsed.data.role === "admin" && parsed.data.operation === "remove") {
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const otherAdmins = (admins ?? []).filter(
      (row) => row.user_id !== parsed.data.userId,
    );
    const { data: targetRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", parsed.data.userId)
      .eq("role", "admin");
    if ((targetRoles ?? []).length > 0 && otherAdmins.length === 0) {
      return actionError(
        "This is the last administrator account. Grant another administrator first.",
      );
    }
  }

  if (parsed.data.operation === "add") {
    const { error } = await supabase.from("user_roles").insert({
      user_id: parsed.data.userId,
      role: parsed.data.role,
    });
    if (error) {
      if (error.code === "23505") return actionError("This user already has that role.");
      return actionError(friendlyDbError(error, "Could not grant this role."));
    }
  } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", parsed.data.userId)
      .eq("role", parsed.data.role);
    if (error) return actionError(friendlyDbError(error, "Could not remove this role."));
  }

  await logAdminAction(
    supabase,
    parsed.data.operation === "add" ? "user.role_granted" : "user.role_revoked",
    "user",
    parsed.data.userId,
    { role: parsed.data.role },
  );

  revalidatePath("/admin/users");
  return actionSuccess(
    parsed.data.operation === "add" ? "Role granted." : "Role removed.",
  );
}

const categorySchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]).optional().default(""),
  name: z.string().trim().min(2, "Enter a category name.").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and dashes only.")
    .optional()
    .default(""),
  description: z.string().trim().max(500).optional().default(""),
  icon: z.string().trim().max(40).optional().default("Sparkles"),
  color: z
    .union([z.literal(""), z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour.")])
    .optional()
    .default(""),
  imageUrl: z.string().trim().max(1000).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(999).default(100),
  isActive: z.enum(["true", "false"]).default("true"),
});

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/categories");
  if ("error" in context) return context.error;

  const parsed = categorySchema.safeParse({
    id: formData.get("category_id") ?? "",
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    icon: formData.get("icon") ?? "Sparkles",
    color: formData.get("color") ?? "",
    imageUrl: formData.get("image_url") ?? "",
    sortOrder: formData.get("sort_order") ?? 100,
    isActive: formData.get("is_active") ?? "true",
  });
  if (!parsed.success) {
    return actionError(
      parsed.error.issues[0]?.message ?? "Check the category details.",
    );
  }

  const slug = parsed.data.slug || slugify(parsed.data.name);
  if (!slug) return actionError("Enter a valid category slug.");

  const imageUrl = parsed.data.imageUrl.trim();
  if (imageUrl && !/^https:\/\//.test(imageUrl)) {
    return actionError("Category images must be uploaded through TICKORA storage.");
  }

  const supabase = await createClient();
  const values = {
    name: parsed.data.name,
    slug,
    description: parsed.data.description || null,
    icon: parsed.data.icon || null,
    color: parsed.data.color || null,
    image_url: imageUrl || null,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive === "true",
  };

  const { error } = parsed.data.id
    ? await supabase.from("categories").update(values).eq("id", parsed.data.id)
    : await supabase.from("categories").insert(values);

  if (error) return actionError(friendlyDbError(error, "Could not save this category."));

  await logAdminAction(
    supabase,
    parsed.data.id ? "category.updated" : "category.created",
    "category",
    parsed.data.id || null,
    { name: parsed.data.name, slug },
  );

  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/");
  return actionSuccess(parsed.data.id ? "Category updated." : "Category created.");
}

export async function deleteCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/categories");
  if ("error" in context) return context.error;

  const id = z.string().uuid().safeParse(formData.get("category_id"));
  if (!id.success) return actionError("Invalid category.");

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id.data);
  if (error) return actionError(friendlyDbError(error, "Could not delete this category."));

  await logAdminAction(supabase, "category.deleted", "category", id.data);

  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  return actionSuccess("Category deleted. Events keep their history but lose the label.");
}

const SETTING_KEYS = [
  "service_fee_percent",
  "min_service_fee",
  "reservation_minutes",
  "payout_minimum",
  "demo_payments_enabled",
  "support_email",
  "support_phone",
  "platform_name",
] as const;

export async function updateSettingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/settings");
  if ("error" in context) return context.error;
  const viewer = context.viewer;

  const key = String(formData.get("key") ?? "");
  const raw = String(formData.get("value") ?? "").trim();
  if (!(SETTING_KEYS as readonly string[]).includes(key)) {
    return actionError("Unknown setting.");
  }

  let value: string | number | boolean = raw;
  if (["service_fee_percent", "min_service_fee", "reservation_minutes", "payout_minimum"].includes(key)) {
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0) {
      return actionError("Enter a valid non-negative number.");
    }
    value = number;
  }
  if (key === "demo_payments_enabled") {
    if (!["true", "false"].includes(raw)) return actionError("Choose enabled or disabled.");
    value = raw === "true";
  }
  if (key === "support_email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)) {
    return actionError("Enter a valid support email.");
  }
  if (!raw) return actionError("Enter a value.");

  const supabase = await createClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key,
      value,
      updated_by: viewer.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) return actionError(friendlyDbError(error, "Could not save this setting."));

  await logAdminAction(supabase, "settings.updated", "platform_setting", null, {
    key,
    value: typeof value === "string" && value.length > 120 ? `${value.slice(0, 117)}…` : value,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/events");
  revalidatePath("/");
  return actionSuccess("Setting saved.");
}

export async function updateMessageStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/messages");
  if ("error" in context) return context.error;

  const parsed = z
    .object({
      messageId: z.string().uuid(),
      status: z.enum(["new", "in_progress", "closed"]),
    })
    .safeParse({
      messageId: formData.get("message_id"),
      status: formData.get("status"),
    });
  if (!parsed.success) return actionError("Invalid message update.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.messageId);
  if (error) return actionError(friendlyDbError(error, "Could not update this message."));

  await logAdminAction(
    supabase,
    "message.status_changed",
    "contact_message",
    parsed.data.messageId,
    { status: parsed.data.status },
  );

  revalidatePath("/admin/messages");
  return actionSuccess("Message updated.");
}

/**
 * One-time administrator bootstrap.
 *
 * This is intentionally NOT an admin-only action — it creates the first admin.
 * It only works when ADMIN_BOOTSTRAP_EMAIL is explicitly configured and the
 * signed-in email matches it exactly. RLS correctly prevents normal users from
 * granting themselves admin, so this uses the service-role client.
 */
export async function setOrganizerStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await adminContext("/admin/organizers");
  if ("error" in context) return context.error;
  const parsed = z
    .object({
      organizerId: z.string().uuid(),
      status: z.enum(["approved", "rejected", "suspended", "pending"]),
      reason: z.string().trim().max(1000).optional().default(""),
    })
    .safeParse({
      organizerId: formData.get("organizer_id"),
      status: formData.get("status"),
      reason: formData.get("reason") ?? "",
    });
  if (!parsed.success) return actionError("Invalid organizer update.");
  if (parsed.data.status === "rejected" && parsed.data.reason.length < 5) {
    return actionError("Add a reason before rejecting an application.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizers")
    .update({
      status: parsed.data.status,
      rejection_reason:
        parsed.data.status === "rejected" ? parsed.data.reason : null,
    })
    .eq("id", parsed.data.organizerId);
  if (error) {
    return actionError(friendlyDbError(error, "Could not update this organizer."));
  }

  await logAdminAction(
    supabase,
    `organizer.${parsed.data.status}`,
    "organizer",
    parsed.data.organizerId,
    { reason: parsed.data.reason || null },
  );

  revalidatePath("/admin/organizers");
  revalidatePath(`/admin/organizers/${parsed.data.organizerId}`);
  revalidatePath("/admin");
  return actionSuccess(`Organizer marked ${parsed.data.status}.`);
}

export async function bootstrapAdminAction(): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    return actionError("Supabase is not configured.");
  }
  if (!env.ADMIN_BOOTSTRAP_EMAIL) {
    return actionError(
      "Administrator bootstrap is disabled. Set ADMIN_BOOTSTRAP_EMAIL in .env.local to your account email.",
    );
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return actionError(
      "SUPABASE_SERVICE_ROLE_KEY is required to grant the first administrator role.",
    );
  }

  const viewer = await getViewer();
  if (!viewer) return actionError("Sign in first, then run the bootstrap.");
  if (viewer.email.trim().toLowerCase() !== env.ADMIN_BOOTSTRAP_EMAIL) {
    return actionError(
      "This account is not allowed to bootstrap administrator access.",
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("user_roles").upsert(
      { user_id: viewer.id, role: "admin" },
      { onConflict: "user_id,role" },
    );
    if (error) {
      return actionError(friendlyDbError(error, "Could not grant admin access."));
    }
  } catch (error) {
    console.error("[tickora] admin bootstrap:", error);
    return actionError("Server is not configured for privileged operations.");
  }

  revalidatePath("/", "layout");
  return actionSuccess(
    "Administrator access granted. You can now open the admin dashboard.",
  );
}
