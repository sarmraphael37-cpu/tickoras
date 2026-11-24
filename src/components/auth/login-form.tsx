"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { signIn } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialActionState);

  return (
    <form action={formAction} noValidate className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <Label htmlFor="login-email">Email address</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link
            href="/forgot-password"
            className="mb-1.5 text-[11px] font-medium text-accent-300 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
        />
      </div>

      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={pending}>
        Sign in
        <ArrowRight className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
          New to TICKORA?
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Link
        href="/register"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-card text-[13px] font-semibold text-ink transition hover:bg-brand-50"
      >
        <Mail className="h-4 w-4 text-accent-300" />
        Create an account
      </Link>
    </form>
  );
}
