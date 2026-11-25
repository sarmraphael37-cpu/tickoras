import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock,
  MapPin,
  QrCode,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TicketSelector } from "@/components/events/ticket-selector";
import { ShareButton } from "@/components/events/share-button";
import { EventCard } from "@/components/events/event-card";
import { EventMap, directionsUrl } from "@/components/maps/map-view";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfigNotice, DemoBadge } from "@/components/system/config-notice";
import { getEventBySlug, getRelatedEvents } from "@/lib/data/public";
import { getPlatformSettings } from "@/lib/data/settings";
import {
  DEFAULT_TIMEZONE,
  formatDate,
  formatShortDate,
  formatTime,
  formatXAF,
} from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description:
      event.shortDescription ??
      `Get tickets for ${event.title} at ${event.venueName}, ${event.city}.`,
    alternates: { canonical: `/events/${slug}` },
    openGraph: {
      title: event.title,
      description: event.shortDescription ?? undefined,
      url: `/events/${slug}`,
      type: "article",
      images: event.coverImageUrl
        ? [{ url: event.coverImageUrl }]
        : [{ url: "/brand/og-cover.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.shortDescription ?? undefined,
      images: event.coverImageUrl ? [event.coverImageUrl] : ["/brand/og-cover.png"],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ event, source }, settings] = await Promise.all([
    getEventBySlug(slug),
    getPlatformSettings(),
  ]);
  if (!event) notFound();

  const related = await getRelatedEvents(
    event.id,
    event.categorySlug,
    3,
  );
  const remaining = event.capacity > 0 ? event.capacity - event.ticketsSold : 0;
  const soldPercent = event.capacity > 0 ? Math.min(100, Math.round((event.ticketsSold / event.capacity) * 100)) : 0;
  const multiDay = formatShortDate(event.startAt) !== formatShortDate(event.endAt);
  const idempotencyKey = crypto.randomUUID();
  const timeZone = event.timezone || DEFAULT_TIMEZONE;
  const salesStarts = event.ticketTypes
    .map((ticket) => ticket.salesStartAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const salesEndDates = event.ticketTypes
    .map((ticket) => ticket.salesEndAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const salesEnd = salesEndDates[salesEndDates.length - 1];

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-cream">
          <div className="container-page py-7 sm:py-10">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                All events
              </Link>
              <ShareButton title={event.title} />
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{event.categoryName ?? "Event"}</Badge>
              <StatusBadge kind="event" status={event.status} />
              {source === "demo" ? <DemoBadge /> : null}
            </div>

            <h1 className="display-title mt-4 max-w-4xl text-[38px] leading-[1.01] tracking-[-0.03em] sm:text-[54px] lg:text-[62px]">
              {event.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] text-muted">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent-300" />
                {multiDay
                  ? `${formatShortDate(event.startAt)} – ${formatShortDate(event.endAt)}`
                  : formatDate(event.startAt)}
                <span className="text-[#B8C1BD]">·</span>
                {formatTime(event.startAt)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent-300" />
                {event.venueName}, {event.city}
              </span>
              <Link
                href={`/organizers/${event.organizerSlug}`}
                className="flex items-center gap-2 transition hover:text-ink"
              >
                <Avatar
                  name={event.organizerName}
                  src={event.organizerLogoUrl}
                  size="xs"
                />
                By {event.organizerName}
              </Link>
            </div>
          </div>
        </section>

        <section className="container-page mt-6 sm:mt-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-brand-100 sm:aspect-[2.35/1]">
            {event.bannerImageUrl || event.coverImageUrl ? (
              <Image
                src={(event.bannerImageUrl ?? event.coverImageUrl)!}
                alt={event.title}
                fill
                priority
                sizes="(max-width: 1240px) 100vw, 1240px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-forest font-display text-5xl text-white/80">
                {event.title}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-forest/45 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full glass-strong px-3 py-1.5 text-[10px] font-semibold text-ink backdrop-blur sm:bottom-5 sm:left-5">
              <Ticket className="h-3.5 w-3.5 text-accent-300" />
              {event.ticketTypes.length} ticket tier
              {event.ticketTypes.length === 1 ? "" : "s"} available
            </div>
          </div>
        </section>

        <section className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-14 lg:py-14">
          <div className="min-w-0">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="glass-subtle rounded-xl p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  <CalendarDays className="h-3.5 w-3.5 text-accent-300" />
                  Date
                </p>
                <p className="mt-2 text-[13px] font-semibold text-ink">
                  {formatDate(event.startAt)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {formatTime(event.startAt)} – {formatTime(event.endAt)}
                </p>
              </div>
              <div className="glass-subtle rounded-xl p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  <MapPin className="h-3.5 w-3.5 text-accent-300" />
                  Venue
                </p>
                <p className="mt-2 text-[13px] font-semibold text-ink">
                  {event.venueName}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">{event.city}, Cameroon</p>
              </div>
              <div className="glass-subtle rounded-xl p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                  <Users className="h-3.5 w-3.5 text-accent-300" />
                  Capacity
                </p>
                <p className="mt-2 text-[13px] font-semibold text-ink">
                  {event.capacity > 0 ? `${remaining} places left` : "Open capacity"}
                </p>
                {event.capacity > 0 ? (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${soldPercent}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-10">
              <p className="eyebrow">About the event</p>
              <h2 className="display-title mt-2 text-[28px]">The experience</h2>
              <div className="prose-tickora mt-4">
                {event.description.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Event schedule — only times actually stored on the event. */}
            <div className="mt-10 rounded-2xl border border-line bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Event schedule</p>
                  <h2 className="mt-1.5 text-[17px] font-semibold text-ink">
                    Key times
                  </h2>
                </div>
                <p className="text-[10.5px] text-muted">
                  All times shown in {timeZone.replace("_", " ")}
                </p>
              </div>
              <ol className="mt-5 space-y-0">
                <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-3">
                  <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                    Event starts
                  </span>
                  <span className="text-[12px] text-muted">
                    {formatDate(event.startAt, {}, timeZone)} ·{" "}
                    {formatTime(event.startAt, timeZone)}
                  </span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-3">
                  <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                    Event ends
                  </span>
                  <span className="text-[12px] text-muted">
                    {formatDate(event.endAt, {}, timeZone)} ·{" "}
                    {formatTime(event.endAt, timeZone)}
                  </span>
                </li>
                {salesStarts ? (
                  <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-3">
                    <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
                      Ticket sales open
                    </span>
                    <span className="text-[12px] text-muted">
                      {formatDate(salesStarts, {}, timeZone)} ·{" "}
                      {formatTime(salesStarts, timeZone)}
                    </span>
                  </li>
                ) : null}
                {salesEnd ? (
                  <li className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                      Ticket sales close
                    </span>
                    <span className="text-[12px] text-muted">
                      {formatDate(salesEnd, {}, timeZone)} ·{" "}
                      {formatTime(salesEnd, timeZone)}
                    </span>
                  </li>
                ) : null}
              </ol>
              {!salesStarts && !salesEnd ? (
                <p className="mt-1 text-[10.5px] leading-4 text-muted">
                  The organizer has not published specific ticket sales windows.
                  Availability is shown per ticket tier.
                </p>
              ) : null}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="glass-subtle rounded-xl p-5">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                  <QrCode className="h-4 w-4 text-accent-300" />
                  Digital entry
                </p>
                <p className="mt-2 text-[12px] leading-6 text-muted">
                  Your ticket and unique QR code appear in your TICKORA account
                  immediately after payment is verified. No printing required.
                </p>
              </div>
              <div className="glass-subtle rounded-xl p-5">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                  <ShieldCheck className="h-4 w-4 text-accent-300" />
                  Secure booking
                </p>
                <p className="mt-2 text-[12px] leading-6 text-muted">
                  Inventory is reserved for {settings.reservationMinutes} minutes
                  while you pay. Your ticket is only issued after verified payment.
                </p>
              </div>
            </div>

            {(event.address || event.latitude != null) ? (
              <div className="mt-6 space-y-3">
                <div className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-accent-300">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-ink">{event.venueName}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {event.address ?? `${event.city}, Cameroon`}
                      </p>
                    </div>
                  </div>
                  {event.latitude != null && event.longitude != null ? (
                    <a
                      href={directionsUrl(event.latitude, event.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
                    >
                      Get directions
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${event.venueName} ${event.address ?? ""} ${event.city} Cameroon`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
                    >
                      Open in Maps
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {event.latitude != null && event.longitude != null ? (
                  <EventMap
                    points={[
                      {
                        id: event.id,
                        lat: event.latitude,
                        lng: event.longitude,
                        title: event.venueName,
                        subtitle: `${event.city}, Cameroon`,
                      },
                    ]}
                    height={280}
                    zoom={15}
                  />
                ) : null}
              </div>
            ) : null}

            <div className="mt-10 rounded-2xl border border-line bg-card p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex gap-4">
                  <Avatar
                    name={event.organizerName}
                    src={event.organizerLogoUrl}
                    size="lg"
                    className="rounded-xl"
                  />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Presented by
                    </p>
                    <p className="mt-1 text-[15px] font-semibold text-ink">
                      {event.organizerName}
                    </p>
                    <p className="mt-1.5 max-w-md text-[12px] leading-6 text-muted">
                      {event.organizerDescription ??
                        "A verified TICKORA organizer producing events in Cameroon."}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/organizers/${event.organizerSlug}`}
                  className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
                >
                  View organizer
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <p className="eyebrow">Good to know</p>
              <ul className="mt-3 space-y-2 text-[12px] leading-6 text-muted">
                <li>• Entry is by QR code from your TICKORA account. Screenshots are accepted.</li>
                <li>• Ticket transfers and refunds are subject to the organizer&apos;s policy and our <Link href="/terms" className="underline underline-offset-4 hover:text-ink">terms</Link>.</li>
                <li>• All prices are shown in Central African CFA francs (XAF).</li>
                <li>• Need help? <Link href="/help" className="underline underline-offset-4 hover:text-ink">Visit the help centre</Link>.</li>
              </ul>
            </div>
          </div>

          <aside className="lg:relative">
            <div className="lg:sticky lg:top-24">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Tickets from
                  </p>
                  <p className="mt-0.5 text-[22px] font-semibold tracking-tight text-ink">
                    {event.startingPriceXaf === null
                      ? "—"
                      : event.startingPriceXaf === 0
                        ? "Free"
                        : formatXAF(event.startingPriceXaf)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[10px] font-medium text-muted ring-1 ring-line">
                  <Clock className="h-3 w-3 text-accent-300" />
                  {formatTime(event.startAt)}
                </span>
              </div>

              {source === "demo" ? (
                <Alert tone="warning" className="mb-3">
                  Preview event from the sample catalogue. Checkout is disabled.
                </Alert>
              ) : null}

              <TicketSelector
                eventId={event.id}
                eventSlug={event.slug}
                eventTitle={event.title}
                ticketTypes={event.ticketTypes}
                serviceFeePercent={settings.serviceFeePercent}
                minServiceFee={settings.minServiceFee}
                isPreview={source === "demo"}
                idempotencyKey={idempotencyKey}
              />

              <p className="mt-3 text-center text-[10px] leading-4 text-muted">
                By continuing you agree to the TICKORA{" "}
                <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
                  terms
                </Link>{" "}
                and the organizer&apos;s entry policy.
              </p>
            </div>
          </aside>
        </section>

        {related.length > 0 ? (
          <section className="border-t border-line bg-surface py-14 sm:py-16">
            <div className="container-page">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Keep going</p>
                  <h2 className="display-title mt-2 text-[30px]">You might also like</h2>
                </div>
                <Link
                  href={`/events?category=${event.categorySlug ?? ""}`}
                  className="text-[11px] font-semibold text-accent-200 hover:underline"
                >
                  More {event.categoryName ?? "events"}
                </Link>
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <EventCard key={item.id} event={item} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
