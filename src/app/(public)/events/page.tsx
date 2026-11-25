import type { Metadata } from "next";
import Link from "next/link";
import { Compass, SearchX } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/events/event-card";
import { EventMap } from "@/components/maps/map-view";
import { EventFilters } from "@/components/events/event-filters";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { DemoBadge } from "@/components/system/config-notice";
import { getCategories, listEvents } from "@/lib/data/public";
import { cn, titleCase } from "@/lib/utils";
import type { EventFilters as Filters } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Discover events in Cameroon",
  description:
    "Search concerts, conferences, festivals, food nights and community events across Buea, Douala, Yaoundé and Limbe.",
};

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters: Filters = {
    query: first(params.q)?.slice(0, 120),
    category: first(params.category),
    city: first(params.city),
    date: first(params.date),
    price: first(params.price),
    sort: first(params.sort) ?? "upcoming",
    view: first(params.view) === "map" ? "map" : "list",
    page: Math.max(1, Number(first(params.page) ?? 1) || 1),
    pageSize: 9,
  };

  const [{ events, total, source, error }, { categories }] = await Promise.all([
    listEvents(filters),
    getCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / (filters.pageSize ?? 9)));

  const buildHref = (page: number) => {
    const next = new URLSearchParams();
    const pairs: Array<[string, string | undefined]> = [
      ["q", filters.query],
      ["category", filters.category],
      ["city", filters.city],
      ["date", filters.date],
      ["price", filters.price],
      ["sort", filters.sort],
      ["view", filters.view === "map" ? "map" : undefined],
    ];
    for (const [key, value] of pairs) {
      if (value) next.set(key, value);
    }
    if (page > 1) next.set("page", String(page));
    const qs = next.toString();
    return qs ? `/events?${qs}` : "/events";
  };

  const filterSummary = [
    filters.city,
    categories.find((category) => category.slug === filters.category)?.name,
    filters.query ? `“${filters.query}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-cream">
          <div className="container-page pb-9 pt-9 sm:pb-12 sm:pt-12">
            <nav className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
              <span>/</span>
              <span className="text-ink">Discover</span>
            </nav>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-xl">
                <p className="eyebrow">The full calendar</p>
                <h1 className="display-title mt-2 text-[38px] leading-[1.02] sm:text-[50px]">
                  {filterSummary ? (
                    <>
                      Events in <span className="italic text-accent-300">{filterSummary}</span>
                    </>
                  ) : (
                    <>
                      Find something worth
                      <br />
                      <span className="italic text-accent-300">leaving home for.</span>
                    </>
                  )}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DemoBadge />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                  <Compass className="h-3 w-3 text-accent-300" />
                  Buea · Douala · Yaoundé · Limbe
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page -mt-1 py-8 sm:py-10">
          <EventFilters
            categories={categories}
            filters={{
              q: filters.query,
              category: filters.category,
              city: filters.city,
              date: filters.date,
              price: filters.price,
              sort: filters.sort,
            }}
            total={total}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/events"
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition",
                !filters.category
                  ? "border-forest bg-forest text-white"
                  : "border-line bg-card text-muted hover:border-brand-200 hover:text-ink",
              )}
            >
              All events
            </Link>
            {categories.slice(0, 7).map((category) => (
              <Link
                key={category.id}
                href={`/events?category=${category.slug}${filters.city ? `&city=${encodeURIComponent(filters.city)}` : ""}`}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition",
                  filters.category === category.slug
                    ? "border-forest bg-forest text-white"
                    : "border-line bg-card text-muted hover:border-brand-200 hover:text-ink",
                )}
              >
                {category.name}
              </Link>
            ))}
          </div>

          {error ? (
            <Alert tone="danger" className="mt-6">
              Live events could not be loaded. {error} Please try again shortly.
            </Alert>
          ) : null}

          {events.length > 0 ? (
            <>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={buildHref(1)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition",
                    filters.view !== "map"
                      ? "border-forest bg-forest text-white"
                      : "border-line bg-card text-muted hover:text-ink",
                  )}
                >
                  List
                </Link>
                <Link
                  href={buildHref(1).includes("?")
                    ? `${buildHref(1)}&view=map`
                    : `${buildHref(1)}?view=map`}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition",
                    filters.view === "map"
                      ? "border-forest bg-forest text-white"
                      : "border-line bg-card text-muted hover:text-ink",
                  )}
                >
                  Map
                </Link>
              </div>

              {filters.view === "map" ? (
                <div className="mt-4">
                  {(() => {
                    const points = events
                      .filter((e) => e.latitude != null && e.longitude != null)
                      .map((e) => ({
                        id: e.id,
                        lat: e.latitude as number,
                        lng: e.longitude as number,
                        title: e.title,
                        subtitle: `${e.venueName} · ${e.city}`,
                        href: `/events/${e.slug}`,
                      }));
                    return points.length > 0 ? (
                      <EventMap points={points} height={440} zoom={6} />
                    ) : (
                      <Alert tone="info">
                        No events on this page have a map pin yet. Organizers can
                        add venue coordinates when creating or editing events.
                      </Alert>
                    );
                  })()}
                </div>
              ) : null}

              {filters.view !== "map" ? (
                <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : null}
              <Pagination page={filters.page ?? 1} totalPages={totalPages} buildHref={buildHref} />
            </>
          ) : (
            <div className="mt-7">
              <EmptyState
                icon={SearchX}
                title="No events match that search"
                description="Try a different category, city or date. New events are added every week."
                actionLabel="Clear filters"
                actionHref="/events"
              >
                {filters.category ? (
                  <Link
                    href="/events"
                    className="mt-3 text-[12px] font-medium text-accent-300 underline underline-offset-4"
                  >
                    Browse all {titleCase(filters.category)} events
                  </Link>
                ) : null}
              </EmptyState>
            </div>
          )}

          {source === "demo" ? (
            <p className="mt-6 text-center text-[11px] text-muted">
              Showing the TICKORA sample catalogue. Live event data appears once
              Supabase is connected.
            </p>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
