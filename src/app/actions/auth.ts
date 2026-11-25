"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { safeRedirect } from "@/lib/utils";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords must be 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

async function roleHome(userId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = new Set((data ?? []).map((row) => row.role as string));
    if (roles.has("admin")) return "/admin";
    if (roles.has("organizer")) return "/organizer";
    return "/attendee";
  } catch {
    return "/attendee";
  }
}

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    return actionError(
      "Authentication is disabled until Supabase is configured. Add your project URL and anon key to .env.local.",
    );
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const next = safeRedirect(String(formData.get("next") ?? ""), "");
  if (!parsed.success) {
    return actionError("Please check your email and password.");
  }

  const limited = rateLimit(`login:${parsed.data.email}`, 8, 10 * 60_000);
  if (!limited.allowed) {
    return actionError(
      `Too many sign-in attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const code = (error as { code?: string } | null)?.code ?? "";
    const message = error?.message?.toLowerCase() ?? "";
    if (code === "email_not_confirmed" || message.includes("not confirmed")) {
      return actionError(
        "Your email is not confirmed yet. Open the confirmation link we sent you, or resend it below.",
      );
    }
    return actionError("Those credentials do not match an active account.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_suspended")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    return actionError("This account is suspended. Contact support@tickora.cm.");
  }

  const destination = next || (await roleHome(data.user.id));
  revalidatePath("/", "layout");
  redirect(destination);
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .min(6, "Enter a valid phone number.")
      .max(30, "Enter a valid phone number.")
      .regex(/^[+0-9 ()-]+$/, "Use digits, spaces, + or - only."),
    password: passwordSchema,
    confirmPassword: z.string(),
    accountType: z.enum(["attendee", "organizer"]),
    organizationName: z.string().trim().max(120).optional().default(""),
    acceptTerms: z.literal("on", {
      errorMap: () => ({ message: "You must accept the terms to continue." }),
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine(
    (values) =>
      values.accountType !== "organizer" || values.organizationName.length >= 2,
    {
      message: "Enter your organization name.",
      path: ["organizationName"],
    },
  );

export async function signUp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    return actionError(
      "Registration is disabled until Supabase is configured. Add your project URL and anon key to .env.local.",
    );
  }

  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    accountType: formData.get("accountType"),
    organizationName: formData.get("organizationName") ?? "",
    acceptTerms: formData.get("acceptTerms"),
  };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError(
      "Please check the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const limited = rateLimit(`register:${parsed.data.email}`, 4, 30 * 60_000);
  if (!limited.allowed) {
    return actionError("Too many registration attempts. Please try again later.");
  }

  const isOrganizer = parsed.data.accountType === "organizer";
  const next = isOrganizer ? "/organizer" : "/attendee";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${next}`,
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        account_type: parsed.data.accountType,
        organization_name: parsed.data.organizationName || parsed.data.fullName,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return actionError(
        "An account with this email already exists. Sign in or reset your password.",
      );
    }
    console.error("[tickora] signUp:", error.message);
    return actionError("We could not create your account. Please try again.");
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }

  return actionSuccess(
    isOrganizer
      ? "Account created. Check your email to verify it, then complete your organizer profile. Approval is required before publishing."
      : "Account created. Check your email to verify your address before signing in.",
  );
}

export async function resendConfirmation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    return actionError("Supabase is not configured.");
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) {
    return actionError("Enter a valid email address.");
  }
  const limited = rateLimit(`resend:${email}`, 3, 30 * 60_000);
  if (!limited.allowed) {
    return actionError("Too many requests. Try again later.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (error) {
    console.error("[tickora] resend confirmation:", error.message);
    return actionError(
      "Could not resend the email. If this address has no pending signup, sign in instead.",
    );
  }
  return actionSuccess(
    "If that address has a pending signup, a new confirmation link is on its way.",
  );
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    return actionError("Password recovery is disabled until Supabase is configured.");
  }
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return actionError("Enter a valid email address.", {
      email: ["Enter a valid email address."],
    });
  }
  const limited = rateLimit(`reset:${parsed.data}`, 4, 30 * 60_000);
  if (!limited.allowed) {
    return actionError("Too many reset requests. Please try again later.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error) {
    console.error("[tickora] resetPasswordForEmail:", error.message);
  }

  // Always return the same response so the endpoint cannot enumerate accounts.
  return actionSuccess(
    "If an account exists for that address, a password reset link is on its way.",
  );
}

const resetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return actionError(
      "Please check the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return actionError(
      "Your reset link has expired or you are not signed in. Request a new link.",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return actionError(
      error.message.toLowerCase().includes("different")
        ? "Choose a password you have not used before."
        : "Could not update your password. Request a new reset link.",
    );
  }

  revalidatePath("/", "layout");
  return actionSuccess("Password updated. You can now sign in with your new password.");
}
