import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BellRing, Check, ExternalLink } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOrganizer } from "@/lib/auth";
import { listNotifications } from "@/lib/data/notifications";
import { cn, formatDateTime, relativeTime, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function OrganizerNotificationsPage() {
  const viewer = await requireOrganizer("/organizer/notifications");
  const notifications = await listNotifications(viewer.id, 80);
  const unread = notifications.filter((item) => !item.read_at);
  const path = "/organizer/notifications";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Approval decisions, new bookings and account updates."
        actions={
          unread.length > 0 ? (
            <form action={markAllNotificationsRead}>
              <input type="hidden" name="path" value={path} />
              <Button type="submit" variant="outline" size="sm">
                <Check className="h-3.5 w-3.5" />
                Mark all as read
              </Button>
            </form>
          ) : (
            <Badge tone="success">All caught up</Badge>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When TICKORA reviews your events or attendees book tickets, you will see it here."
          actionLabel="Manage events"
          actionHref="/organizer/events"
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <ul className="divide-y divide-line">
            {notifications.map((notification) => {
              const isUnread = !notification.read_at;
              return (
                <li
                  key={notification.id}
                  className={cn(
                    "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:px-5",
                    isUnread && "bg-brand-50/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      isUnread
                        ? "bg-brand-100 text-accent-200"
                        : "bg-surface text-muted",
                    )}
                  >
                    {isUnread ? (
                      <BellRing className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "text-[13px] text-ink",
                          isUnread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {notification.title}
                      </p>
                      <Badge tone="neutral">{titleCase(notification.type)}</Badge>
                      {isUnread ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-5 text-muted">
                      {notification.body}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="text-[10px] text-muted">
                        {relativeTime(notification.created_at)} ·{" "}
                        {formatDateTime(notification.created_at)}
                      </span>
                      {notification.href ? (
                        <Link
                          href={notification.href}
                          className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent-300 hover:underline"
                        >
                          Open
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {isUnread ? (
                    <form action={markNotificationRead} className="shrink-0">
                      <input
                        type="hidden"
                        name="notification_id"
                        value={notification.id}
                      />
                      <input type="hidden" name="path" value={path} />
                      <Button type="submit" variant="ghost" size="sm">
                        Mark read
                      </Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
