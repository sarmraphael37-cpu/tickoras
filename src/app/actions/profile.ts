"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { requireViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long.")
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces, + or - only.")
    .optional()
    .default(""),
  avatarUrl: z
    .union([z.literal(""), z.string().trim().url("Enter a valid image URL.")])
    .optional()
    .default(""),
});

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/attendee/profile");
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    avatarUrl: formData.get("avatar_url"),
  });
  if (!parsed.success) {
    return actionError(
      "Please check the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      avatar_url: parsed.data.avatarUrl || null,
    })
    .eq("id", viewer.id);

  if (error) return actionError(friendlyDbError(error, "Could not save your profile."));

  revalidatePath("/attendee/profile");
  revalidatePath("/attendee");
  revalidatePath("/", "layout");
  return actionSuccess("Profile updated.");
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Passwords must be 72 characters or fewer.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireViewer("/attendee/settings");

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return actionError(
      "Please check the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const limited = rateLimit(`password:${viewer.id}`, 5, 10 * 60_000);
  if (!limited.allowed) {
    return actionError(
      `Too many attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
    );
  }

  const supabase = await createClient();
  if (!viewer.email) {
    return actionError("Your account has no email address on file.");
  }

  // Re-authenticate before changing a password so a stolen session alone cannot
  // lock the real owner out.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: viewer.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) return actionError("Your current password is incorrect.");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return actionError(
      error.message.toLowerCase().includes("different")
        ? "Choose a password you have not used before."
        : "Could not update your password. Please try again.",
    );
  }

  return actionSuccess("Password updated. Keep it somewhere safe.");
}
