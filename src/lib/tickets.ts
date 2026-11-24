import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Mirror of the ticket-token contract used by the database.
 *
 * The raw token is generated with 32 random bytes, encoded as 64 lowercase hex
 * characters. Only its SHA-256 hash is used for lookup, so a database read of
 * the hash cannot be replayed at the door. Raw tokens are exposed to their
 * owner exclusively through `get_my_ticket_qr`.
 */
export const TICKET_TOKEN_LENGTH = 64;

export function hashTicketToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isPlausibleTicketToken(token: string): boolean {
  return new RegExp(`^[a-f0-9]{${TICKET_TOKEN_LENGTH}}$`, "i").test(token.trim());
}

/** Constant-time comparison for two hex digests. */
export function ticketHashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function normalizeTicketToken(token: string): string {
  return token.trim().toLowerCase();
}
