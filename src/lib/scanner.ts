/** Maps a check_in_ticket result code to a scan-attempt outcome. */
export function scanOutcomeFor(
  code: string | undefined,
): "success" | "invalid" | "duplicate" {
  if (code === "CHECKED_IN") return "success";
  if (code === "ALREADY_CHECKED_IN") return "duplicate";
  return "invalid";
}

export type ScanVerdict = "valid" | "duplicate" | "wrong_event" | "invalid";

/** Human-facing verdict for the scanner result banner. */
export function scanVerdictFor(code: string | undefined, success: boolean): ScanVerdict {
  if (success) return "valid";
  switch (code) {
    case "ALREADY_CHECKED_IN":
      return "duplicate";
    case "WRONG_EVENT":
      return "wrong_event";
    default:
      return "invalid";
  }
}
