import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/attendee/account-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Security" };

export default async function AttendeeSecurityPage() {
  const viewer = await requireViewer("/attendee/security");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Security"
        description="Protect your account and the tickets attached to it."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent-300" />
              Change password
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-accent-300" />
              Session
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              You are signed in as{" "}
              <span className="font-medium text-ink">{viewer.email}</span>. Signing out
              ends this session on this device.
            </p>
            <form action="/auth/signout" className="mt-3">
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold text-ink">Forgot your password?</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              If you cannot sign in, request a secure reset link by email.
            </p>
            <Link
              href="/forgot-password"
              className="mt-2 inline-flex text-[11.5px] font-semibold text-accent-300 hover:underline"
            >
              Send a reset link →
            </Link>
          </Card>

          <p className="px-1 text-[10px] leading-4 text-muted">
            TICKORA support can never ask for your password. Account deletion is
            handled by support so we can protect your ticket and payment history.
          </p>
        </div>
      </div>
    </div>
  );
}
