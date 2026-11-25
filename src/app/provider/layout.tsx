import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireViewer } from "@/lib/auth";
import { getMyProviderProfile } from "@/lib/data/marketplace";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireViewer("/provider");
  const [unreadCount, notifications, provider] = await Promise.all([
    countUnreadNotifications(viewer.id),
    listNotifications(viewer.id, 5),
    getMyProviderProfile(viewer.id),
  ]);

  return (
    <DashboardShell
      variant="provider"
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
      organizerName={provider?.business_name ?? null}
      organizerStatus={provider ? "service provider" : "not registered"}
    >
      {children}
    </DashboardShell>
  );
}
