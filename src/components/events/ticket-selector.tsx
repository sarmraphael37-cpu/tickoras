"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowRight, Minus, Plus, ShieldCheck, Ticket } from "lucide-react";
import { startBooking } from "@/app/actions/bookings";
import { initialActionState } from "@/lib/action-state";
import type { TicketTypeSummary } from "@/lib/domain";
import { calculateServiceFee } from "@/lib/pricing";
import { cn, formatXAF } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TicketSelector({
  eventId,
  eventSlug,
  eventTitle,
  ticketTypes,
  serviceFeePercent,
  minServiceFee,
  isPreview,
  idempotencyKey,
}: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  ticketTypes: TicketTypeSummary[];
  serviceFeePercent: number;
  minServiceFee: number;
  isPreview: boolean;
  idempotencyKey: string;
}) {
  const [state, formAction] = useActionState(startBooking, initialActionState);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const subtotal = useMemo(
    () =>
      ticketTypes.reduce(
        (sum, ticket) => sum + (quantities[ticket.id] ?? 0) * ticket.priceXaf,
        0,
      ),
    [quantities, ticketTypes],
  );
  const itemCount = Object.values(quantities).reduce((a, b) => a + b, 0);
  const estimatedFee = calculateServiceFee(subtotal, {
    percent: serviceFeePercent,
    minimum: minServiceFee,
  });

  function setQuantity(ticket: TicketTypeSummary, next: number) {
    const cap = Math.min(
      ticket.available,
      ticket.maxPerOrder,
      Math.max(1, ticket.minPerOrder || 1),
    );
    const value = Math.min(Math.max(0, next), cap);
    setQuantities((prev) => ({ ...prev, [ticket.id]: value }));
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center shadow-card">
        <Ticket className="mx-auto h-6 w-6 text-muted" />
        <p className="mt-3 text-sm font-semibold text-ink">Tickets not on sale yet</p>
        <p className="mt-1 text-xs text-muted">
          The organizer has not released ticket tiers for this event.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="overflow-hidden rounded-2xl border border-line bg-card shadow-float">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="event_path" value={`/events/${eventSlug}`} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <input type="hidden" name="event_title" value={eventTitle} />

      <div className="border-b border-line bg-surface px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-ink">Choose your tickets</p>
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
            {itemCount} selected
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted">Prices include VAT where applicable.</p>
      </div>

      <div className="divide-y divide-line">
        {ticketTypes.map((ticket) => {
          const quantity = quantities[ticket.id] ?? 0;
          const soldOut = ticket.available <= 0;
          const capped = Math.min(ticket.available, ticket.maxPerOrder);
          return (
            <div key={ticket.id} className={cn("px-5 py-4", !ticket.salesOpen && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink">{ticket.name}</p>
                    {ticket.available > 0 && ticket.available <= 20 ? (
                      <Badge tone="warning">Few left</Badge>
                    ) : null}
                    {soldOut ? <Badge tone="neutral">Sold out</Badge> : null}
                  </div>
                  {ticket.description ? (
                    <p className="mt-1 text-[11px] leading-4 text-muted">{ticket.description}</p>
                  ) : null}
                  {!ticket.salesOpen && !soldOut ? (
                    <p className="mt-1 text-[11px] font-medium text-warning">
                      Sales closed
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-[13px] font-semibold text-ink">
                  {ticket.priceXaf === 0 ? "Free" : formatXAF(ticket.priceXaf)}
                </p>
              </div>

              {ticket.salesOpen ? (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-muted">
                    Max {Math.min(capped, 10)} per order
                  </p>
                  <div className="flex items-center rounded-full border border-line">
                    <button
                      type="button"
                      onClick={() => setQuantity(ticket, quantity - 1)}
                      disabled={quantity <= 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-brand-50 hover:text-accent-200 disabled:opacity-30"
                      aria-label={`Remove one ${ticket.name} ticket`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-[12px] font-semibold text-ink">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(ticket, quantity + 1)}
                      disabled={quantity >= capped}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-brand-50 hover:text-accent-200 disabled:opacity-30"
                      aria-label={`Add one ${ticket.name} ticket`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}

              {quantity > 0 ? (
                <input type="hidden" name={`qty_${ticket.id}`} value={quantity} />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-line bg-surface px-5 py-4">
        <div className="space-y-2 text-[12px]">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="font-medium text-ink">{formatXAF(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Service fee (est.)</span>
            <span className="font-medium text-ink">
              {subtotal > 0 ? formatXAF(estimatedFee) : "—"}
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-2.5">
            <span className="text-[13px] font-semibold text-ink">Total</span>
            <span className="text-[18px] font-semibold tracking-tight text-ink">
              {formatXAF(subtotal + estimatedFee)}
            </span>
          </div>
        </div>

        {isPreview ? (
          <div className="mt-4">
            <Button type="button" size="lg" className="w-full" disabled>
              Checkout requires Supabase
            </Button>
            <p className="mt-2 text-center text-[10px] leading-4 text-muted">
              This is the sample catalogue. Connect Supabase to accept real bookings.
            </p>
          </div>
        ) : (
          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full"
            disabled={itemCount === 0}
          >
            {itemCount === 0 ? "Select tickets to continue" : "Continue to checkout"}
            {itemCount > 0 ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        )}

        {state.status === "error" ? (
          <Alert tone="danger" className="mt-3">
            {state.message}
          </Alert>
        ) : null}

        <div className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-muted">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-accent-300" />
          <p>
            Seats are reserved for 15 minutes. The service fee is confirmed
            server-side before payment.
          </p>
        </div>
      </div>
    </form>
  );
}
