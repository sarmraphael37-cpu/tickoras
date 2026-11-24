import type { Metadata } from "next";
import { Search, Shield, UserX } from "lucide-react";
import {
  toggleSuspensionAction,
  updateRoleAction,
} from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { listAdminUsers } from "@/lib/data/admin";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Users & roles" };

const ROLES = ["attendee", "organizer", "scanner", "admin"] as const;

const ROLE_TONE: Record<string, "neutral" | "brand" | "info" | "dark"> = {
  attendee: "neutral",
  organizer: "brand",
  scanner: "info",
  admin: "dark",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const viewer = await requireAdmin("/admin/users");
  const { q, role } = await searchParams;
  const search = (q ?? "").trim().toLowerCase();
  const roleFilter = ROLES.includes(role as (typeof ROLES)[number])
    ? (role as (typeof ROLES)[number])
    : "all";

  const all = await listAdminUsers(500);
  const users = all.filter((user) => {
    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter);
    const matchesSearch =
      !search ||
      user.fullName.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.phone ?? "").includes(search);
    return matchesRole && matchesSearch;
  });

  const suspended = all.filter((user) => user.isSuspended).length;
  const admins = all.filter((user) => user.roles.includes("admin")).length;
  const organizers = all.filter((user) => user.roles.includes("organizer")).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Users & roles"
        description="Accounts on TICKORA. Suspend a user to block sign-in, or manage the roles that control dashboard access."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Accounts"
          value={String(all.length)}
          hint="registered profiles"
          icon={Shield}
        />
        <StatCard
          label="Administrators"
          value={String(admins)}
          hint="full platform access"
          icon={Shield}
        />
        <StatCard
          label="Suspended"
          value={String(suspended)}
          hint={`${organizers} organizer accounts`}
          icon={UserX}
        />
      </div>

      <Alert tone="warning">
        Grant administrator or scanner roles only to people you trust. Roles bypass
        normal customer limits, and every change is visible in the audit log.
      </Alert>

      <form
        method="get"
        className="flex flex-wrap items-center gap-2 glass-subtle rounded-xl p-3"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, email or phone"
            className="h-9 pl-8 text-[12px]"
          />
        </div>
        <Select
          name="role"
          defaultValue={roleFilter}
          className="h-9 w-auto text-[12px]"
        >
          <option value="all">All roles</option>
          {ROLES.map((item) => (
            <option key={item} value={item} className="capitalize">
              {item}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-full bg-brand-600 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-700"
        >
          Filter
        </button>
      </form>

      {users.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No accounts in this view"
          description={
            search || roleFilter !== "all"
              ? "Try a different search or role filter."
              : "Accounts appear here as people register on TICKORA."
          }
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <TableContainer>
            <THead>
              <TH>Account</TH>
              <TH>Roles</TH>
              <TH>Joined</TH>
              <TH>State</TH>
              <TH>Manage</TH>
            </THead>
            <TBody>
              {users.map((user) => {
                const isSelf = user.id === viewer.id;
                return (
                  <TR key={user.id}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.fullName} size="sm" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 max-w-[200px] truncate font-medium text-ink">
                            {user.fullName || "Unnamed account"}
                            {isSelf ? (
                              <Badge tone="brand" className="text-[9px]">
                                You
                              </Badge>
                            ) : null}
                          </p>
                          <p className="mt-0.5 max-w-[210px] truncate text-[10.5px] text-muted">
                            {user.email}
                          </p>
                          {user.phone ? (
                            <p className="mt-0.5 text-[10px] text-muted">
                              {user.phone}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length ? (
                          user.roles.map((item) => (
                            <span key={item} className="inline-flex items-center gap-1">
                              <Badge
                                tone={ROLE_TONE[item] ?? "neutral"}
                                className="capitalize"
                              >
                                {item}
                              </Badge>
                              {!isSelf || item !== "admin" ? (
                                <ActionForm
                                  action={updateRoleAction}
                                  hidden={{
                                    user_id: user.id,
                                    role: item,
                                    operation: "remove",
                                  }}
                                  submitLabel="×"
                                  pendingLabel="…"
                                  variant="ghost"
                                  size="sm"
                                  buttonClassName="h-5 w-5 p-0 text-[12px] text-muted hover:text-danger"
                                  confirm={`Remove the ${item} role from ${user.fullName || "this account"}?`}
                                />
                              ) : null}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted">No roles</span>
                        )}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-[11px] text-muted">
                      {formatDateTime(user.createdAt)}
                    </TD>
                    <TD>
                      <Badge tone={user.isSuspended ? "danger" : "success"}>
                        {user.isSuspended ? "Suspended" : "Active"}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1.5">
                        {!isSelf ? (
                          <ActionForm
                            action={toggleSuspensionAction}
                            hidden={{
                              user_id: user.id,
                              suspend: user.isSuspended ? "false" : "true",
                            }}
                            submitLabel={user.isSuspended ? "Restore" : "Suspend"}
                            pendingLabel="Working…"
                            variant={user.isSuspended ? "outline" : "danger"}
                            confirm={
                              user.isSuspended
                                ? "Restore this account's access?"
                                : "Suspend this account? They will be signed out."
                            }
                          />
                        ) : (
                          <span className="text-[10.5px] text-muted">
                            Your account
                          </span>
                        )}
                        <details className="group">
                          <summary className="inline-flex h-9 cursor-pointer items-center rounded-full border border-line bg-card px-3 text-[11px] font-semibold text-ink hover:border-brand-300">
                            Add role
                          </summary>
                          <div className="mt-2 w-[200px] space-y-2 rounded-lg border border-line bg-surface p-3">
                            <Label
                              htmlFor={`grant-role-${user.id}`}
                              className="text-[10.5px]"
                            >
                              Role to grant
                            </Label>
                            <ActionForm
                              action={updateRoleAction}
                              hidden={{ user_id: user.id, operation: "add" }}
                              submitLabel="Grant"
                              pendingLabel="Granting…"
                              variant="outline"
                              className="space-y-2"
                            >
                              <Select
                                id={`grant-role-${user.id}`}
                                name="role"
                                defaultValue="attendee"
                                className="h-9 text-[11.5px]"
                              >
                                {ROLES.map((item) => (
                                  <option key={item} value={item} className="capitalize">
                                    {item}
                                  </option>
                                ))}
                              </Select>
                            </ActionForm>
                          </div>
                        </details>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </TableContainer>
        </div>
      )}
    </div>
  );
}
