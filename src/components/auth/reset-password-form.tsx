"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { updatePassword } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialActionState);

  if (state.status === "success") {
    return (
      <div>
        <Alert tone="success">{state.message}</Alert>
        <Link
          href="/login"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-[13px] font-semibold text-white transition hover:bg-brand-700"
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4">
      <div>
        <Label htmlFor="reset-password">New password</Label>
        <Input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
        {state.fieldErrors?.password ? (
          <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.password[0]}</p>
        ) : null}
        <p className="mt-1.5 text-[10px] text-muted">
          Include at least one letter and one number.
        </p>
      </div>
      <div>
        <Label htmlFor="reset-confirm">Confirm new password</Label>
        <Input
          id="reset-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Repeat your new password"
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="mt-1.5 text-xs text-danger">
            {state.fieldErrors.confirmPassword[0]}
          </p>
        ) : null}
      </div>

      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={pending}>
        Update password
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
