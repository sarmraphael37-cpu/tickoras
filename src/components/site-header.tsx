import { SiteHeaderClient } from "@/components/site-header-client";
import { dashboardPathFor, getViewer } from "@/lib/auth";

export async function SiteHeader() {
  const viewer = await getViewer();
  return (
    <SiteHeaderClient
      viewer={
        viewer
          ? {
              fullName: viewer.fullName,
              avatarUrl: viewer.avatarUrl,
              roles: viewer.roles,
            }
          : null
      }
      dashboardPath={viewer ? dashboardPathFor(viewer) : "/attendee"}
    />
  );
}
