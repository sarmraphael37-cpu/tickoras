"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/action-state";

type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function ActionForm({
  action,
  hidden,
  children,
  submitLabel,
  pendingLabel = "Working…",
  variant = "primary",
  size = "sm",
  confirm,
  className,
  buttonClassName,
  successMessage,
}: {
  action: ServerAction;
  hidden?: Record<string, string | number | boolean | undefined | null>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "subtle" | "danger" | "link" | "white";
  size?: "sm" | "md" | "lg";
  confirm?: string;
  className?: string;
  buttonClassName?: string;
  successMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {hidden
        ? Object.entries(hidden).map(([name, value]) =>
            value === undefined || value === null ? null : (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ),
          )
        : null}
      {children}
      <Button
        type="submit"
        variant={variant}
        size={size}
        loading={pending}
        className={buttonClassName}
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
      {state.status === "error" ? (
        <Alert tone="danger" className="mt-2">
          {state.message}
        </Alert>
      ) : null}
      {state.status === "success" ? (
        <Alert tone="success" className="mt-2">
          {successMessage ?? state.message}
        </Alert>
      ) : null}
    </form>
  );
}
