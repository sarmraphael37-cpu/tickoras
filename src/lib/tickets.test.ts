import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  hashTicketToken,
  isPlausibleTicketToken,
  normalizeTicketToken,
  ticketHashesMatch,
  TICKET_TOKEN_LENGTH,
} from "@/lib/tickets";

const TOKEN = "a".repeat(TICKET_TOKEN_LENGTH);

describe("ticket token contract", () => {
  it("hashes tokens with SHA-256", () => {
    expect(hashTicketToken(TOKEN)).toBe(
      createHash("sha256").update(TOKEN, "utf8").digest("hex"),
    );
  });

  it("accepts only full-length hex tokens", () => {
    expect(isPlausibleTicketToken(TOKEN)).toBe(true);
    expect(isPlausibleTicketToken("short-code")).toBe(false);
    expect(isPlausibleTicketToken("z".repeat(TICKET_TOKEN_LENGTH))).toBe(false);
  });

  it("normalises pasted codes", () => {
    expect(normalizeTicketToken(`  ${TOKEN.toUpperCase()} \n`)).toBe(TOKEN);
  });

  it("compares hashes in constant time", () => {
    const hash = hashTicketToken(TOKEN);
    expect(ticketHashesMatch(hash, hash)).toBe(true);
    expect(ticketHashesMatch(hash, hashTicketToken("b".repeat(64)))).toBe(false);
    expect(ticketHashesMatch("not-hex", hash)).toBe(false);
  });

  it("does not store or expose the raw token in the hash", () => {
    expect(hashTicketToken(TOKEN)).not.toContain(TOKEN);
  });
});
