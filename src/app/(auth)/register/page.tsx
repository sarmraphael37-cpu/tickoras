import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { Alert } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/env";
import { safeRedirect } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Join TICKORA as an attendee or organizer. Discover events across Cameroon and sell tickets securely.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; next?: string }>;
}) {
  const { type, next } = await searchParams;
  const isOrganizer = type === "organizer";

  return (
    <div>
      <p className="eyebrow">{isOrganizer ? "For organizers" : "Join TICKORA"}</p>
      <h1 className="display-title mt-3 text-[38px] leading-none sm:text-[44px]">
        {isOrganizer ? "Bring your event to life." : "Start with one great night."}
      </h1>
      <p className="mt-3 text-[13px] leading-6 text-muted">
        {isOrganizer
          ? "Create an organizer account to draft events, sell tickets and manage entry."
          : "Create an account to book events, keep your tickets and check in without the queue."}
      </p>

      {isOrganizer ? (
        <Alert tone="info" className="mt-5">
          <span className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Organizer accounts are reviewed manually. You can prepare drafts
              while pending — publishing is enabled only after approval.
            </span>
          </span>
        </Alert>
      ) : null}

      {!isSupabaseConfigured ? (
        <Alert tone="warning" title="Supabase is not connected" className="mt-5">
          Add <span className="font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
          <span className="font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to{" "}
          <span className="font-mono text-[11px]">.env.local</span> to enable registration.
        </Alert>
      ) : null}

      <div className="mt-7">
        <RegisterForm
          initialType={isOrganizer ? "organizer" : "attendee"}
          next={next ? safeRedirect(next, "") : undefined}
        />
      </div>

      <p className="mt-6 text-center text-[12px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent-300 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
