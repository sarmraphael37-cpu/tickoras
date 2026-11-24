import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  Check,
  CreditCard,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/events/event-card";
import { HeroSearch } from "@/components/events/hero-search";
import { SectionHeading } from "@/components/ui/section-heading";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfigNotice, DemoBadge } from "@/components/system/config-notice";
import { NewsletterForm } from "@/components/newsletter-form";
import {
  getCategories,
  getFeaturedEvents,
  getOrganizers,
  getPublicStats,
  getTrendingEvents,
  getUpcomingEvents,
} from "@/lib/data/public";
import { CITY_IMAGERY, CITIES } from "@/lib/domain";
import {
  cn,
  formatDate,
  formatShortDate,
  formatTime,
  formatXAF,
  relativeTime,
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "TICKORA — Discover. Book. Experience.",
  description:
    "Discover concerts, conferences, festivals and experiences across Cameroon. Secure tickets in XAF with instant digital entry.",
};

export default async function HomePage() {
  const [categoriesResult, featured, trending, upcoming, organizersResult, stats] =
    await Promise.all([
      getCategories(),
      getFeaturedEvents(4),
      getTrendingEvents(5),
      getUpcomingEvents(7),
      getOrganizers(6),
      getPublicStats(),
    ]);

  const { categories } = categoriesResult;
  const { organizers } = organizersResult;
  const heroEvent = featured[0] ?? upcoming[0] ?? null;
  const secondary = featured[1] ?? upcoming[0] ?? null;

  return (
    <>
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-line bg-cream">
          <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(#60A5FA 0.55px, transparent 0.55px)",
              backgroundSize: "18px 18px",
              maskImage:
                "radial-gradient(ellipse at 65% 30%, black 10%, transparent 62%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 65% 30%, black 10%, transparent 62%)",
            }}
          />
          <div className="container-page relative grid gap-12 pb-14 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-card/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-200 backdrop-blur">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
                  </span>
                  Live in four cities
                </span>
                <DemoBadge />
              </div>

              <h1 className="display-title mt-6 text-[46px] leading-[0.98] tracking-[-0.035em] sm:text-[62px] lg:text-[70px]">
                Discover Events.
                <br />
                Create{" "}
                <span className="italic text-accent-300">Memories.</span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] leading-7 text-muted">
                Discover what&apos;s happening in Buea, Douala, Yaoundé and Limbe.
                Book in seconds, carry your ticket on your phone and walk straight
                in.
              </p>

              <HeroSearch categories={categories} />

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent-300" />
                  Verified organizers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-accent-300" />
                  Secure QR entry
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Ticket className="h-3.5 w-3.5 text-accent-300" />
                  Instant digital tickets
                </span>
              </div>
            </div>

            {/* Editorial hero composition */}
            <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
              {heroEvent ? (
                <div className="relative">
                  <Link
                    href={`/events/${heroEvent.slug}`}
                    className="group block overflow-hidden rounded-[26px] border border-white/50 shadow-[0_40px_80px_-40px_rgba(4,38,31,0.5)]"
                  >
                    <div className="relative aspect-[4/4.7] sm:aspect-[4/4.2]">
                      {heroEvent.coverImageUrl ? (
                        <Image
                          src={heroEvent.coverImageUrl}
                          alt={heroEvent.title}
                          fill
                          priority
                          sizes="(max-width: 1024px) 90vw, 46vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-brand-700 font-display text-6xl text-white">
                          TICKORA
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/20 to-transparent opacity-90" />
                      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                        <div className="flex items-center gap-2">
                          <Badge
                            tone="dark"
                            className="border border-white/15 bg-card/15 text-white backdrop-blur"
                          >
                            {heroEvent.categoryName ?? "Featured"}
                          </Badge>
                          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
                            Editor&apos;s pick
                          </span>
                        </div>
                        <h2 className="mt-3 font-display text-[30px] leading-[1.05] text-white sm:text-[34px]">
                          {heroEvent.title}
                        </h2>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/80">
                          <span className="flex items-center gap-1.5">
                            <CalendarCheck2 className="h-3.5 w-3.5" />
                            {formatShortDate(heroEvent.startAt)} ·{" "}
                            {formatTime(heroEvent.startAt)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {heroEvent.venueName}, {heroEvent.city}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Floating ticket */}
                  <div className="absolute -left-3 bottom-8 hidden w-[218px] rotate-[-2deg] rounded-xl bg-card p-3.5 shadow-float sm:block lg:-left-8">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-accent-300">
                        TICKORA entry pass
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    </div>
                    <p className="mt-2 line-clamp-1 text-[12px] font-semibold text-ink">
                      {heroEvent.title}
                    </p>
                    <div className="mt-2 flex items-end justify-between border-t border-dashed border-line pt-2.5">
                      <div>
                        <p className="text-[8px] uppercase tracking-wide text-muted">
                          From
                        </p>
                        <p className="text-[12px] font-semibold text-ink">
                          {heroEvent.startingPriceXaf
                            ? formatXAF(heroEvent.startingPriceXaf)
                            : "Free"}
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-[2px]" aria-hidden="true">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-[3px] w-[3px] rounded-[1px]",
                              i % 3 === 0 ? "bg-forest" : "bg-brand-300",
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {secondary ? (
                    <Link
                      href={`/events/${secondary.slug}`}
                      className="absolute -right-3 -top-5 hidden w-[176px] rotate-[3deg] overflow-hidden rounded-xl bg-card p-2 shadow-float transition hover:rotate-0 sm:block lg:-right-6"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                        {secondary.coverImageUrl ? (
                          <Image
                            src={secondary.coverImageUrl}
                            alt=""
                            fill
                            sizes="180px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-1 px-0.5 text-[11px] font-semibold text-ink">
                        {secondary.title}
                      </p>
                      <p className="px-0.5 text-[9px] text-muted">
                        {formatShortDate(secondary.startAt)} · {secondary.city}
                      </p>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="flex aspect-[4/4.2] items-center justify-center rounded-[26px] bg-brand-700 p-10 text-center">
                  <div>
                    <Ticket className="mx-auto h-8 w-8 text-accent-300" />
                    <p className="mt-4 font-display text-3xl text-white">
                      The next great event goes here.
                    </p>
                    <Link
                      href="/register?type=organizer"
                      className={cn(buttonVariants({ variant: "white" }), "mt-5")}
                    >
                      Host an event
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="container-page relative pb-10">
            <ConfigNotice />
          </div>

          {/* real platform stats */}
          <div className="border-t border-line/80 bg-card/55">
            <div className="container-page grid grid-cols-2 divide-x divide-line py-6 sm:grid-cols-4">
              {[
                { value: `${stats.eventCount}`, label: "Upcoming events" },
                { value: `${stats.organizerCount}`, label: "Vetted organizers" },
                { value: `${stats.cityCount}`, label: "Cities served" },
                { value: "XAF", label: "Local currency" },
              ].map((stat) => (
                <div key={stat.label} className="px-5 py-2 first:pl-0">
                  <p className="font-display text-[26px] leading-none text-ink">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="border-b border-line py-14 sm:py-16">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Browse by mood</p>
                <h2 className="display-title mt-2 text-[28px] sm:text-[34px]">
                  Popular Categories
                </h2>
              </div>
              <Link
                href="/categories"
                className="group inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-200"
              >
                All categories
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group flex flex-col glass-subtle rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
                    <CategoryIcon name={category.icon} className="h-4.5 w-4.5" />
                  </span>
                  <span className="mt-3 text-[12.5px] font-semibold leading-tight text-ink group-hover:text-accent-200">
                    {category.name}
                  </span>
                  <span className="mt-1 text-[10.5px] text-muted">
                    {category.eventCount} event{category.eventCount === 1 ? "" : "s"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED */}
        <section className="py-16 sm:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Curated for you"
              title={
                <>
                  Featured Events
                  <span className="text-accent-300">.</span>
                </>
              }
              description="A handpicked selection of the events our editors are talking about this month."
              actionLabel="See all events"
              actionHref="/events"
            />
            {featured.length > 0 ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-line bg-card p-12 text-center">
                <p className="font-display text-2xl text-ink">
                  New events are being reviewed.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Check back soon or explore all upcoming events.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* TRENDING + NOTE */}
        <section className="border-y border-line bg-surface py-16 sm:py-20">
          <div className="container-page grid gap-12 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <SectionHeading
                eyebrow="Selling fast"
                title="Trending Events"
                description="The events filling up fastest across the cities right now."
              />
              <div className="mt-7 divide-y divide-line border-y border-line">
                {trending.map((event, index) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="group flex items-center gap-4 py-4 sm:gap-6"
                  >
                    <span className="w-7 shrink-0 font-display text-[20px] text-accent-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-cream sm:h-16 sm:w-20">
                      {event.coverImageUrl ? (
                        <Image
                          src={event.coverImageUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink group-hover:text-accent-200 sm:text-[14px]">
                        {event.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {formatShortDate(event.startAt)} · {event.venueName},{" "}
                        {event.city}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        From
                      </p>
                      <p className="text-[12px] font-semibold text-ink">
                        {event.startingPriceXaf
                          ? formatXAF(event.startingPriceXaf)
                          : "Free"}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-300" />
                  </Link>
                ))}
                {trending.length === 0 ? (
                  <p className="py-10 text-sm text-muted">
                    Trending events will appear here as tickets go on sale.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-forest p-7 text-white sm:p-9">
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 80% 10%, rgba(82,187,155,0.7), transparent 55%)",
                }}
              />
              <Sparkles className="h-5 w-5 text-accent-300" />
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-300">
                The TICKORA promise
              </p>
              <h3 className="mt-3 font-display text-[30px] leading-[1.08]">
                A ticket should feel like the beginning, not the admin.
              </h3>
              <ul className="mt-6 space-y-3.5">
                {[
                  "Every organizer is reviewed before publishing.",
                  "Inventory is reserved and validated server-side.",
                  "Your QR entry works offline once loaded.",
                  "Clear prices in XAF. No surprises at checkout.",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-[12.5px] leading-5 text-white/75">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/about"
                className="mt-7 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white underline decoration-brand-400 underline-offset-4 hover:decoration-white"
              >
                Why we built TICKORA
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* UPCOMING */}
        <section className="py-16 sm:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Coming up"
              title="Upcoming Events"
              description="From intimate rooms to open-air stages — the next few weeks across Cameroon."
              actionLabel="Explore the calendar"
              actionHref="/events?sort=upcoming"
            />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>

        {/* CITIES */}
        <section className="border-y border-line bg-cream py-16 sm:py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Across Cameroon</p>
                <h2 className="display-title mt-2 text-[30px] sm:text-[38px]">
                  Discover Events by City
                </h2>
              </div>
              <p className="max-w-sm text-[12px] leading-6 text-muted">
                Four cities, four distinct scenes. Start where you are — or plan a
                weekend somewhere new.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CITIES.map((city) => {
                const cityEvents = upcoming.filter((event) => event.city === city);
                return (
                  <Link
                    key={city}
                    href={`/events?city=${encodeURIComponent(city)}`}
                    className="group relative aspect-[4/5] overflow-hidden rounded-2xl"
                  >
                    <Image
                      src={CITY_IMAGERY[city]}
                      alt={`${city}, Cameroon`}
                      fill
                      sizes="(max-width: 640px) 100vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/20 to-black/5" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="font-display text-[26px] leading-none text-white">
                        {city}
                      </p>
                      <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
                        {cityEvents.length > 0
                          ? `${cityEvents.length} upcoming event${cityEvents.length === 1 ? "" : "s"}`
                          : "Explore events"}
                      </p>
                    </div>
                    <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-card/15 text-white backdrop-blur transition group-hover:bg-card group-hover:text-ice">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ORGANIZERS */}
        <section className="py-16 sm:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="The people behind the moments"
              title="Featured Organizers"
              description="Vetted teams producing consistently excellent experiences across Cameroon."
              actionLabel="Meet the organizers"
              actionHref="/about#organizers"
            />
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {organizers.map((organizer) => (
                <Link
                  key={organizer.id}
                  href={`/organizers/${organizer.slug}`}
                  className="group flex items-center gap-4 glass-subtle rounded-xl p-4 transition hover:border-brand-200 hover:shadow-card"
                >
                  <Avatar
                    name={organizer.name}
                    src={organizer.logoUrl}
                    size="lg"
                    className="rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink group-hover:text-accent-200">
                      {organizer.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {organizer.city} · {organizer.eventCount} event
                      {organizer.eventCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1.5 line-clamp-1 text-[11px] text-muted/80">
                      {organizer.description}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition group-hover:text-accent-300" />
                </Link>
              ))}
              {organizers.length === 0 ? (
                <p className="text-sm text-muted">
                  Approved organizers will be listed here.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* WHY CHOOSE TICKORA */}
        <section className="border-y border-line bg-card py-16 sm:py-20">
          <div className="container-page">
            <div className="max-w-2xl">
              <p className="eyebrow">Why TICKORA</p>
              <h2 className="display-title mt-2 text-[30px] sm:text-[38px]">
                Built for the room, not the spreadsheet.
              </h2>
              <p className="mt-3 text-[13px] leading-6 text-muted">
                Every part of the journey — from discovery to the door — is designed
                to be clear, fast and fair for attendees and organizers alike.
              </p>
            </div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: ShieldCheck,
                  title: "Vetted organizers",
                  copy: "Every organization is reviewed before it can publish an event.",
                },
                {
                  icon: CreditCard,
                  title: "Clear XAF pricing",
                  copy: "The price you see is the price calculated by our servers at checkout.",
                },
                {
                  icon: Ticket,
                  title: "No overselling",
                  copy: "Inventory is reserved atomically while you complete payment.",
                },
                {
                  icon: QrCode,
                  title: "One-scan entry",
                  copy: "A unique QR ticket is issued after verified payment and used once.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-line bg-surface p-5"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-accent-300">
                    <item.icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <p className="mt-4 text-[13px] font-semibold text-ink">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[11.5px] leading-5 text-muted">
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW TICKORA WORKS */}
        <section className="border-b border-line bg-cream py-16 sm:py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="eyebrow">How TICKORA works</p>
                <h2 className="display-title mt-2 text-[30px] sm:text-[38px]">
                  From first click to front door.
                </h2>
              </div>
              <Link
                href="/how-it-works"
                className="group inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-200"
              >
                See the full guide
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="mt-9 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-line bg-card p-6 sm:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
                  For attendees
                </p>
                <ol className="mt-5 space-y-4">
                  {[
                    {
                      icon: Search,
                      title: "Discover an event",
                      copy: "Search by mood, city, date or price.",
                    },
                    {
                      icon: Ticket,
                      title: "Select your tickets",
                      copy: "Choose a tier and quantity in seconds.",
                    },
                    {
                      icon: CreditCard,
                      title: "Pay securely",
                      copy: "Totals are confirmed on the server before payment.",
                    },
                    {
                      icon: QrCode,
                      title: "Receive a QR ticket",
                      copy: "Your ticket lives in your TICKORA account.",
                    },
                    {
                      icon: CalendarCheck2,
                      title: "Attend",
                      copy: "Walk straight to the door and show your code.",
                    },
                  ].map((step, index) => (
                    <li key={step.title} className="flex items-start gap-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-accent-200">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                          <step.icon className="h-3.5 w-3.5 text-accent-300" />
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-5 text-muted">
                          {step.copy}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-line bg-card p-6 sm:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
                  For organizers
                </p>
                <ol className="mt-5 space-y-4">
                  {[
                    {
                      icon: ShieldCheck,
                      title: "Register",
                      copy: "Create an organizer account and complete your profile.",
                    },
                    {
                      icon: CalendarCheck2,
                      title: "Create an event",
                      copy: "Add dates, venue, imagery and ticket tiers.",
                    },
                    {
                      icon: Check,
                      title: "Submit for approval",
                      copy: "We review every event before it goes live.",
                    },
                    {
                      icon: CreditCard,
                      title: "Sell tickets",
                      copy: "Track orders and revenue from your dashboard.",
                    },
                    {
                      icon: Users,
                      title: "Manage attendees",
                      copy: "Assign scanners and check guests in at the door.",
                    },
                  ].map((step, index) => (
                    <li key={step.title} className="flex items-start gap-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-white">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                          <step.icon className="h-3.5 w-3.5 text-accent-300" />
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-5 text-muted">
                          {step.copy}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ORGANIZER CTA */}
        <section className="container-page pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-forest px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 85% 10%, rgba(82,187,155,0.65), transparent 45%), radial-gradient(ellipse at 5% 90%, rgba(237,231,218,0.2), transparent 50%)",
              }}
            />
            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-300">
                  For organizers
                </p>
                <h2 className="mt-4 max-w-xl font-display text-[36px] leading-[1.02] text-white sm:text-[46px]">
                  You create the moment.
                  <br />
                  We&apos;ll handle the door.
                </h2>
                <p className="mt-5 max-w-md text-[13px] leading-6 text-white/65">
                  Publish beautifully, sell securely and know exactly who is in the
                  room. TICKORA gives organizers the tools big venues use — without
                  the enterprise overhead.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/register?type=organizer"
                    className={cn(buttonVariants({ variant: "white" }))}
                  >
                    Become an organizer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-card/10 hover:text-white",
                    )}
                  >
                    How it works
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: CalendarCheck2,
                    title: "Event pages",
                    text: "Editorial templates that sell the experience.",
                  },
                  {
                    icon: Ticket,
                    title: "Ticket tiers",
                    text: "Early bird, Regular, VIP and custom tiers.",
                  },
                  {
                    icon: QrCode,
                    title: "Fast check-in",
                    text: "Atomic QR scanning with a live door count.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Clear payouts",
                    text: "Track revenue and request payouts.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-card/[0.06] p-4 backdrop-blur"
                  >
                    <item.icon className="h-4 w-4 text-accent-300" />
                    <p className="mt-3 text-[12px] font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[10.5px] leading-4 text-white/55">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NEWSLETTER */}
        <section className="border-t border-line bg-surface">
          <div className="container-page grid gap-8 py-14 lg:grid-cols-[1fr_0.8fr] lg:items-center sm:py-16">
            <div>
              <p className="eyebrow">Stay in the loop</p>
              <h2 className="display-title mt-2 max-w-lg text-[30px] sm:text-[36px]">
                The good stuff, once a fortnight.
              </h2>
              <p className="mt-3 max-w-md text-[13px] leading-6 text-muted">
                New event drops, city guides and the occasional ticket giveaway.
                Written by people who actually go out.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
