"use server";

import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  subject: z.enum(["general", "tickets", "payments", "organizers", "press"]),
  message: z
    .string()
    .trim()
    .min(20, "Please add a little more detail (at least 20 characters).")
    .max(3000, "Please keep your message under 3,000 characters."),
});

export async function sendContactMessage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return actionError("Please check the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const limited = rateLimit(`contact:${parsed.data.email}`, 3, 60 * 60_000);
  if (!limited.allowed) {
    return actionError("Too many messages. Please wait an hour before trying again.");
  }

  if (!isSupabaseConfigured) {
    return actionError(
      "The contact form is disabled until Supabase is configured. Email hello@tickora.cm in the meantime.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });

  if (error) {
    console.error("[tickora] contact message:", error.message);
    return actionError("We could not send your message. Please email hello@tickora.cm.");
  }

  return actionSuccess(
    "Message received. Our team replies within one business day.",
  );
}
