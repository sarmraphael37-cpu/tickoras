"use client";

import { useActionState } from "react";
import { cancelBooking, requestRefund } from "@/app/actions/bookings";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";

export function CancelBookingForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(
    cancelBooking,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Release this reservation? The seats will become available to other attendees.",
          )
        ) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        {pending ? "Releasing…" : "Release reservation"}
      </Button>
      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}
    </form>
  );
}

export function RefundRequestForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(
    requestRefund,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <div>
        <Label htmlFor="refund-reason">Reason for refund</Label>
        <Textarea
          id="refund-reason"
          name="reason"
          minLength={10}
          maxLength={1000}
          required
          placeholder="Tell the organizer and TICKORA support what happened."
          className="min-h-[90px] text-[12.5px]"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        {pending ? "Submitting…" : "Request a refund"}
      </Button>
      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}
    </form>
  );
}
