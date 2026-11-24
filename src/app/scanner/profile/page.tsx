import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Mail, ScanLine, Ticket } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { dashboardPathFor, requireRole } from "@/lib/auth";
import { listScannerEventCards } from "@/lib/data/scanner";
import { formatShortDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Scanner profile" };
export const dynamic = "force-dynamic";

export default async function ScannerProfilePage() {
  const viewer = await requireRole(
    ["scanner", "organizer", "admin"],
    "/scanner/profile",
  );
  const events = await listScannerEventCards(viewer);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
          Scanner account
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-tight text-ink">
          {viewer.fullName}
        </h1>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={viewer.fullName} src={viewer.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">
              {viewer.fullName}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-muted">
              <Mail className="h-3.5 w-3.5" />
              {viewer.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {viewer.roles.map((role) => (
                <Badge key={role} tone="brand" className="capitalize">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
          <Ticket className="h-4 w-4 text-accent-300" />
          Assigned events ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="mt-3 text-[12px] text-muted">
            You are not assigned to any events yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/scanner/events/${event.id}`}
                    className="truncate text-[12.5px] font-semibold text-ink hover:text-accent-300"
                  >
                    {event.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {event.venueName}, {event.city} · {formatShortDate(event.startsAt)}
                  </p>
                </div>
                <Badge tone="neutral" className="shrink-0">
                  {event.checkedIn}/{event.expected} in
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/scanner/scan"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-500"
        >
          <ScanLine className="h-4 w-4" />
          Open scanner
        </Link>
        <Link
          href={dashboardPathFor(viewer)}
          className="inline-flex items-center rounded-full border border-line bg-card px-5 py-2.5 text-[12.5px] font-semibold text-ink transition hover:border-brand-300"
        >
          Main dashboard
        </Link>
        <form action="/auth/signout">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-danger/40 bg-danger/10 px-5 py-2.5 text-[12.5px] font-semibold text-danger transition hover:bg-danger/20"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
