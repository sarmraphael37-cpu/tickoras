import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert } from "@/components/ui/alert";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your TICKORA account.",
};

export default async function ResetPasswordPage() {
  const viewer = await getViewer();

  return (
    <div>
      <p className="eyebrow">Secure your account</p>
      <h1 className="display-title mt-3 text-[38px] leading-none sm:text-[44px]">
        Choose a new password
      </h1>
      <p className="mt-3 text-[13px] leading-6 text-muted">
        Use a password you don&apos;t use anywhere else. You&apos;ll be signed in
        with it from now on.
      </p>

      {!isSupabaseConfigured || !viewer ? (
        <Alert tone="warning" className="mt-5">
          <p>
            Open this page from a valid password reset link. If your link has
            expired,{" "}
            <Link href="/forgot-password" className="font-semibold underline underline-offset-2">
              request a new one
            </Link>
            .
          </p>
        </Alert>
      ) : (
        <div className="mt-7">
          <ResetPasswordForm />
        </div>
      )}
    </div>
  );
}
