"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { requireOrganizer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const EXPENSE_CATEGORIES = [
  "venue",
  "artists",
  "marketing",
  "catering",
  "photography",
  "security",
  "equipment",
  "transportation",
  "staff",
  "miscellaneous",
] as const;

const expenseSchema = z.object({
  eventId: z.string().uuid().optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(2).max(300),
  amountXaf: z.coerce.number().int().min(1).max(999_999_999),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(""),
  receiptUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .default(""),
});

export async function addExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return actionError("Supabase is not configured.");
  const viewer = await requireOrganizer("/organizer/finance");
  if (!viewer.organizerId) return actionError("Organizer profile required.");
  const limited = rateLimit(`expense:${viewer.id}`, 20, 60_000);
  if (!limited.allowed) return actionError("Too many requests. Try again later.");

  const parsed = expenseSchema.safeParse({
    eventId: formData.get("event_id") || undefined,
    category: formData.get("category"),
    description: formData.get("description"),
    amountXaf: formData.get("amount_xaf"),
    expenseDate: formData.get("expense_date") ?? "",
    receiptUrl: formData.get("receipt_url") ?? "",
  });
  if (!parsed.success) {
    return actionError(
      parsed.error.issues[0]?.message ?? "Please check the expense details.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("event_expenses").insert({
    organizer_id: viewer.organizerId,
    event_id: parsed.data.eventId || null,
    category: parsed.data.category,
    description: parsed.data.description,
    amount_xaf: parsed.data.amountXaf,
    expense_date: parsed.data.expenseDate || undefined,
    receipt_url: parsed.data.receiptUrl || null,
    created_by: viewer.id,
  });
  if (error) return actionError(friendlyDbError(error, "Could not add expense."));

  revalidatePath("/organizer/finance");
  return actionSuccess("Expense recorded.");
}

export async function deleteExpense(formData: FormData) {
  if (!isSupabaseConfigured) return;
  const viewer = await requireOrganizer("/organizer/finance");
  if (!viewer.organizerId) return;
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase
    .from("event_expenses")
    .delete()
    .eq("id", id)
    .eq("organizer_id", viewer.organizerId);
  revalidatePath("/organizer/finance");
}
