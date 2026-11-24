import { describe, expect, it } from "vitest";
import {
  bookingTotal,
  calculateServiceFee,
  DEFAULT_SERVICE_FEE,
} from "@/lib/pricing";

describe("service fee calculation", () => {
  it("returns zero for empty or invalid subtotals", () => {
    expect(calculateServiceFee(0)).toBe(0);
    expect(calculateServiceFee(-500)).toBe(0);
    expect(calculateServiceFee(Number.NaN)).toBe(0);
  });

  it("applies the minimum fee when the percentage is smaller", () => {
    // 5% of 2 000 is 100, below the 200 XAF floor.
    expect(calculateServiceFee(2_000)).toBe(200);
  });

  it("uses the percentage once it exceeds the minimum", () => {
    // 5% of 10 000 is 500.
    expect(calculateServiceFee(10_000)).toBe(500);
  });

  it("rounds the percentage up so TICKORA never undercharges", () => {
    expect(calculateServiceFee(1_001, { percent: 5, minimum: 0 })).toBe(51);
  });

  it("handles a zero fee configuration", () => {
    expect(calculateServiceFee(10_000, { percent: 0, minimum: 0 })).toBe(0);
  });

  it("builds a consistent booking total", () => {
    const result = bookingTotal(10_000);
    expect(result).toEqual({
      subtotal: 10_000,
      fee: 500,
      total: 10_500,
    });
  });

  it("uses the default configuration in the UI estimate", () => {
    expect(DEFAULT_SERVICE_FEE).toEqual({ percent: 5, minimum: 200 });
  });
});
