import { describe, expect, it } from "vitest";
import { scanOutcomeFor, scanVerdictFor } from "@/lib/scanner";

describe("scanOutcomeFor", () => {
  it("maps CHECKED_IN to success", () => {
    expect(scanOutcomeFor("CHECKED_IN")).toBe("success");
  });

  it("maps ALREADY_CHECKED_IN to duplicate", () => {
    expect(scanOutcomeFor("ALREADY_CHECKED_IN")).toBe("duplicate");
  });

  it("maps every other code to invalid", () => {
    for (const code of [
      "INVALID_TICKET",
      "WRONG_EVENT",
      "TICKET_NOT_VALID",
      undefined,
    ]) {
      expect(scanOutcomeFor(code)).toBe("invalid");
    }
  });
});

describe("scanVerdictFor", () => {
  it("returns valid only on success", () => {
    expect(scanVerdictFor("CHECKED_IN", true)).toBe("valid");
    expect(scanVerdictFor("CHECKED_IN", false)).toBe("invalid");
  });

  it("distinguishes duplicate and wrong event", () => {
    expect(scanVerdictFor("ALREADY_CHECKED_IN", false)).toBe("duplicate");
    expect(scanVerdictFor("WRONG_EVENT", false)).toBe("wrong_event");
  });
});
