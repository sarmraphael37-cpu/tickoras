import { describe, expect, it } from "vitest";
import { answerQuestion } from "./assistant";
import type { OrganizerInsights } from "./context";

const base: OrganizerInsights = {
  organizerId: "org-1",
  generatedAt: new Date().toISOString(),
  events: [
    {
      id: "e1",
      title: "Test Concert",
      status: "published",
      startAt: new Date(Date.now() + 10 * 86400_000).toISOString(),
      capacity: 100,
      sold: 80,
      remaining: 20,
      revenueXaf: 400000,
      expensesXaf: 50000,
      daysUntilEvent: 10,
      velocityPerDay: 8,
      projectedSales: 160,
      sellOutLikelihood: "high",
    },
  ],
  totals: {
    events: 1,
    ticketsSold: 80,
    capacity: 100,
    grossRevenueXaf: 400000,
    expensesXaf: 50000,
    estimatedProfitXaf: 350000,
  },
  finance30d: {
    grossRevenueXaf: 400000,
    expensesXaf: 50000,
    estimatedProfitXaf: 350000,
    ticketsSold: 80,
  },
  marketing: {
    promoRedemptions: 5,
    promoDiscountXaf: 20000,
    referralClicks: 100,
    referralConversions: 4,
    affiliateClicks: 50,
    affiliateConversions: 2,
    attributedRevenueXaf: 60000,
    marketingSpendXaf: 30000,
    roas: 2,
  },
  ticketTierVelocity: [
    { eventTitle: "Test Concert", tier: "Regular", sold: 80, capacity: 100, sellThroughPct: 80 },
    { eventTitle: "Test Concert", tier: "VIP", sold: 0, capacity: 20, sellThroughPct: 0 },
  ],
  topAffiliate: { name: "DJ Kay", conversions: 2, clicks: 50 },
  topPromo: { code: "EARLYBIRD", redemptions: 5, discountXaf: 20000 },
};

describe("assistant intents", () => {
  it("answers sell-out questions with real numbers", () => {
    const r = answerQuestion("Will I sell out?", base);
    expect(r.answer).toContain("Test Concert");
    expect(r.answer).toContain("80/100");
    expect(r.answer).toContain("high");
  });

  it("answers revenue questions", () => {
    const r = answerQuestion("how much revenue did I make?", base);
    expect(r.answer).toContain("400");
  });

  it("answers profit questions", () => {
    const r = answerQuestion("what is my profit?", base);
    expect(r.answer).toContain("350");
  });

  it("gives recommendations grounded in tier velocity", () => {
    const r = answerQuestion("give me recommendations", base);
    expect(r.answer).toContain("Regular");
    expect(r.answer).toContain("VIP");
  });

  it("handles marketing questions", () => {
    const r = answerQuestion("which channel performs best?", base);
    expect(r.answer).toContain("ROAS");
    expect(r.answer).toContain("DJ Kay");
    expect(r.answer).toContain("EARLYBIRD");
    expect(r.answer).toContain("Regular");
  });

  it("falls back gracefully on unknown input", () => {
    const r = answerQuestion("asdkjh qwei", base);
    expect(r.answer).toContain("didn't quite catch");
  });

  it("explains when there is no data", () => {
    const empty: OrganizerInsights = {
      ...base,
      events: [],
      totals: { ...base.totals, ticketsSold: 0, capacity: 0, grossRevenueXaf: 0, expensesXaf: 0, estimatedProfitXaf: 0 },
      ticketTierVelocity: [],
    };
    const r = answerQuestion("will I sell out?", empty);
    expect(r.answer).toContain("no published upcoming events");
  });
});
