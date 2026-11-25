"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { resendConfirmation } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ResendConfirmation() {
  const [state, formAction, pending] = useActionState(
    resendConfirmation,
    initialActionState,
  );

  return (
    <details className="group rounded-xl border border-line bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[12px] font-medium text-muted transition hover:text-ink [&::-webkit-details-marker]:hidden">
        <MailCheck className="h-4 w-4 text-accent-300" />
        Didn&apos;t get the confirmation email?
      </summary>
      <form action={formAction} className="space-y-3 border-t border-line p-4">
        <div>
          <Label htmlFor="resend-email">Email address</Label>
          <Input
            id="resend-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" loading={pending}>
          {pending ? "Sending…" : "Resend confirmation link"}
        </Button>
        {state.status === "error" ? (
          <Alert tone="danger">{state.message}</Alert>
        ) : null}
        {state.status === "success" ? (
          <Alert tone="success">{state.message}</Alert>
        ) : null}
      </form>
    </details>
  );
}
