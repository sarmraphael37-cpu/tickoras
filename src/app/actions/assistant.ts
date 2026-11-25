"use server";

import { z } from "zod";
import { requireOrganizer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { buildOrganizerInsights } from "@/lib/ai/context";
import {
  answerQuestion,
  answerWithLlm,
  isLlmConfigured,
  type AssistantReply,
} from "@/lib/ai/assistant";

export interface AssistantResponse {
  reply: AssistantReply;
  engine: "ai" | "analytics";
}

const questionSchema = z.string().trim().min(2).max(500);

export async function askAssistant(
  message: string,
): Promise<AssistantResponse | { error: string }> {
  if (!isSupabaseConfigured) {
    return { error: "Assistant unavailable — Supabase is not configured." };
  }
  const parsed = questionSchema.safeParse(message);
  if (!parsed.success) return { error: "Ask a question (2–500 characters)." };

  const viewer = await requireOrganizer("/organizer/assistant");
  if (!viewer.organizerId) return { error: "Organizer profile required." };

  const limited = rateLimit(`assistant:${viewer.id}`, 20, 60_000);
  if (!limited.allowed) {
    return { error: "Too many questions. Please wait a minute." };
  }

  const insights = await buildOrganizerInsights(viewer.organizerId);
  if (!insights) return { error: "Could not load your business data." };

  // Prefer the LLM when configured; always fall back to the deterministic
  // analytics engine so answers stay data-grounded.
  if (isLlmConfigured()) {
    const llm = await answerWithLlm(parsed.data, insights);
    if (llm) return { reply: llm, engine: "ai" };
  }

  return { reply: answerQuestion(parsed.data, insights), engine: "analytics" };
}
