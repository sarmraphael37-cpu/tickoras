import { describe, expect, it } from "vitest";
import {
  formatXAF,
  initials,
  safeRedirect,
  slugify,
  titleCase,
  truncate,
} from "@/lib/utils";

describe("formatting helpers", () => {
  it("formats whole XAF amounts", () => {
    expect(formatXAF(12_500).replace(/\s/g, "")).toBe("12 500FCFA".replace(/\s/g, ""));
    expect(formatXAF(null)).toBe("—");
  });

  it("slugifies accented city names", () => {
    expect(slugify("Nuits à Yaoundé!")).toBe("nuits-a-yaounde");
    expect(slugify("  Douala  2026  ")).toBe("douala-2026");
  });

  it("derives initials from names", () => {
    expect(initials("Ama Nkomo")).toBe("AN");
    expect(initials(null)).toBe("T");
  });

  it("rejects off-site redirects", () => {
    expect(safeRedirect("/attendee/tickets")).toBe("/attendee/tickets");
    expect(safeRedirect("https://example.com")).toBe("/");
    expect(safeRedirect("//example.com")).toBe("/");
  });

  it("humanises status names and truncates copy", () => {
    expect(titleCase("pending_approval")).toBe("Pending Approval");
    expect(truncate("abcdef", 3)).toBe("abc…");
  });
});
