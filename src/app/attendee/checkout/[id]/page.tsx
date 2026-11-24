import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Lock, MapPin, ShieldCheck } from "lucide-react";
import { PaymentForm } from "@/components/attendee/payment-form";
import { ReservationTimer } from "@/components/attendee/reservation-timer";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { getAttendeeBooking } from "@/lib/data/attendee";
import { getPlatformSettings } from "@/lib/data/settings";
import { getPaymentMethodOptions } from "@/lib/payments";
import { formatDate, formatTime, formatXAF } from "@/lib/utils";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireViewer(`/attendee/checkout/${id}`);
  const detail = await getAttendeeBooking(id, viewer.id);
  if (!detail) notFound();

  if (detail.booking.status !== "pending_payment") {
    redirect(`/attendee/bookings/${detail.booking.id}`);
  }

  const settings = await getPlatformSettings();
  const options = getPaymentMethodOptions().map((option) => ({
    ...option,
    available:
      option.id === "demo"
        ? option.available && settings.demoPaymentsEnabled
        : option.available,
    unavailableReason:
      option.id === "demo" && !settings.demoPaymentsEnabled
        ? "Demo payments are disabled by the platform administrator."
        : option.unavailableReason,
  }));

  const { booking, items } = detail;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/attendee/bookings/${booking.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to booking
        </Link>
        {booking.reservationExpiresAt ? (
          <ReservationTimer expiresAt={booking.reservationExpiresAt} />
        ) : null}
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
          Secure checkout
        </p>
        <h1 className="mt-1.5 font-display text-[30px] leading-tight text-ink sm:text-[36px]">
          Complete your booking
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-6 text-muted">
          Your seats are held until the timer runs out. Tickets are issued only
          after a verified payment.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-ink">Payment method</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted">
                <Lock className="h-3 w-3" />
                Encrypted
              </span>
            </div>
            <p className="mt-1 text-[11.5px] leading-5 text-muted">
              Choose an available method. Providers without production credentials
              stay disabled — TICKORA never fakes a successful charge.
            </p>
            <div className="mt-4">
              <PaymentForm
                bookingId={booking.id}
                amountXaf={booking.totalXaf}
                options={options}
              />
            </div>
          </Card>

          <Alert tone="info" title="Your price is locked">
            Pricing was calculated on the server, including the TICKORA service fee.
            The amount below is exactly what will be charged.
          </Alert>

          <Card className="p-5">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-accent-300" />
              What happens after payment
            </p>
            <ol className="mt-2 space-y-1.5 text-[11.5px] leading-5 text-muted">
              <li>1. The server verifies the payment result.</li>
              <li>2. Inventory is consumed and your order is confirmed.</li>
              <li>3. A unique QR ticket is issued to your account.</li>
              <li>4. You can open it any time under My tickets.</li>
            </ol>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Order summary
            </p>
            <h2 className="mt-1.5 text-[15px] font-semibold leading-snug text-ink">
              {booking.event.title}
            </h2>
            <div className="mt-2 space-y-1 text-[11px] text-muted">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-accent-300" />
                {formatDate(booking.event.startAt)} ·{" "}
                {formatTime(booking.event.startAt)}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent-300" />
                <span className="truncate">
                  {booking.event.venueName}, {booking.event.city}
                </span>
              </p>
            </div>

            <div className="mt-4 space-y-2 border-t border-line pt-3 text-[11.5px]">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="text-muted">
                    {item.quantity} × {item.name}
                  </span>
                  <span className="font-medium text-ink">
                    {formatXAF(item.lineTotalXaf)}
                  </span>
                </div>
              ))}
            </div>

            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[11.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-ink">{formatXAF(booking.subtotalXaf)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Service fee</dt>
                <dd className="text-ink">{formatXAF(booking.serviceFeeXaf)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <dt className="text-[12.5px] font-semibold text-ink">Total</dt>
                <dd className="text-[17px] font-semibold tracking-tight text-ink">
                  {formatXAF(booking.totalXaf)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Contact
            </p>
            <p className="mt-1.5 text-[12px] font-medium text-ink">
              {booking.contactName}
            </p>
            <p className="break-all text-[11px] text-muted">
              {booking.contactEmail}
            </p>
            {booking.contactPhone ? (
              <p className="text-[11px] text-muted">{booking.contactPhone}</p>
            ) : null}
          </Card>

          <p className="px-1 text-[10px] leading-4 text-muted">
            Prices in XAF. By paying you accept the TICKORA{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
              terms
            </Link>{" "}
            and the organizer&apos;s entry policy.
          </p>
        </aside>
      </div>
    </div>
  );
}
