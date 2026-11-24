import Link from "next/link";
import { UserX } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AccountSuspendedPage() {
  return (
    <main className="flex min-h-screen flex-col bg-cream">
      <div className="container-page flex h-20 items-center">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
            <UserX className="h-5 w-5" />
          </span>
          <h1 className="display-title mt-4 text-[30px]">Account suspended</h1>
          <p className="mt-2 text-[12px] leading-6 text-muted">
            This account can no longer access TICKORA. Contact support@tickora.cm
            with your account email to request a review.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <a
              href="mailto:support@tickora.cm"
              className="inline-flex h-11 items-center justify-center rounded-full bg-brand-600 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              Contact support
            </a>
            <form action="/auth/signout">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-line text-[13px] font-semibold text-ink hover:bg-brand-50"
              >
                Sign out
              </button>
            </form>
            <Link href="/" className="text-[11px] text-muted hover:text-ink">
              Back to the public site
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
