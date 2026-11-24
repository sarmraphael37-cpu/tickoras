"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { friendlyDbError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { scanOutcomeFor } from "@/lib/scanner";
import { createClient } from "@/lib/supabase/server";
import {
  isPlausibleTicketToken,
  normalizeTicketToken,
} from "@/lib/tickets";

export interface ScanResult {
  success: boolean;
  code?: string;
  message: string;
  ticketReference?: string;
  attendeeName?: string;
  ticketType?: string;
  eventTitle?: string;
  checkedInAt?: string;
  scannedBy?: string;
}

export interface ScanState {
  status: "idle" | "success" | "error";
  message?: string;
  result?: ScanResult;
}

export const initialScanState: ScanState = { status: "idle" };

interface AttemptInput {
  eventId: string | null;
  ticketId: string | null;
  ticketReference: string | null;
  method: "qr" | "manual";
  outcome: "success" | "invalid" | "duplicate";
  code: string | null;
}

/** Best-effort attempt logging — never blocks or fails the scan itself. */
async function recordAttempt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attempt: AttemptInput,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("record_scan_attempt", {
      p_event_id: attempt.eventId,
      p_ticket_id: attempt.ticketId,
      p_ticket_reference: attempt.ticketReference,
      p_method: attempt.method,
      p_outcome: attempt.outcome,
      p_code: attempt.code,
    });
    if (error) {
      console.error("[tickora] scan attempt log:", error.message);
    }
  } catch (error) {
    console.error("[tickora] scan attempt log:", error);
  }
}

const scanSchema = z.object({
  token: z.string().trim().min(1, "Paste or scan a ticket code."),
  eventId: z.string().uuid().optional().or(z.literal("")),
  method: z.enum(["qr", "manual"]).default("qr"),
});

export async function scanTicket(
  _prev: ScanState,
  formData: FormData,
): Promise<ScanState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: "Supabase is not configured." };
  }

  const viewer = await getViewer();
  if (!viewer) {
    return { status: "error", message: "Sign in with a scanner account." };
  }
  if (
    !["scanner", "organizer", "admin"].some((role) =>
      viewer.roles.includes(role as "scanner" | "organizer" | "admin"),
    )
  ) {
    return { status: "error", message: "You are not assigned to scan tickets." };
  }

  const parsed = scanSchema.safeParse({
    token: formData.get("token"),
    eventId: formData.get("event_id") ?? "",
    method: formData.get("method") ?? "qr",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid scan.",
    };
  }

  const supabase = await createClient();

  const token = normalizeTicketToken(parsed.data.token);
  if (!isPlausibleTicketToken(token)) {
    await recordAttempt(supabase, {
      eventId: parsed.data.eventId || null,
      ticketId: null,
      ticketReference: null,
      method: parsed.data.method,
      outcome: "invalid",
      code: "INVALID_TICKET",
    });
    return {
      status: "error",
      message: "This is not a TICKORA ticket code. Scan the QR or paste the full code.",
      result: {
        success: false,
        code: "INVALID_TICKET",
        message: "This is not a valid TICKORA ticket.",
      },
    };
  }

  const limited = rateLimit(`scan:${viewer.id}`, 80, 60_000);
  if (!limited.allowed) {
    return {
      status: "error",
      message: `Too many scans. Wait ${limited.retryAfterSeconds} seconds and try again.`,
    };
  }

  const { data, error } = await supabase.rpc("check_in_ticket", {
    p_token: token,
    p_event_id: parsed.data.eventId || null,
    p_method: parsed.data.method,
  });

  if (error) {
    console.error("[tickora] check_in_ticket:", error.message);
    return { status: "error", message: friendlyDbError(error) };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const result: ScanResult = {
    success: Boolean(payload.success),
    code: payload.code ? String(payload.code) : undefined,
    message: payload.message ? String(payload.message) : "Scan complete.",
    ticketReference: payload.ticket_reference
      ? String(payload.ticket_reference)
      : undefined,
    attendeeName: payload.attendee_name ? String(payload.attendee_name) : undefined,
    ticketType: payload.ticket_type ? String(payload.ticket_type) : undefined,
    eventTitle: payload.event_title ? String(payload.event_title) : undefined,
    checkedInAt: payload.checked_in_at ? String(payload.checked_in_at) : undefined,
    scannedBy: payload.scanned_by ? String(payload.scanned_by) : undefined,
  };

  const outcome = scanOutcomeFor(result.code);
  await recordAttempt(supabase, {
    eventId: payload.event_id ? String(payload.event_id) : parsed.data.eventId || null,
    ticketId: payload.ticket_id ? String(payload.ticket_id) : null,
    ticketReference: result.ticketReference ?? null,
    method: parsed.data.method,
    outcome,
    code: result.code ?? null,
  });

  revalidatePath("/scanner");
  revalidatePath("/scanner/history");
  return {
    status: result.success ? "success" : "error",
    message: result.message,
    result,
  };
}
