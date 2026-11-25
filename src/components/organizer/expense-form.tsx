"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { addExpense, deleteExpense } from "@/app/actions/expenses";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export const EXPENSE_CATEGORIES = [
  { value: "venue", label: "Venue" },
  { value: "artists", label: "Artists & talent" },
  { value: "marketing", label: "Marketing" },
  { value: "catering", label: "Catering" },
  { value: "photography", label: "Photography & video" },
  { value: "security", label: "Security" },
  { value: "equipment", label: "Equipment" },
  { value: "transportation", label: "Transportation" },
  { value: "staff", label: "Staff" },
  { value: "miscellaneous", label: "Miscellaneous" },
] as const;

export function ExpenseForm({
  events,
}: {
  events: Array<{ id: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    addExpense,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="expense-category">Category</Label>
          <Select id="expense-category" name="category" required defaultValue="venue">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="expense-event">Event (optional)</Label>
          <Select id="expense-event" name="event_id" defaultValue="">
            <option value="">General / not event-specific</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="expense-amount">Amount (XAF)</Label>
          <Input id="expense-amount" name="amount_xaf" type="number" min={1} required placeholder="e.g. 50000" />
        </div>
        <div>
          <Label htmlFor="expense-date">Date</Label>
          <Input id="expense-date" name="expense_date" type="date" />
        </div>
      </div>
      <div>
        <Label htmlFor="expense-description">Description</Label>
        <Input id="expense-description" name="description" required maxLength={300} placeholder="e.g. Sound system rental for Sound City Live" />
      </div>
      <div>
        <Label htmlFor="expense-receipt">Receipt URL (optional)</Label>
        <Input id="expense-receipt" name="receipt_url" type="url" placeholder="https://…" />
      </div>
      <Button type="submit" size="sm" loading={pending}>
        {pending ? "Saving…" : "Add expense"}
      </Button>
      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" ? <Alert tone="success">{state.message}</Alert> : null}
    </form>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  return (
    <form action={deleteExpense}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full p-1.5 text-faint transition hover:bg-danger/15 hover:text-danger"
        aria-label="Delete expense"
        title="Delete expense"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
