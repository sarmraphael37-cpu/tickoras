import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { dashboardPathFor, getViewer } from "@/lib/auth";

export default async function UnauthorizedPage() {
  const viewer = await getViewer();

  return (
    <main className="flex min-h-screen flex-col bg-cream">
      <div className="container-page flex h-20 items-center">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <h1 className="display-title mt-4 text-[30px]">Not your door</h1>
          <p className="mt-2 text-[12px] leading-6 text-muted">
            This area is restricted to a different account role. If you believe
            this is a mistake, contact support@tickora.cm.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {viewer ? (
              <Link
                href={dashboardPathFor(viewer)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-brand-600 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                Go to my dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-full bg-brand-600 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-line text-[13px] font-semibold text-ink hover:bg-brand-50"
            >
              Back to TICKORA
            </Link>
            {viewer ? (
              <Link
                href="/setup/admin"
                className="mt-1 text-[11px] font-medium text-accent-300 hover:underline"
              >
                Setting up the first administrator? Open bootstrap →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
