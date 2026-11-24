import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  KeyRound,
  LogOut,
  Mail,
  Settings as SettingsIcon,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  ChangePasswordForm,
  ProfileForm,
} from "@/components/attendee/account-forms";
import { NotificationPreferencesForm } from "@/components/attendee/notification-preferences";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer, primaryRole } from "@/lib/auth";
import { titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function AttendeeSettingsPage() {
  const viewer = await requireViewer("/attendee/settings");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your account details, security, notification preferences and active session."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card id="account">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-accent-300" />
              Account information
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

        <div className="space-y-5">
          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-accent-300" />
              Your account
            </p>
            <div className="mt-3 space-y-3 text-[12px]">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
                <div className="min-w-0">
                  <p className="font-medium text-ink">Email address</p>
                  <p className="break-all text-[11px] text-muted">{viewer.email}</p>
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-ink">Primary role</p>
                <Badge tone="brand">{titleCase(primaryRole(viewer))}</Badge>
              </div>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[10.5px] leading-4 text-muted">
              Email changes and password resets use secure Supabase Auth flows.
              TICKORA support will never ask for your password.
            </p>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <LogOut className="h-4 w-4 text-accent-300" />
              Session
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Signing out ends this session on this device. Your tickets stay in your
              account and will be here when you return.
            </p>
            <form action="/auth/signout" className="mt-3">
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </form>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent-300" />
              Security settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ChangePasswordForm />
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[12px] font-semibold text-ink">
                Password recovery
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                If you cannot sign in, request a secure reset link by email.
              </p>
              <Link
                href="/forgot-password"
                className="mt-2 inline-flex text-[11.5px] font-semibold text-accent-300 hover:underline"
              >
                Send a reset link →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card id="notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-accent-300" />
              Notification preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <NotificationPreferencesForm />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 glass-subtle rounded-xl p-4 text-[10.5px] leading-4 text-muted">
        <SettingsIcon className="mt-px h-3.5 w-3.5 shrink-0 text-accent-300" />
        <p>
          Profile, password and session changes take effect immediately. Notification
          preferences are saved on this device and filter the notification centre;
          essential service and security notices are always shown.
        </p>
      </div>
    </div>
  );
}
