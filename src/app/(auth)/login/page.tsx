import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { Alert } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/env";
import { safeRedirect } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your TICKORA account to manage tickets and bookings.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="display-title mt-3 text-[38px] leading-none sm:text-[44px]">
        Sign in to TICKORA
      </h1>
      <p className="mt-3 text-[13px] leading-6 text-muted">
        Your tickets, bookings and organizer tools in one place.
      </p>

      {!isSupabaseConfigured ? (
        <Alert tone="warning" title="Supabase is not connected" className="mt-5">
          Authentication needs <span className="font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
          <span className="font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>. Add them to{" "}
          <span className="font-mono text-[11px]">.env.local</span>, then restart the dev server.
        </Alert>
      ) : null}

      {error === "link_expired" ? (
        <Alert tone="danger" className="mt-5">
          That link has expired. Request a new one below.
        </Alert>
      ) : null}

      <div className="mt-7">
        <LoginForm next={next ? safeRedirect(next, "") : undefined} />
      </div>

      <div className="mt-4">
        <ResendConfirmation />
      </div>

      <p className="mt-6 text-center text-[11px] text-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
