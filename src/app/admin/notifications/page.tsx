import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ClipboardCheck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview, listAdminAudit } from "@/lib/data/admin";
import { formatDateTime, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  await requireAdmin("/admin/notifications");
  const [overview, audit] = await Promise.all([
    getAdminOverview(),
    listAdminAudit(20),
  ]);
  const { totals } = overview;

  const alerts = [
    {
      label: "Organizer applications",
      value: totals.pendingOrganizers,
      href: "/admin/events/pending",
      icon: ClipboardCheck,
    },
    {
      label: "Events awaiting review",
      value: totals.pendingEvents,
      href: "/admin/events/pending",
      icon: ClipboardCheck,
    },
    {
      label: "Open refund requests",
      value: totals.openRefunds,
      href: "/admin/refunds",
      icon: Bell,
    },
    {
      label: "Payouts in progress",
      value: totals.openPayouts,
      href: "/admin/payouts",
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Notifications"
        description="Live platform alerts and the latest administrative activity."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {alerts.map((alert) => (
          <Link key={alert.label} href={alert.href} className="glass flex items-center justify-between gap-3 rounded-xl p-4 transition hover:border-brand-400/50">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">{alert.label}</p>
              <p className="mt-1 text-[22px] font-semibold text-ink">{alert.value}</p>
            </div>
            <alert.icon className="h-5 w-5 text-brand-400" />
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent administrative activity</CardTitle></CardHeader>
        <CardContent className="pt-4">
          {audit.length === 0 ? (
            <EmptyState icon={Bell} title="No activity yet" description="Administrative decisions will be recorded here." />
          ) : (
            <ul className="divide-y divide-line">
              {audit.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-[12px] font-medium text-ink">{titleCase(entry.action.replace(/\./g, " "))}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {entry.actorName ?? "System"} · {entry.entity_type}
                    </p>
                  </div>
                  <span className="text-[10.5px] text-muted">{formatDateTime(entry.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
