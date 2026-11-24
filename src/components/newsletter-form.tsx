"use client";

import { useActionState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { initialActionState } from "@/lib/action-state";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction] = useActionState(
    subscribeToNewsletter,
    initialActionState,
  );

  if (state.status === "success") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-accent-200">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100">
          <Check className="h-3.5 w-3.5" />
        </span>
        {state.message}
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={compact ? "newsletter-compact" : "newsletter"} className="sr-only">
          Email address
        </label>
        <input
          id={compact ? "newsletter-compact" : "newsletter"}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-sm text-ink placeholder:text-muted focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          Subscribe
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {state.status === "error" ? (
        <p className="mt-2 text-xs font-medium text-danger">{state.message}</p>
      ) : (
        <p className="mt-2 text-[11px] leading-5 text-muted">
          Event drops and city guides. No noise, unsubscribe anytime.
        </p>
      )}
    </form>
  );
}
