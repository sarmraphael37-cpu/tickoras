"use server";

import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export async function subscribeToNewsletter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return actionError("Please check your email address.", {
      email: parsed.error.flatten().fieldErrors.email,
    });
  }

  const limited = rateLimit(`newsletter:${parsed.data.email}`, 3, 60 * 60_000);
  if (!limited.allowed) {
    return actionError("Too many attempts. Please try again later.");
  }

  if (!isSupabaseConfigured) {
    return actionError(
      "Newsletter subscriptions are disabled until Supabase is configured.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email: parsed.data.email, source: "website" });

  if (error) {
    if (error.code === "23505") {
      return actionSuccess("You are already on the list. See you at the next event.");
    }
    return actionError("We could not save your subscription. Please try again.");
  }

  return actionSuccess("You are on the list. Look out for our next dispatch.");
}
