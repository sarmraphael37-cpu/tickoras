import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { NotificationInbox } from "@/components/attendee/notification-inbox";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireViewer } from "@/lib/auth";
import { listNotifications } from "@/lib/data/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function AttendeeNotificationsPage() {
  const viewer = await requireViewer("/attendee/notifications");
  const notifications = await listNotifications(viewer.id, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Booking updates, ticket notices, event changes and refund decisions from TICKORA."
        actions={
          <Link
            href="/attendee/settings#notifications"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[12px] font-semibold text-ink transition hover:border-brand-300"
          >
            <Settings className="h-3.5 w-3.5" />
            Preferences
          </Link>
        }
      />

      <NotificationInbox
        notifications={notifications}
        path="/attendee/notifications"
      />
    </div>
  );
}
