import type { OrganizerInsights } from "@/lib/ai/context";
import { formatXAF } from "@/lib/utils";

export interface AssistantReply {
  answer: string;
  /** Optional structured cards the UI can render. */
  highlights?: Array<{ label: string; value: string }>;
}

const fmt = formatXAF;

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

type Intent =
  | "sellout"
  | "forecast"
  | "revenue"
  | "profit"
  | "expense"
  | "marketing"
  | "affiliate"
  | "referral"
  | "recommend"
  | "summary"
  | "help"
  | "unknown";

function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/sell.?out|sell out|fully booked|will i sell/.test(m)) return "sellout";
  if (/forecast|predict|expect.*(sale|revenue|ticket)|project/.test(m)) return "forecast";
  if (/profit|margin/.test(m)) return "profit";
  if (/expense|cost|spend/.test(m)) return "expense";
  if (/affiliate/.test(m)) return "affiliate";
  if (/referr/.test(m)) return "referral";
  if (/campaign|promo|marketing|channel|roas|ads\b/.test(m)) return "marketing";
  if (/recommend|suggest|advice|improve|tip/.test(m)) return "recommend";
  if (/revenue|sales|earning|income|ticket.*sold|how much/.test(m)) return "revenue";
  if (/overview|summary|dashboard|how am i doing|perform/.test(m)) return "summary";
  if (/help|what can you|commands/.test(m)) return "help";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Answers — every number comes from OrganizerInsights (real DB records)
// ---------------------------------------------------------------------------

function answerSellout(data: OrganizerInsights): AssistantReply {
  const upcoming = data.events
    .filter((e) => e.status === "published" && e.daysUntilEvent > 0)
    .sort((a, b) => a.daysUntilEvent - b.daysUntilEvent);
  if (upcoming.length === 0) {
    return {
      answer:
        "You have no published upcoming events right now, so there's nothing to forecast. Publish an event first — I can then track its sales velocity.",
    };
  }
  const lines = upcoming.slice(0, 3).map((e) => {
    const pctSold = pct(e.sold, e.capacity);
    if (e.capacity === 0) {
      return `**${e.title}** — no ticket capacity configured yet.`;
    }
    if (e.remaining === 0) {
      return `**${e.title}** — already sold out (${e.sold}/${e.capacity}).`;
    }
    const proj =
      e.projectedSales !== null
        ? ` Projected ~${e.projectedSales} sales by event day (${e.sellOutLikelihood} sell-out likelihood).`
        : " Not enough sales history yet to project — I need at least a few days of confirmed sales.";
    const velocity =
      e.velocityPerDay !== null
        ? ` Current pace: ~${e.velocityPerDay} tickets/day.`
        : "";
    return `**${e.title}** — ${e.sold}/${e.capacity} sold (${pctSold}), ${e.remaining} remaining, ${Math.round(e.daysUntilEvent)} days away.${velocity}${proj}`;
  });
  return {
    answer: `Here's the sell-out outlook:\n\n${lines.join("\n\n")}\n\nForecasts assume current sales velocity continues linearly — real demand often spikes near the event date, so treat "unlikely" as a prompt to promote, not a certainty.`,
    highlights: upcoming.slice(0, 3).map((e) => ({
      label: e.title.slice(0, 24),
      value: `${e.sold}/${e.capacity} · ${e.sellOutLikelihood}`,
    })),
  };
}

function answerForecast(data: OrganizerInsights): AssistantReply {
  const withHistory = data.events.filter((e) => e.velocityPerDay !== null);
  if (withHistory.length === 0) {
    return {
      answer:
        "I can't produce a reliable forecast yet — none of your events have enough confirmed sales history (I need sales spread over multiple days). Once tickets start moving, I'll project sell-out dates and expected revenue.",
    };
  }
  const lines = withHistory.slice(0, 4).map((e) => {
    const expectedRevenue =
      e.projectedSales !== null
        ? Math.round((e.revenueXaf / Math.max(1, e.sold)) * e.projectedSales)
        : null;
    return `**${e.title}**: ~${e.projectedSales ?? "?"} projected sales (now ${e.sold}), ${Math.round(e.daysUntilEvent)} days left. ${
      expectedRevenue !== null ? `Estimated revenue at current pace: ${fmt(expectedRevenue)}.` : ""
    }`;
  });
  return {
    answer: `Sales forecast based on your confirmed bookings' velocity:\n\n${lines.join("\n\n")}\n\nAssumption: linear velocity. Confidence is moderate — promos, weather and last-minute spikes aren't modeled.`,
  };
}

function answerRevenue(data: OrganizerInsights): AssistantReply {
  const t = data.totals;
  const f = data.finance30d;
  const best = [...data.events].sort((a, b) => b.revenueXaf - a.revenueXaf)[0];
  return {
    answer: `**All-time:** ${fmt(t.grossRevenueXaf)} gross across ${t.events} events (${t.ticketsSold} tickets sold).\n\n**Last 30 days:** ${fmt(f.grossRevenueXaf)} revenue, ${f.ticketsSold} tickets.\n\n${
      best && best.revenueXaf > 0
        ? `Top earner: **${best.title}** with ${fmt(best.revenueXaf)}.`
        : "No confirmed revenue recorded yet."
    }`,
    highlights: [
      { label: "All-time revenue", value: fmt(t.grossRevenueXaf) },
      { label: "Last 30 days", value: fmt(f.grossRevenueXaf) },
      { label: "Tickets sold", value: String(t.ticketsSold) },
    ],
  };
}

function answerProfit(data: OrganizerInsights): AssistantReply {
  const t = data.totals;
  const margin =
    t.grossRevenueXaf > 0
      ? Math.round((t.estimatedProfitXaf / t.grossRevenueXaf) * 100)
      : 0;
  const f = data.finance30d;
  return {
    answer: `**Estimated profit (all time):** ${fmt(t.estimatedProfitXaf)} — gross ${fmt(
      t.grossRevenueXaf,
    )} minus ${fmt(t.expensesXaf)} recorded expenses (${margin}% margin).\n\n**Last 30 days:** ${fmt(
      f.estimatedProfitXaf,
    )} estimated profit.\n\nNote: this is accrual-based — platform fees and pending payouts aren't settled yet, and "estimated" means it updates as you log expenses.`,
  };
}

function answerExpense(data: OrganizerInsights): AssistantReply {
  const t = data.totals;
  const byCategory = new Map<string, number>();
  // Recompute from event insights isn't possible per-category here; totals only.
  void byCategory;
  const topExpenseEvent = [...data.events].sort(
    (a, b) => b.expensesXaf - a.expensesXaf,
  )[0];
  return {
    answer: `You've recorded **${fmt(t.expensesXaf)}** in total expenses across your events.\n\n${
      topExpenseEvent && topExpenseEvent.expensesXaf > 0
        ? `Highest spend: **${topExpenseEvent.title}** at ${fmt(topExpenseEvent.expensesXaf)}.`
        : "No expenses logged yet — add them in Finances to see true profitability."
    }`,
  };
}

function answerMarketing(data: OrganizerInsights): AssistantReply {
  const m = data.marketing;
  const parts: string[] = [];
  if (m.promoRedemptions > 0) {
    parts.push(
      `Promo codes: ${m.promoRedemptions} confirmed redemptions, ${fmt(m.promoDiscountXaf)} in discounts given.`,
    );
  }
  const refConv =
    m.referralClicks > 0 ? (m.referralConversions / m.referralClicks) * 100 : 0;
  const affConv =
    m.affiliateClicks > 0 ? (m.affiliateConversions / m.affiliateClicks) * 100 : 0;
  parts.push(
    `Referrals: ${m.referralClicks} clicks → ${m.referralConversions} conversions (${refConv.toFixed(1)}%).`,
  );
  parts.push(
    `Affiliates: ${m.affiliateClicks} clicks → ${m.affiliateConversions} conversions (${affConv.toFixed(1)}%).`,
  );
  parts.push(
    m.roas !== null
      ? `Attributed revenue ${fmt(m.attributedRevenueXaf)} vs ${fmt(m.marketingSpendXaf)} spend → ROAS ${m.roas}x.`
      : `Attributed revenue ${fmt(m.attributedRevenueXaf)}; no marketing expenses logged yet.`,
  );
  if (data.topAffiliate && data.topAffiliate.conversions > 0) {
    parts.push(
      `Top affiliate: **${data.topAffiliate.name}** with ${data.topAffiliate.conversions} confirmed conversions (${data.topAffiliate.clicks} clicks).`,
    );
  }
  if (data.topPromo && data.topPromo.redemptions > 0) {
    parts.push(
      `Best promo code: **${data.topPromo.code}** — ${data.topPromo.redemptions} confirmed redemptions (${fmt(data.topPromo.discountXaf)} discounts given).`,
    );
  }
  const fastest = [...data.ticketTierVelocity].sort(
    (a, b) => b.sellThroughPct - a.sellThroughPct,
  )[0];
  if (fastest && fastest.sellThroughPct > 0) {
    parts.push(
      `Fastest-selling tier: **${fastest.tier}** (${fastest.eventTitle}) at ${fastest.sellThroughPct}% sell-through.`,
    );
  }
  return {
    answer: parts.join("\n"),
    highlights: [
      { label: "Attributed revenue", value: fmt(m.attributedRevenueXaf) },
      { label: "ROAS", value: m.roas !== null ? `${m.roas}x` : "—" },
      { label: "Referrals", value: `${m.referralConversions}/${m.referralClicks}` },
      { label: "Affiliates", value: `${m.affiliateConversions}/${m.affiliateClicks}` },
    ],
  };
}

function answerAffiliate(data: OrganizerInsights): AssistantReply {
  const m = data.marketing;
  const top = data.topAffiliate;
  return {
    answer: `Your affiliate program: **${m.affiliateClicks} link clicks → ${m.affiliateConversions} confirmed conversions** (${(
      m.affiliateClicks > 0
        ? ((m.affiliateConversions / m.affiliateClicks) * 100).toFixed(1)
        : 0
    )}%).\n\n${
      top && top.conversions > 0
        ? `Top performer: **${top.name}** — ${top.conversions} conversions from ${top.clicks} clicks. Consider increasing their commission or recruiting similar creators.`
        : m.affiliateConversions > 0
          ? "Affiliates are driving real sales — check the Marketing dashboard for per-affiliate earnings."
          : "No affiliate conversions yet. Share your organizer page so creators can apply, and approve applicants in Marketing → Affiliates."
    }`,
  };
}

function answerReferral(data: OrganizerInsights): AssistantReply {
  const m = data.marketing;
  const convRate =
    m.referralClicks > 0 ? (m.referralConversions / m.referralClicks) * 100 : 0;
  return {
    answer: `Referral performance: **${m.referralClicks} clicks → ${m.referralConversions} confirmed sales** (${convRate.toFixed(1)}% conversion).\n\n${
      convRate > 0
        ? "Attendees are sharing links that convert. Consider increasing the referral reward in Marketing → Rewards to amplify this."
        : "No referral conversions yet. Make sure referral rewards are enabled and attendees know they can earn — the share widget appears on every event page."
    }`,
  };
}

function answerRecommend(data: OrganizerInsights): AssistantReply {
  const tips: string[] = [];

  // Tier velocity imbalance
  const tiers = data.ticketTierVelocity.filter((t) => t.capacity > 0);
  if (tiers.length >= 2) {
    const sorted = [...tiers].sort((a, b) => b.sellThroughPct - a.sellThroughPct);
    const fast = sorted[0];
    const slow = sorted[sorted.length - 1];
    if (fast.sellThroughPct - slow.sellThroughPct > 30) {
      tips.push(
        `**Tier pricing:** "${fast.tier}" at ${fast.sellThroughPct}% sell-through vs "${slow.tier}" at ${slow.sellThroughPct}% (${fast.eventTitle}). Consider a targeted promotion on the slower tier or a bundle.`,
      );
    }
  }

  // Upcoming event urgency
  const urgent = data.events
    .filter((e) => e.status === "published" && e.daysUntilEvent <= 14 && e.remaining > 0)
    .sort((a, b) => a.daysUntilEvent - b.daysUntilEvent)[0];
  if (urgent) {
    tips.push(
      `**Sell-out push:** "${urgent.title}" has ${urgent.remaining} tickets left with ${Math.round(urgent.daysUntilEvent)} days to go. A flash promo code or affiliate push this week is your best lever.`,
    );
  }

  // Marketing ROI
  if (data.marketing.roas !== null && data.marketing.roas < 1 && data.marketing.marketingSpendXaf > 0) {
    tips.push(
      `**Marketing efficiency:** your attributed revenue (${fmt(data.marketing.attributedRevenueXaf)}) is below recorded marketing spend (${fmt(data.marketing.marketingSpendXaf)}). Pause underperforming channels and double down on referrals/affiliates, which cost only rewards.`,
    );
  }

  // Low sell-through overall
  const lowEvents = data.events.filter(
    (e) => e.capacity > 0 && e.sold / e.capacity < 0.3 && e.daysUntilEvent > 7,
  );
  if (lowEvents.length > 0) {
    tips.push(
      `**Demand:** ${lowEvents.length} event(s) are under 30% sold with over a week left — review pricing, marketing reach, or consider rescheduling.`,
    );
  }

  if (tips.length === 0) {
    return {
      answer:
        "I don't see urgent issues in your current data. Your events are tracking normally — keep logging expenses and marketing activity so my recommendations stay accurate.",
    };
  }
  return {
    answer: `Based on your real sales, expenses and marketing data:\n\n${tips
      .map((t, i) => `${i + 1}. ${t}`)
      .join("\n\n")}`,
  };
}

function answerSummary(data: OrganizerInsights): AssistantReply {
  const t = data.totals;
  const active = data.events.filter((e) => e.status === "published").length;
  return {
    answer: `**Business snapshot**\n\n- Events: ${t.events} total, ${active} published\n- Tickets sold: ${t.ticketsSold}/${t.capacity} (${pct(t.ticketsSold, t.capacity)})\n- Revenue: ${fmt(t.grossRevenueXaf)} gross · ${fmt(t.estimatedProfitXaf)} est. profit\n- Expenses: ${fmt(t.expensesXaf)}\n- Marketing: ${data.marketing.attributedRevenueXaf > 0 ? `${fmt(data.marketing.attributedRevenueXaf)} attributed` : "no attributed revenue yet"}\n\nAsk me about sell-outs, forecasts, revenue, profit, expenses, or marketing performance.`,
  };
}

function answerHelp(): AssistantReply {
  return {
    answer: `I'm your TICKORA business analyst — I only use your real booking, payment, expense and marketing data.\n\nTry asking:\n- "Will I sell out before Saturday?"\n- "What's my revenue this month?"\n- "Which marketing channel performs best?"\n- "Give me recommendations"\n- "How's my profit looking?"`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function answerQuestion(
  message: string,
  data: OrganizerInsights,
): AssistantReply {
  const intent = detectIntent(message);
  switch (intent) {
    case "sellout":
      return answerSellout(data);
    case "forecast":
      return answerForecast(data);
    case "revenue":
      return answerRevenue(data);
    case "profit":
      return answerProfit(data);
    case "expense":
      return answerExpense(data);
    case "marketing":
      return answerMarketing(data);
    case "affiliate":
      return answerAffiliate(data);
    case "referral":
      return answerReferral(data);
    case "recommend":
      return answerRecommend(data);
    case "summary":
      return answerSummary(data);
    case "help":
      return answerHelp();
    default:
      return {
        answer: `I can analyze your real sales, revenue, expenses, forecasts and marketing. I didn't quite catch that — try "how are my sales?", "will I sell out?", or "give me recommendations".`,
      };
  }
}

// ---------------------------------------------------------------------------
// Optional LLM enhancement — only when AI_API_KEY is configured
// ---------------------------------------------------------------------------

const AI_API_BASE = process.env.AI_API_BASE ?? "https://api.openai.com/v1";
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

export function isLlmConfigured(): boolean {
  return Boolean(AI_API_KEY);
}

/**
 * When an LLM key is configured, send the computed insights + question to an
 * OpenAI-compatible endpoint for a natural-language answer. Falls back to the
 * rule engine on any failure — the assistant never fabricates data because the
 * model only receives real aggregates.
 */
export async function answerWithLlm(
  message: string,
  data: OrganizerInsights,
): Promise<AssistantReply | null> {
  if (!AI_API_KEY) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(`${AI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.3,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "You are TICKORA's event business analyst for one organizer. Answer using ONLY the provided JSON metrics — never invent numbers. Be concise, use XAF amounts, mention uncertainty for forecasts. If data is missing, say so.",
          },
          {
            role: "user",
            content: `Metrics JSON:\n${JSON.stringify(data, null, 0).slice(0, 12000)}\n\nQuestion: ${message}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text ? { answer: text } : null;
  } catch {
    return null;
  }
}
