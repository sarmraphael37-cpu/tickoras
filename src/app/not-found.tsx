import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-display text-[92px] leading-none text-accent-200">404</p>
        <h1 className="display-title mt-2 text-[34px]">This page has left the venue.</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          The event may have ended, been unpublished, or the link might be wrong.
          There is plenty more happening across Cameroon.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/events"
            className="inline-flex h-11 items-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Discover events
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-line bg-card px-6 text-sm font-semibold text-ink transition hover:bg-brand-50"
          >
            Back home
          </Link>
        </div>
      </main>
    </>
  );
}
