"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import {
  cancelSubscription,
  promoteEvent,
  subscribeToPlan,
  updatePlanPrice,
  settlePlatformPayment,
} from "@/app/actions/billing";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

function Messages({ state }: { state: ActionState }) {
  if (state.status === "error") return <Alert tone="danger">{state.message}</Alert>;
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return null;
}

const PROVIDERS = [
  { id: "demo", label: "Demo payment (testing)" },
  { id: "mtn_momo", label: "MTN Mobile Money" },
  { id: "orange_money", label: "Orange Money" },
  { id: "card", label: "Card" },
];

export function PlanCheckoutForm({
  planId,
  planName,
  priceXaf,
  currentPlan,
}: {
  planId: string;
  planName: string;
  priceXaf: number;
  currentPlan: boolean;
}) {
  const [state, formAction, pending] = useActionState(subscribeToPlan, initialActionState);
  if (currentPlan) {
    return <p className="text-[11px] font-medium text-accent-300">Current plan</p>;
  }
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="plan_id" value={planId} />
      {priceXaf > 0 ? (
        <Select name="provider" defaultValue="demo" aria-label="Payment method">
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </Select>
      ) : null}
      <Button type="submit" size="sm" className="w-full" loading={pending}>
        {priceXaf === 0 ? `Switch to ${planName}` : `Subscribe — ${priceXaf.toLocaleString()} FCFA/mo`}
      </Button>
      <Messages state={state} />
    </form>
  );
}

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Button
        size="sm"
        variant="outline"
        loading={pending}
        onClick={async () => {
          setPending(true);
          setMessage(null);
          const res = await cancelSubscription(subscriptionId);
          setPending(false);
          setMessage(res.status === "error" ? res.message ?? "Failed" : "Cancelled at period end");
        }}
      >
        Cancel at period end
      </Button>
      {message ? <p className="text-[10px] text-muted">{message}</p> : null}
    </div>
  );
}

export function PromoteEventForm({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const [state, formAction, pending] = useActionState(promoteEvent, initialActionState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="event_id" value={eventId} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`days-${eventId}`}>Days</Label>
          <Input id={`days-${eventId}`} name="days" type="number" min={1} max={30} defaultValue={7} />
        </div>
        <div>
          <Label htmlFor={`place-${eventId}`}>Placement</Label>
          <Select id={`place-${eventId}`} name="placement" defaultValue="featured_badge">
            <option value="featured_badge">Featured badge (1x)</option>
            <option value="sponsored">Sponsored (2x)</option>
            <option value="homepage">Homepage (3x)</option>
          </Select>
        </div>
      </div>
      <Select name="provider" defaultValue="demo" aria-label="Payment method">
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        <Star className="h-3.5 w-3.5" /> Promote {eventTitle.slice(0, 24)}
      </Button>
      <Messages state={state} />
      <p className="text-[10px] text-muted">2,000 FCFA/day base × placement multiplier.</p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export function PlanPriceForm({ planId, price }: { planId: string; price: number }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        setMessage(null);
        const res = await updatePlanPrice(planId, Number(fd.get("price_xaf")));
        setPending(false);
        setMessage(res.status === "error" ? res.message ?? "Failed" : "Saved");
      }}
    >
      <Input name="price_xaf" type="number" min={0} defaultValue={price} className="h-8 w-28 text-[12px]" />
      <Button type="submit" size="sm" variant="outline" loading={pending}>Save</Button>
      {message ? <span className="text-[10px] text-muted">{message}</span> : null}
    </form>
  );
}

export function SettlePaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        setMessage(null);
        const res = await settlePlatformPayment(
          paymentId,
          String(fd.get("reference") ?? ""),
        );
        setPending(false);
        setMessage(res.status === "error" ? res.message ?? "Failed" : "Settled");
      }}
    >
      <Input name="reference" placeholder="MoMo ref (optional)" className="h-8 w-36 text-[11px]" />
      <Button type="submit" size="sm" variant="outline" loading={pending}>Settle</Button>
      {message ? <span className="text-[10px] text-muted">{message}</span> : null}
    </form>
  );
}
