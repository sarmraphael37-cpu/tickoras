import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarRange } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/events/event-card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/system/config-notice";
import {
  getCategories,
  getCategoryBySlug,
  listEvents,
} from "@/lib/data/public";
import { CITIES } from "@/lib/domain";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: `${category.name} events in Cameroon`,
    description:
      category.description ??
      `Discover ${category.name.toLowerCase()} events across Buea, Douala, Yaoundé and Limbe on TICKORA.`,
    openGraph: {
      title: `${category.name} events · TICKORA`,
      description: category.description ?? undefined,
      type: "website",
    },
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ city?: string; date?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { city, date, sort } = await searchParams;
  const [{ category, source }, { categories }] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
  ]);
  if (!category) notFound();

  const activeCity = CITIES.includes(city as (typeof CITIES)[number])
    ? (city as (typeof CITIES)[number])
    : undefined;
  const activeDate = ["week", "month"].includes(date ?? "") ? date : undefined;
  const activeSort = ["upcoming", "newest", "popular"].includes(sort ?? "")
    ? sort!
    : "upcoming";

  const { events, total, error } = await listEvents({
    category: slug,
    city: activeCity,
    date: activeDate,
    sort: activeSort,
    pageSize: 12,
  });

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-line bg-cream">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 80% 5%, rgba(43,159,126,0.22), transparent 55%)",
            }}
          />
          <div className="container-page relative py-9 sm:py-12">
            <Link
              href="/categories"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All categories
            </Link>
            <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand" className="capitalize">
                    Category
                  </Badge>
                  {source === "demo" ? <DemoBadge /> : null}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-accent-300">
                    <CategoryIcon name={category.icon} className="h-5 w-5" />
                  </span>
                  <h1 className="display-title text-[38px] leading-none sm:text-[52px]">
                    {category.name}
                  </h1>
                </div>
                <p className="mt-4 max-w-xl text-[13px] leading-6 text-muted">
                  {category.description ??
                    `Explore ${category.name.toLowerCase()} events across Cameroon.`}
                </p>
              </div>
              <p className="text-[12px] text-muted">
                <span className="font-semibold text-ink">{total}</span> event
                {total === 1 ? "" : "s"} found
              </p>
            </div>
          </div>
        </section>

        <section className="container-page py-9 sm:py-12">
          <form
            action={`/categories/${slug}`}
            method="get"
            className="grid gap-3 rounded-2xl border border-line bg-card p-4 shadow-card sm:grid-cols-3"
          >
            <div>
              <label
                htmlFor="category-city"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                City
              </label>
              <select
                id="category-city"
                name="city"
                defaultValue={activeCity ?? ""}
                className="h-10 w-full rounded-lg border border-line bg-card px-3 text-[12px] text-ink focus-visible:border-brand-400 focus-visible:outline-none"
              >
                <option value="">All cities</option>
                {CITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="category-date"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Date
              </label>
              <select
                id="category-date"
                name="date"
                defaultValue={activeDate ?? ""}
                className="h-10 w-full rounded-lg border border-line bg-card px-3 text-[12px] text-ink focus-visible:border-brand-400 focus-visible:outline-none"
              >
                <option value="">Any date</option>
                <option value="week">Next 7 days</option>
                <option value="month">Next 30 days</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="category-sort"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Sort
              </label>
              <select
                id="category-sort"
                name="sort"
                defaultValue={activeSort}
                className="h-10 w-full rounded-lg border border-line bg-card px-3 text-[12px] text-ink focus-visible:border-brand-400 focus-visible:outline-none"
              >
                <option value="upcoming">Soonest first</option>
                <option value="newest">Newest listed</option>
                <option value="popular">Most popular</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-5 text-[12px] font-semibold text-white transition hover:bg-brand-700"
              >
                Apply filters
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {error ? (
            <Alert tone="danger" className="mt-6">
              Live events could not be loaded. {error}
            </Alert>
          ) : null}

          {events.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : !error ? (
            <EmptyState
              icon={CalendarRange}
              title="No events in this category yet"
              description="Try another city or date, or explore the full TICKORA calendar."
              actionLabel="Browse all events"
              actionHref="/events"
              className="mt-8"
            />
          ) : null}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
            <div>
              <p className="font-display text-[20px] text-ink">
                Looking for something else?
              </p>
              <p className="mt-1 text-[11.5px] text-muted">
                Explore every published event across Cameroon.
              </p>
            </div>
            <Link
              href="/events"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-5 text-[12px] font-semibold text-white transition hover:bg-brand-700"
            >
              Discover Events
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {categories
              .filter((item) => item.slug !== slug)
              .map((item) => (
                <Link
                  key={item.id}
                  href={`/categories/${item.slug}`}
                  className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[11px] font-medium text-muted transition hover:border-brand-300 hover:text-ink"
                >
                  {item.name}
                </Link>
              ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
