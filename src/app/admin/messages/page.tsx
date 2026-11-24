import type { Metadata } from "next";
import { Inbox, Mail } from "lucide-react";
import { updateMessageStatusAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Select } from "@/components/ui/input";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import {
  listContactMessages,
  listNewsletterSubscribers,
} from "@/lib/data/admin";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbox" };

const FILTERS = ["all", "new", "in_progress", "closed"] as const;

function statusTone(status: string): "warning" | "info" | "success" | "neutral" {
  if (status === "new") return "warning";
  if (status === "in_progress") return "info";
  if (status === "closed") return "success";
  return "neutral";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
      {children}
    </div>
  );
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/messages");
  const { status } = await searchParams;
  const active = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";

  const [messages, subscribers] = await Promise.all([
    listContactMessages(200),
    listNewsletterSubscribers(200),
  ]);
  const visible =
    active === "all"
      ? messages
      : messages.filter((message) => message.status === active);
  const unread = messages.filter((message) => message.status === "new").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Inbox"
        description="Contact form submissions and newsletter sign-ups. Update a message's status as you work through it."
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          const count =
            filter === "all"
              ? messages.length
              : messages.filter((message) => message.status === filter).length;
          return (
            <a
              key={filter}
              href={
                filter === "all"
                  ? "/admin/messages"
                  : `/admin/messages?status=${filter}`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition",
                active === filter
                  ? "border-brand-700 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
              )}
            >
              {filter.replace(/_/g, " ")}
              <span className="rounded-full bg-surface px-1.5 text-[9.5px]">
                {count}
              </span>
            </a>
          );
        })}
      </div>

      {unread > 0 ? (
        <p className="text-[11px] font-medium text-warning">
          {unread} new message{unread === 1 ? "" : "s"} awaiting a reply.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No messages in this view"
          description="Contact form submissions from the public site appear here."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((message) => (
            <Panel key={message.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {message.subject || "No subject"}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    {message.name} · {message.email}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    tone={statusTone(message.status)}
                    className="capitalize"
                  >
                    {statusLabel(message.status)}
                  </Badge>
                  <span className="whitespace-nowrap text-[10px] text-muted">
                    {formatDateTime(message.created_at)}
                  </span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-surface p-3 text-[11.5px] leading-5 text-muted">
                {message.message}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
                <div className="min-w-[160px] flex-1">
                  <Label
                    htmlFor={`message-status-${message.id}`}
                    className="text-[10.5px]"
                  >
                    Status
                  </Label>
                  <ActionForm
                    action={updateMessageStatusAction}
                    hidden={{ message_id: message.id }}
                    submitLabel="Update"
                    pendingLabel="Updating…"
                    variant="outline"
                    className="flex flex-wrap items-end gap-2"
                  >
                    <Select
                      id={`message-status-${message.id}`}
                      name="status"
                      defaultValue={message.status}
                      className="h-9 text-[11.5px]"
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In progress</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </ActionForm>
                </div>
                <a
                  href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-[11px] font-semibold text-ink hover:border-brand-300"
                >
                  <Mail className="h-3 w-3" />
                  Reply by email
                </a>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Newsletter subscribers</CardTitle>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            People who asked for event updates on the public site. TICKORA does not
            send marketing email without an explicit opt-in.
          </p>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {subscribers.length === 0 ? (
            <p className="px-5 pb-6 text-[12px] text-muted sm:px-6">
              No newsletter sign-ups yet.
            </p>
          ) : (
            <TableContainer>
              <THead>
                <TH>Email</TH>
                <TH>Source</TH>
                <TH>Subscribed</TH>
              </THead>
              <TBody>
                {subscribers.map((subscriber) => (
                  <TR key={subscriber.id}>
                    <TD className="text-[12px]">{subscriber.email}</TD>
                    <TD className="text-[11px] capitalize text-muted">
                      {subscriber.source?.replace(/_/g, " ") || "website"}
                    </TD>
                    <TD className="whitespace-nowrap text-[11px] text-muted">
                      {formatDateTime(subscriber.created_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
