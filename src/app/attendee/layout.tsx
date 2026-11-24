import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireViewer } from "@/lib/auth";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

export default async function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireViewer("/attendee");
  const [unreadCount, notifications] = await Promise.all([
    countUnreadNotifications(viewer.id),
    listNotifications(viewer.id, 5),
  ]);

  return (
    <DashboardShell
      variant="attendee"
      unreadCount={unreadCount}
      recentNotifications={notifications.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        created_at: item.created_at,
        href: item.href,
        read_at: item.read_at,
      }))}
      viewer={{
        fullName: viewer.fullName,
        email: viewer.email,
        avatarUrl: viewer.avatarUrl,
      }}
    >
      {children}
    </DashboardShell>
  );
}
