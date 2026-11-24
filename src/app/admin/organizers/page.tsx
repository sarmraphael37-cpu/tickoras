import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Globe, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { listAdminOrganizers } from "@/lib/data/admin";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Organizers" };

const FILTERS = ["all", "pending", "approved", "rejected", "suspended"] as const;

export default async function AdminOrganizersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/organizers");
  const { status } = await searchParams;
  const active = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";
  const organizers = await listAdminOrganizers(
    active === "all" ? undefined : active,
  );
  const all = active === "all" ? organizers : await listAdminOrganizers();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Organizers"
        description="Every organizer account on TICKORA, with verification status and event counts."
        actions={
          <Link
            href="/admin/approvals"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Approval queue
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter === "all"
              ? all.length
              : all.filter((organizer) => organizer.status === filter).length;
          return (
            <Link
              key={filter}
              href={
                filter === "all"
                  ? "/admin/organizers"
                  : `/admin/organizers?status=${filter}`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition",
                active === filter
                  ? "border-brand-700 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
              )}
            >
              {filter}
              <span className="rounded-full bg-surface px-1.5 text-[9.5px]">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {organizers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No organizers in this view"
          description="Organizer accounts appear when people register to host events on TICKORA."
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Organization</TH>
              <TH>Owner</TH>
              <TH>City</TH>
              <TH>Events</TH>
              <TH>Applied</TH>
              <TH>Status</TH>
              <TH />
            </THead>
            <TBody>
              {organizers.map((organizer) => (
                <TR key={organizer.id}>
                  <TD>
                    <p className="max-w-[220px] truncate font-medium text-ink">
                      {organizer.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                      {organizer.slug}
                    </p>
                  </TD>
                  <TD>
                    <p className="text-[12px]">{organizer.ownerName ?? "—"}</p>
                    <p className="mt-0.5 max-w-[190px] truncate text-[10.5px] text-muted">
                      {organizer.ownerEmail ?? ""}
                    </p>
                  </TD>
                  <TD className="text-[12px] text-muted">
                    {organizer.city ?? "—"}
                  </TD>
                  <TD>{organizer.eventCount}</TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">
                    {relativeTime(organizer.created_at)}
                  </TD>
                  <TD>
                    <StatusBadge kind="organizer" status={organizer.status} />
                    {organizer.status === "rejected" &&
                    organizer.rejection_reason ? (
                      <p className="mt-1 max-w-[170px] truncate text-[10px] text-danger">
                        {organizer.rejection_reason}
                      </p>
                    ) : null}
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-1">
                      {organizer.status === "approved" ? (
                        <Link
                          href={`/organizers/${organizer.slug}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-accent-300 hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          Public page
                        </Link>
                      ) : null}
                      {organizer.status === "pending" ? (
                        <Link
                          href="/admin/approvals"
                          className="whitespace-nowrap text-[11px] font-semibold text-accent-300 hover:underline"
                        >
                          Review →
                        </Link>
                      ) : null}
                      {organizer.status === "approved" ? (
                        <span className="text-[10px] text-muted">
                          Since {formatDateTime(organizer.approved_at ?? organizer.created_at)}
                        </span>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableContainer>
        </div>
      )}

      <p className="text-[10.5px] leading-4 text-muted">
        Organizer status is managed through the approval queue. Rejections require a
        written reason. Administrative actions are written to the audit log.
      </p>
    </div>
  );
}
