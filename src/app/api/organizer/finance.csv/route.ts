import { requireOrganizer } from "@/lib/auth";
import {
  getEventProfitability,
  getOrganizerFinancials,
  listEventExpenses,
} from "@/lib/data/organizer";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Organizer finance export: expenses + per-event profitability as CSV. */
export async function GET() {
  if (!isSupabaseConfigured) {
    return new Response("Supabase is not configured.", { status: 503 });
  }
  const viewer = await requireOrganizer("/organizer/finance");
  if (!viewer.organizerId) {
    return new Response("Organizer profile required.", { status: 403 });
  }

  const [financials, expenses, profitability] = await Promise.all([
    getOrganizerFinancials(viewer.organizerId),
    listEventExpenses(viewer.organizerId),
    getEventProfitability(viewer.organizerId),
  ]);

  const lines: string[] = [
    "TICKORA organizer finance export",
    `Generated,${new Date().toISOString()}`,
    "",
    "SUMMARY",
    "Metric,Amount XAF",
    `Gross ticket sales,${financials.grossSales}`,
    `Platform fees,${financials.platformFees}`,
    `Refunds,${financials.refunds}`,
    `Net payable,${financials.netPayable}`,
    `Total expenses,${expenses.reduce((s, e) => s + e.amountXaf, 0)}`,
    "",
    "EXPENSES",
    "Date,Category,Description,Event,Amount XAF,Receipt",
    ...expenses.map((e) =>
      [
        e.expenseDate,
        e.category,
        e.description,
        e.eventTitle ?? "",
        e.amountXaf,
        e.receiptUrl ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
    "",
    "EVENT PROFITABILITY",
    "Event,Gross XAF,Expenses XAF,Profit XAF",
    ...profitability.map((p) =>
      [p.title, p.grossXaf, p.expensesXaf, p.profitXaf]
        .map(csvCell)
        .join(","),
    ),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tickora-finances.csv"',
    },
  });
}
