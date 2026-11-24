import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Building2, Globe } from "lucide-react";
import { OrganizerProfileForm } from "@/components/organizer/organizer-profile-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireOrganizer } from "@/lib/auth";
import { getOrganizerProfile } from "@/lib/data/organizer";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Organizer profile" };

export default async function OrganizerProfilePage() {
  const viewer = await requireOrganizer("/organizer/profile");
  if (!viewer.organizerId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Manage"
          title="Organizer profile"
          description="We could not find your organizer record."
        />
        <Alert tone="warning" title="Profile missing">
          Contact TICKORA support so we can connect your organization.
        </Alert>
      </div>
    );
  }

  const profile = await getOrganizerProfile(viewer.organizerId);
  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Manage"
          title="Organizer profile"
          description="We could not load your organizer record."
        />
        <Alert tone="danger">
          The organizer profile could not be loaded. Refresh the page or contact
          support.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Organizer profile"
        description="This is what attendees see on your public organizer page. Keep contact details accurate."
        actions={
          profile.status === "approved" ? (
            <Link
              href={`/organizers/${profile.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[12px] font-semibold text-ink transition hover:border-brand-300"
            >
              <Globe className="h-3.5 w-3.5" />
              View public page
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null
        }
      />

      {profile.status === "rejected" ? (
        <Alert tone="danger" title="Application rejected">
          {profile.rejection_reason ??
            "Update your profile and contact support to request another review."}
        </Alert>
      ) : null}
      {profile.status === "suspended" ? (
        <Alert tone="danger" title="Account suspended">
          Your events cannot be sold while the organizer account is suspended.
        </Alert>
      ) : null}
      {profile.status === "pending" ? (
        <Alert tone="info" title="Awaiting approval">
          You can finish your profile and prepare drafts. Publishing unlocks after
          TICKORA reviews your application.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent-300" />
              Public details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <OrganizerProfileForm
              organizerId={profile.id}
              defaults={{
                name: profile.name,
                description: profile.description ?? "",
                email: profile.email ?? "",
                phone: profile.phone ?? "",
                city: profile.city ?? "",
                logoUrl: profile.logo_url ?? "",
                bannerUrl: profile.banner_url ?? "",
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Status
            </p>
            <div className="mt-2">
              <StatusBadge kind="organizer" status={profile.status} />
            </div>
            <dl className="mt-4 space-y-2 text-[11px]">
              <div>
                <dt className="text-muted">Slug</dt>
                <dd className="font-mono text-[11px] text-ink">{profile.slug}</dd>
              </div>
              <div>
                <dt className="text-muted">Member since</dt>
                <dd className="font-medium text-ink">
                  {formatDateTime(profile.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Approved</dt>
                <dd className="font-medium text-ink">
                  {profile.approved_at
                    ? formatDateTime(profile.approved_at)
                    : "Not yet"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <BadgeCheck className="h-4 w-4 text-accent-300" />
              Verified organizer
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              TICKORA verifies organizer accounts before events can be published. Your
              buyers can see your approved status on your public page.
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold text-ink">Account security</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Manage your password and signed-in session.
            </p>
            <Link
              href="/attendee/security"
              className="mt-2 inline-flex text-[11.5px] font-semibold text-accent-300 hover:underline"
            >
              Security settings →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
