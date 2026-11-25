import type { Metadata } from "next";
import Link from "next/link";
import { Download, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  DeleteExpenseButton,
  ExpenseForm,
  EXPENSE_CATEGORIES,
} from "@/components/organizer/expense-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireOrganizer } from "@/lib/auth";
import {
  getEventProfitability,
  getOrganizerFinancials,
  listEventExpenses,
  listOrganizerEvents,
} from "@/lib/data/organizer";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Finances" };
export const dynamic = "force-dynamic";

export default async function OrganizerFinancePage() {
  const viewer = await requireOrganizer("/organizer/finance");
  if (!viewer.organizerId) {
    return (
      <EmptyState
        icon={Wallet}
        title="No organizer profile"
        description="Financial tools appear once your organizer account is set up."
      />
    );
  }

  const [financials, expenses, profitability, events] = await Promise.all([
    getOrganizerFinancials(viewer.organizerId),
    isSupabaseConfigured ? listEventExpenses(viewer.organizerId) : [],
    isSupabaseConfigured ? getEventProfitability(viewer.organizerId) : [],
    listOrganizerEvents(viewer.organizerId),
  ]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amountXaf, 0);
  // Net revenue after refunds and platform fees, minus recorded expenses.
  const netRevenue = Math.max(
    0,
    financials.netPayable - financials.platformFees,
  );
  const estimatedProfit = netRevenue - totalExpenses;
  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    byCategory.set(
      expense.category,
      (byCategory.get(expense.category) ?? 0) + expense.amountXaf,
    );
  }

  const categoryLabel = (value: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financial management"
        title="Event finances"
        description="Track revenue, expenses and profitability across your events. All figures come from verified bookings and your recorded expenses."
        actions={
          <a
            href="/api/organizer/finance.csv"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-[11.5px] font-medium text-ink hover:border-brand-300"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gross ticket sales"
          value={formatXAF(financials.grossSales)}
          hint={`${financials.confirmedBookings} confirmed bookings`}
          icon={TrendingUp}
        />
        <StatCard
          label="Platform fees"
          value={formatXAF(financials.platformFees)}
          hint="TICKORA service fee"
          icon={Receipt}
        />
        <StatCard
          label="Total expenses"
          value={formatXAF(totalExpenses)}
          hint={`${expenses.length} recorded`}
          icon={TrendingDown}
        />
        <StatCard
          label="Estimated profit"
          value={formatXAF(estimatedProfit)}
          hint="Net revenue minus expenses"
          icon={Wallet}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">Profitability by event</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {profitability.length === 0 ? (
                <p className="text-[12px] text-muted">
                  No events yet. Profitability appears once you have events.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-line text-[10px] uppercase tracking-[0.1em] text-muted">
                        <th className="pb-2 pr-4 font-semibold">Event</th>
                        <th className="pb-2 pr-4 font-semibold text-right">Gross</th>
                        <th className="pb-2 pr-4 font-semibold text-right">Expenses</th>
                        <th className="pb-2 font-semibold text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {profitability.map((row) => (
                        <tr key={row.eventId}>
                          <td className="py-2.5 pr-4">
                            <Link
                              href={`/organizer/events/${row.eventId}`}
                              className="font-medium text-ink hover:text-accent-300"
                            >
                              {row.title}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-4 text-right text-muted">
                            {formatXAF(row.grossXaf)}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-muted">
                            {formatXAF(row.expensesXaf)}
                          </td>
                          <td
                            className={`py-2.5 text-right font-semibold ${
                              row.profitXaf >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {formatXAF(row.profitXaf)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">
                Expenses ({expenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {expenses.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No expenses recorded"
                  description="Add venue, artist, marketing and other costs to see true profitability."
                />
              ) : (
                <div className="divide-y divide-line">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-ink">
                          {expense.description}
                        </p>
                        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[10.5px] text-muted">
                          <Badge tone="outline" className="text-[9px]">
                            {categoryLabel(expense.category)}
                          </Badge>
                          <span>{formatDate(expense.expenseDate)}</span>
                          {expense.eventTitle ? (
                            <span>· {expense.eventTitle}</span>
                          ) : null}
                          {expense.receiptUrl ? (
                            <a
                              href={expense.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent-300 hover:underline"
                            >
                              Receipt
                            </a>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-ink">
                          {formatXAF(expense.amountXaf)}
                        </span>
                        <DeleteExpenseButton id={expense.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <CardTitle className="text-[15px]">Add an expense</CardTitle>
            <div className="mt-4">
              <ExpenseForm
                events={events.map((e) => ({ id: e.id, title: e.title }))}
              />
            </div>
          </Card>

          {byCategory.size > 0 ? (
            <Card className="p-5">
              <CardTitle className="text-[15px]">Spend by category</CardTitle>
              <div className="mt-4 space-y-2.5">
                {Array.from(byCategory.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-muted">{categoryLabel(category)}</span>
                        <span className="font-medium text-ink">
                          {formatXAF(amount)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{
                            width: `${Math.min(100, (amount / totalExpenses) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ) : null}

        <Card className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            How profit is calculated
          </p>
          <ul className="mt-3 space-y-2 text-[11px] leading-5 text-muted">
            <li>
              <span className="font-medium text-ink">Gross sales</span> — ticket
              revenue from confirmed bookings only. Pending payments are not counted.
            </li>
            <li>
              <span className="font-medium text-ink">Net revenue</span> — gross
              minus refunds and the TICKORA service fee.
            </li>
            <li>
              <span className="font-medium text-ink">Estimated profit</span> —
              net revenue minus your recorded expenses. It updates as you add costs.
            </li>
          </ul>
        </Card>
        </div>
      </div>
    </div>
  );
}
