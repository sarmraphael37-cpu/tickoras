import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireAdmin("/admin");

  return (
    <DashboardShell
      variant="admin"
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
