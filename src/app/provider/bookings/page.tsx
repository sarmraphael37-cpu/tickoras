import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import {
  QuoteForm,
  ServiceBookingActions,
  ServiceStatusBadge,
} from "@/components/marketplace/marketplace-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewer } from "@/lib/auth";
import { getMyProviderProfile, getProviderBookings } from "@/lib/data/marketplace";
import { formatDate, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Booking requests" };
export const dynamic = "force-dynamic";

export default async function ProviderBookingsPage() {
  const viewer = await requireViewer("/provider/bookings");
  const provider = await getMyProviderProfile(viewer.id);
  if (!provider) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No provider profile"
        description="Create your provider profile from the overview page first."
        actionLabel="Go to overview"
        actionHref="/provider"
      />
    );
  }

  const bookings = await getProviderBookings(viewer.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-ink">
          Booking requests
        </h1>
        <p className="mt-1 text-[12px] text-muted">
          Review requests, send quotations and manage active jobs.
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Briefcase}
              title="No requests yet"
              description="Organizers will find you through the marketplace once your profile is complete."
            />
          </CardContent>
        </Card>
      ) : (
        bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-[15px]">{booking.title}</CardTitle>
                <ServiceStatusBadge status={booking.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
                <span className="font-mono">{booking.reference}</span>
                <span>From {booking.counterpartyName}</span>
                {booking.eventDate ? <span>{formatDate(booking.eventDate)}</span> : null}
                {booking.budgetXaf ? <span>Budget: {formatXAF(booking.budgetXaf)}</span> : null}
                {booking.eventTitle ? <span>Event: {booking.eventTitle}</span> : null}
              </div>
              {booking.details ? (
                <p className="rounded-lg bg-surface p-3 text-[12px] leading-5 text-muted">
                  {booking.details}
                </p>
              ) : null}
              {booking.quotedAmountXaf ? (
                <p className="text-[12.5px] text-ink">
                  Your quotation: <span className="font-semibold">{formatXAF(booking.quotedAmountXaf)}</span>
                  {booking.quoteNote ? <span className="text-muted"> — {booking.quoteNote}</span> : null}
                </p>
              ) : null}
              {["pending", "quotation_submitted"].includes(booking.status) ? (
                <QuoteForm bookingId={booking.id} />
              ) : null}
              <ServiceBookingActions
                bookingId={booking.id}
                status={booking.status}
                role="provider"
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
