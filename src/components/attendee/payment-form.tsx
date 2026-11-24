"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Lock, ShieldCheck } from "lucide-react";
import { payForBooking } from "@/app/actions/bookings";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatXAF } from "@/lib/utils";

export interface PaymentOption {
  id: "demo" | "mtn_momo" | "orange_money" | "card";
  name: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  isDemo: boolean;
}

export function PaymentForm({
  bookingId,
  amountXaf,
  options,
}: {
  bookingId: string;
  amountXaf: number;
  options: PaymentOption[];
}) {
  const [state, formAction] = useActionState(payForBooking, initialActionState);
  const firstAvailable = options.find((option) => option.available);
  const [selected, setSelected] = useState(firstAvailable?.id ?? "demo");
  const selectedOption = options.find((option) => option.id === selected);
  const hasAvailable = Boolean(firstAvailable);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="booking_id" value={bookingId} />

      <div className="space-y-2.5">
        {options.map((option) => {
          const active = selected === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
                active
                  ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-200"
                  : "border-line bg-card hover:border-brand-200",
                !option.available && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="provider"
                value={option.id}
                checked={active}
                disabled={!option.available}
                onChange={() => setSelected(option.id)}
                className="mt-1 h-3.5 w-3.5 accent-brand-700"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-ink">
                    {option.name}
                  </span>
                  {option.isDemo ? (
                    <Badge tone="outline" className="font-mono text-[9px] tracking-[0.1em]">
                      DEMO
                    </Badge>
                  ) : null}
                  {!option.available ? (
                    <Badge tone="neutral">Not configured</Badge>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted">
                  {option.available ? option.description : option.unavailableReason}
                </span>
              </span>
              {active && option.available ? (
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      {selectedOption?.isDemo ? (
        <Alert tone="warning" title="Demo payment — no real money">
          This confirms your order with a clearly-labelled test transaction. Real
          MoMo, Orange Money and card providers stay disabled until verified
          credentials and webhook signatures are configured.
        </Alert>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!selectedOption?.available}
      >
        <Lock className="h-4 w-4" />
        Pay {formatXAF(amountXaf)}
      </Button>

      {state.status === "error" ? (
        <Alert tone="danger" title="Payment not completed">
          {state.message}
        </Alert>
      ) : null}

      <div className="flex items-start gap-2 text-[10.5px] leading-4 text-muted">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-accent-300" />
        <p>
          Payment is confirmed on the server and tickets are issued only after a
          verified success. Refreshing or closing this page will not duplicate
          your order.
        </p>
      </div>

      {!hasAvailable ? (
        <p className="flex items-center gap-1.5 text-[11px] text-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          No payment method is currently configured. Contact support.
        </p>
      ) : null}
    </form>
  );
}
