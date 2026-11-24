"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Check,
  CircleCheck,
  ExternalLink,
} from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  categoryForNotification,
  loadNotificationPreferences,
} from "@/lib/notification-preferences";
import type { NotificationPreferences } from "@/lib/notification-preferences";
import type { NotificationRow } from "@/types/database";
import { cn, formatDateTime, relativeTime, titleCase } from "@/lib/utils";

export function NotificationInbox({
  notifications,
  path,
}: {
  notifications: NotificationRow[];
  path: string;
}) {
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    function sync() {
      setPreferences(loadNotificationPreferences());
      setPreferenceVersion((value) => value + 1);
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("tickora:notification-preferences", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("tickora:notification-preferences", sync);
    };
  }, []);

  const types = useMemo(
    () => [...new Set(notifications.map((item) => item.type))].sort(),
    [notifications],
  );

  const visible = useMemo(() => {
    void preferenceVersion;
    return notifications.filter((item) => {
      if (filter === "unread" && item.read_at) return false;
      if (filter !== "all" && filter !== "unread" && item.type !== filter) {
        return false;
      }
      if (!preferences) return true;
      const category = categoryForNotification(item.type, item.title);
      if (!category) return true; // essential notices are always shown
      return preferences[category] !== false;
    });
    // preferenceVersion forces recomputation after an external storage update.
  }, [notifications, filter, preferences, preferenceVersion]);

  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {["all", "unread", ...types].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition",
              filter === item
                ? "border-brand-700 bg-brand-600 text-white"
                : "border-line bg-card text-muted hover:border-brand-300 hover:text-ink",
            )}
          >
            {item === "unread" ? `Unread (${unread})` : item.replace(/_/g, " ")}
          </button>
        ))}
        {unread > 0 ? (
          <form action={markAllNotificationsRead} className="ml-auto">
            <input type="hidden" name="path" value={path} />
            <Button type="submit" variant="outline" size="sm">
              <Check className="h-3.5 w-3.5" />
              Mark all as read
            </Button>
          </form>
        ) : (
          <Badge tone="success" className="ml-auto">
            <CircleCheck className="h-3 w-3" />
            All caught up
          </Badge>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications in this view"
          description="Try another filter, or adjust your notification preferences in Settings."
        />
      ) : (
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          <ul className="divide-y divide-line">
            {visible.map((notification) => {
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
