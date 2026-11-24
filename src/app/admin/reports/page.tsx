import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getAdminAnalytics } from "@/lib/data/admin";
import { formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  { type: "financial", title: "Financial report", description: "Payments, platform fees and refund volume." },
  { type: "bookings", title: "Booking report", description: "Every order with status, totals and dates." },
  { type: "tickets", title: "Ticket sales report", description: "Issued tickets and check-in status." },
  { type: "users", title: "User activity report", description: "Accounts, roles and registration dates." },
  { type: "organizers", title: "Organizer report", description: "Applications, approval status and event counts." },
  { type: "refunds", title: "Refund report", description: "Requests, decisions and amounts." },
  { type: "events", title: "Event performance report", description: "Sales and attendance for every event." },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin("/admin/reports");
  const { days } = await searchParams;
  const range = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const analytics = await getAdminAnalytics(range);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Reports"
        description="Export real platform records as CSV for finance, operations and compliance."
        actions={
          <div className="flex gap-1 rounded-lg border border-line bg-card p-1">
            {[7, 30, 90].map((value) => (
              <Link key={value} href={`/admin/reports?days=${value}`} className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${range === value ? "bg-brand-600 text-white" : "text-muted hover:text-ink"}`}>
                {value} days
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Gross volume", formatXAF(analytics.totals.grossVolume)],
          ["Platform revenue", formatXAF(analytics.totals.platformRevenue)],
          ["Refund volume", formatXAF(analytics.totals.refundVolume)],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1.5 text-[18px] font-semibold text-ink">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <Card key={report.type} className="p-5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="mt-4 text-[14px] font-semibold text-ink">{report.title}</h2>
            <p className="mt-1 text-[11.5px] leading-5 text-muted">{report.description}</p>
            <Link
              href={`/api/admin/reports/${report.type}?days=${range}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-brand-700"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
