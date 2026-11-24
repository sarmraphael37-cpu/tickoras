"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Building2, Check, UserRound } from "lucide-react";
import { signUp } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function RegisterForm({
  initialType,
  next,
}: {
  initialType: "attendee" | "organizer";
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(signUp, initialActionState);
  const [accountType, setAccountType] = useState(initialType);

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-brand-200 bg-card p-7 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-accent-300">
          <Check className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-[26px] text-ink">Check your inbox</h2>
        <p className="mt-2 text-[12px] leading-6 text-muted">{state.message}</p>
        <Link
          href="/login"
          className="mt-5 inline-flex h-10 items-center rounded-full bg-brand-600 px-5 text-[12px] font-semibold text-white hover:bg-brand-700"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input type="hidden" name="accountType" value={accountType} />

      <div>
        <p className="mb-2 text-[13px] font-medium text-ink">I&apos;m joining as</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              id: "attendee" as const,
              icon: UserRound,
              title: "Attendee",
              text: "Discover and book events",
            },
            {
              id: "organizer" as const,
              icon: Building2,
              title: "Organizer",
              text: "Create and sell tickets",
            },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAccountType(option.id)}
              aria-pressed={accountType === option.id}
              className={cn(
                "rounded-xl border p-3.5 text-left transition",
                accountType === option.id
                  ? "border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/30"
                  : "border-line bg-card hover:border-brand-200",
              )}
            >
              <div className="flex items-center justify-between">
                <option.icon
                  className={cn(
                    "h-4 w-4",
                    accountType === option.id ? "text-accent-300" : "text-muted",
                  )}
                />
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    accountType === option.id
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line",
                  )}
                >
                  {accountType === option.id ? <Check className="h-2.5 w-2.5" /> : null}
                </span>
              </div>
              <p className="mt-2 text-[12px] font-semibold text-ink">{option.title}</p>
              <p className="mt-0.5 text-[10px] text-muted">{option.text}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="register-name">Full name</Label>
        <Input
          id="register-name"
          name="fullName"
          autoComplete="name"
          required
          placeholder="e.g. Ada Nkeng"
        />
        {state.fieldErrors?.fullName ? (
          <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.fullName[0]}</p>
        ) : null}
      </div>

      {accountType === "organizer" ? (
        <div>
          <Label htmlFor="register-org">Organization name</Label>
          <Input
            id="register-org"
            name="organizationName"
            required
            placeholder="e.g. Atlantic Live"
            autoComplete="organization"
          />
          {state.fieldErrors?.organizationName ? (
            <p className="mt-1.5 text-xs text-danger">
              {state.fieldErrors.organizationName[0]}
            </p>
          ) : null}
          <p className="mt-1.5 text-[10px] leading-4 text-muted">
            Your organizer profile will be reviewed before you can publish events.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="register-email">Email address</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
          {state.fieldErrors?.email ? (
            <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.email[0]}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="register-phone">Phone number</Label>
          <Input
            id="register-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            placeholder="+237 6XX XXX XXX"
          />
          {state.fieldErrors?.phone ? (
            <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.phone[0]}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="8+ characters"
          />
          {state.fieldErrors?.password ? (
            <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.password[0]}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="register-confirm">Confirm password</Label>
          <Input
            id="register-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Repeat password"
          />
          {state.fieldErrors?.confirmPassword ? (
            <p className="mt-1.5 text-xs text-danger">
              {state.fieldErrors.confirmPassword[0]}
            </p>
          ) : null}
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-lg border border-line bg-card p-3 text-[11px] leading-5 text-muted">
        <input
          type="checkbox"
          name="acceptTerms"
          className="mt-0.5 h-4 w-4 rounded border-line text-accent-300 accent-brand-700"
        />
        <span>
          I agree to the TICKORA{" "}
          <Link href="/terms" className="font-medium text-accent-300 underline underline-offset-2">
            terms of service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-accent-300 underline underline-offset-2">
            privacy policy
          </Link>
          .
        </span>
      </label>
      {state.fieldErrors?.acceptTerms ? (
        <p className="text-xs text-danger">{state.fieldErrors.acceptTerms[0]}</p>
      ) : null}

      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={pending}>
        {accountType === "organizer" ? "Create organizer account" : "Create my account"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
