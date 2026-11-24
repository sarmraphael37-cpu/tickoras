import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/events/event-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getOrganizerBySlug } from "@/lib/data/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { organizer } = await getOrganizerBySlug(slug);
  if (!organizer) return { title: "Organizer not found" };
  return {
    title: organizer.name,
    description:
      organizer.description ??
      `Events presented by ${organizer.name} on TICKORA.`,
  };
}

export default async function OrganizerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organizer, events } = await getOrganizerBySlug(slug);
  if (!organizer) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-line bg-cream">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 75% 10%, rgba(43,159,126,0.22), transparent 55%)",
            }}
          />
          <div className="container-page relative py-8 sm:py-12">
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All events
            </Link>

            <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:items-start">
              <Avatar
                name={organizer.name}
                src={organizer.logoUrl}
                size="lg"
                className="h-20 w-20 rounded-2xl text-2xl shadow-card"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">
                    <ShieldCheck className="h-3 w-3" />
                    Verified organizer
                  </Badge>
                  {organizer.city ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                      <MapPin className="h-3 w-3" />
                      {organizer.city}
                    </span>
                  ) : null}
                </div>
                <h1 className="display-title mt-3 text-[38px] leading-[1.02] sm:text-[50px]">
                  {organizer.name}
                </h1>
                <p className="mt-3 max-w-2xl text-[13px] leading-6 text-muted">
                  {organizer.description ??
                    "A verified TICKORA organizer creating memorable experiences in Cameroon."}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-5 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 text-accent-300" />
                    {events.length} upcoming event{events.length === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent-300" />
                    Identity and payout details reviewed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-10 sm:py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">On sale now</p>
              <h2 className="display-title mt-2 text-[30px]">Upcoming events</h2>
            </div>
            <Link
              href="/events"
              className="text-[11px] font-semibold text-accent-200 hover:underline"
            >
              Browse all events
            </Link>
          </div>

          {events.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="mt-7">
              <EmptyState
                icon={Ticket}
                title="No upcoming events right now"
                description="This organizer is working on something new. Follow TICKORA to hear about it first."
                actionLabel="Discover other events"
                actionHref="/events"
              />
            </div>
          )}
        </section>

        <section className="container-page pb-16">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-forest p-7 text-white sm:flex-row sm:items-center sm:p-9">
            <div>
              <p className="font-display text-[26px] leading-tight">
                Hosting something in Cameroon?
              </p>
              <p className="mt-1 text-[12px] text-white/60">
                Join the organizers using TICKORA to sell out their rooms.
              </p>
            </div>
            <Link
              href="/register?type=organizer"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-card px-5 text-[13px] font-semibold text-ice transition hover:bg-brand-50"
            >
              Become an organizer
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
