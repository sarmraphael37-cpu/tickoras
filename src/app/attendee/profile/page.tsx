import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Mail, ShieldCheck, User } from "lucide-react";
import { ProfileForm } from "@/components/attendee/account-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { primaryRole } from "@/lib/auth";
import { titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function AttendeeProfilePage() {
  const viewer = await requireViewer("/attendee/profile");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Keep your name, phone number and photo current so organizers and support can recognise you."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-accent-300" />
              Personal details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ProfileForm
              userId={viewer.id}
              defaultName={viewer.fullName}
              defaultPhone={viewer.phone ?? ""}
              defaultAvatar={viewer.avatarUrl ?? ""}
              email={viewer.email}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Account
            </p>
            <div className="mt-3 space-y-3 text-[12px]">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
                <div className="min-w-0">
                  <p className="font-medium text-ink">Email</p>
                  <p className="break-all text-[11px] text-muted">{viewer.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
                <div>
                  <p className="font-medium text-ink">Role</p>
                  <Badge tone="brand" className="mt-1">
                    {titleCase(primaryRole(viewer))}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[10.5px] leading-4 text-muted">
              Email changes go through secure authentication. Contact support if you
              need to move your account to a different address.
            </p>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-accent-300" />
              Account security
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Update your password, preferences and session from Settings.
            </p>
            <Link
              href="/attendee/settings"
              className="mt-3 inline-flex text-[11.5px] font-semibold text-accent-300 hover:underline"
            >
              Manage settings →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
