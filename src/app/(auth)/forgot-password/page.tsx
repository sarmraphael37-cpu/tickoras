import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a secure password reset link for your TICKORA account.",
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <p className="eyebrow">Account recovery</p>
      <h1 className="display-title mt-3 text-[38px] leading-none sm:text-[44px]">
        Reset your password
      </h1>
      <p className="mt-3 text-[13px] leading-6 text-muted">
        Enter the email address on your account. If it exists, we&apos;ll send a
        time-limited reset link.
      </p>
      <div className="mt-7">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
