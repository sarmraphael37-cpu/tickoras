import type { Metadata } from "next";
import { History, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { listAdminAudit } from "@/lib/data/admin";
import { cn, formatDateTime, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit logs" };

function formatMetadata(value: unknown): string {
  if (value === null || value === undefined) return "No extra details.";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Details unavailable.";
  }
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; q?: string }>;
}) {
  await requireAdmin("/admin/audit-logs");
  const { entity, q } = await searchParams;
  const search = (q ?? "").trim().toLowerCase();
  const entries = await listAdminAudit(300);
  const entities = [...new Set(entries.map((entry) => entry.entity_type))].sort();
  const activeEntity = entities.includes(entity ?? "") ? entity! : "all";

  const visible = entries.filter((entry) => {
    const matchesEntity = activeEntity === "all" || entry.entity_type === activeEntity;
    const matchesSearch =
      !search ||
      entry.action.toLowerCase().includes(search) ||
      entry.actorName?.toLowerCase().includes(search) ||
      entry.entity_id?.toLowerCase().includes(search);
    return matchesEntity && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Audit Logs"
        description="Append-only record of sensitive administrative actions. Logs cannot be edited from this dashboard."
      />

      <form method="get" className="grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-[1fr_200px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Search action, actor or target" className="h-9 pl-9 text-[12px]" />
        </div>
        <select name="entity" defaultValue={activeEntity} className="h-9 rounded-lg border border-line bg-base px-3 text-[12px] text-ink">
          <option value="all">All targets</option>
          {entities.map((item) => (
            <option key={item} value={item}>{titleCase(item)}</option>
          ))}
        </select>
        <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-[12px] font-semibold text-white hover:bg-brand-700">Filter</button>
      </form>

      {visible.length === 0 ? (
        <EmptyState icon={History} title="No audit entries" description="Administrative actions will appear here as they happen." />
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <TableContainer>
            <THead>
              <TH>Action</TH>
              <TH>Target</TH>
              <TH>Actor</TH>
              <TH>Details</TH>
              <TH>Timestamp</TH>
            </THead>
            <TBody>
              {visible.map((entry) => (
                <TR key={entry.id}>
                  <TD>
                    <p className="font-medium text-ink">{titleCase(entry.action.replace(/\./g, " "))}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">{entry.action}</p>
                  </TD>
                  <TD>
                    <Badge tone="neutral">{entry.entity_type}</Badge>
                    {entry.entity_id ? (
                      <p className="mt-1 max-w-[140px] truncate font-mono text-[9.5px] text-muted">{entry.entity_id}</p>
                    ) : null}
                  </TD>
                  <TD className="text-[12px]">{entry.actorName ?? "System"}</TD>
                  <TD>
                    <details className="group">
                      <summary className="cursor-pointer text-[11px] font-semibold text-accent-300 hover:underline">View</summary>
                      <pre className="mt-2 max-w-[340px] overflow-auto whitespace-pre-wrap rounded-lg bg-base p-3 font-mono text-[10px] leading-4 text-muted">
                        {formatMetadata(entry.metadata)}
                      </pre>
                    </details>
                  </TD>
                  <TD className="whitespace-nowrap text-[11px] text-muted">{formatDateTime(entry.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </TableContainer>
        </div>
      )}
      <p className={cn("text-[10.5px] text-muted")}>Showing the {entries.length} most recent entries.</p>
    </div>
  );
}
