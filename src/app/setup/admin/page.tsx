import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { bootstrapAdminAction } from "@/app/actions/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ActionForm } from "@/components/dashboard/action-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Administrator access",
  description: "One-time setup for the first TICKORA administrator account.",
};

export default async function AdminSetupPage() {
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login?next=%2Fsetup%2Fadmin");
  }

  const configured = Boolean(env.ADMIN_BOOTSTRAP_EMAIL);
  const allowed =
    configured &&
    viewer.email.trim().toLowerCase() === env.ADMIN_BOOTSTRAP_EMAIL;

  return (
    <>
      <SiteHeader />
      <main className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <p className="eyebrow">One-time setup</p>
            <h1 className="page-title mt-2">Administrator access</h1>
            <p className="mt-3 text-[13px] leading-6 text-muted">
              New accounts are created as attendees or organizers. Administrator
              access is never granted by registration — it requires an explicit,
              server-side bootstrap.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-300" />
                Your account
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="space-y-3 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-muted">Signed in as</dt>
                  <dd className="font-medium text-ink">{viewer.email}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-muted">Bootstrap configured for</dt>
                  <dd className="font-medium text-ink">
                    {configured ? env.ADMIN_BOOTSTRAP_EMAIL : "Not configured"}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-muted">Current roles</dt>
                  <dd className="flex flex-wrap gap-1">
                    {viewer.roles.map((role) => (
                      <Badge key={role} tone="brand" className="capitalize">
                        {role}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </dl>

              {!configured ? (
                <Alert tone="warning" className="mt-5">
                  Add <code className="font-mono">ADMIN_BOOTSTRAP_EMAIL</code> to
                  your <code className="font-mono">.env.local</code> with this email
                  address, restart the server, then return to this page.
                </Alert>
              ) : !allowed ? (
                <Alert tone="danger" className="mt-5">
                  This account is not the configured bootstrap account. Sign in with{" "}
                  <span className="font-medium">{env.ADMIN_BOOTSTRAP_EMAIL}</span>.
                </Alert>
              ) : viewer.roles.includes("admin") ? (
                <Alert tone="success" className="mt-5">
                  Administrator access is already active for this account.
                </Alert>
              ) : (
                <div className="mt-5">
                  <ActionForm
                    action={bootstrapAdminAction}
                    submitLabel="Grant administrator access"
                    pendingLabel="Granting…"
                    successMessage="Administrator access granted. Open the admin dashboard."
                    className="space-y-3"
                  >
                    <span className="sr-only">Confirm bootstrap</span>
                  </ActionForm>
                </div>
              )}

              {viewer.roles.includes("admin") ? (
                <Link
                  href="/admin"
                  className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-300 hover:underline"
                >
                  Open admin dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-accent-300" />
              Prefer SQL?
            </p>
            <p className="mt-2 text-[11.5px] leading-5 text-muted">
              Run this in the Supabase SQL editor, replacing the email with yours:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-base p-3 font-mono text-[10.5px] leading-5 text-ice">
              {`insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('you@example.com')
on conflict (user_id, role) do nothing;`}
            </pre>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
