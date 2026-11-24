"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialActionState,
  );

  return (
    <form action={formAction} noValidate className="space-y-4">
      <div>
        <Label htmlFor="forgot-email">Email address</Label>
        <Input
          id="forgot-email"
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

      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" ? <Alert tone="success">{state.message}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={pending}>
        Send reset link
        <ArrowRight className="h-4 w-4" />
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </form>
  );
}
