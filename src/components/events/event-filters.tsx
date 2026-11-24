import Link from "next/link";
import { Search, X } from "lucide-react";
import type { CategorySummary } from "@/lib/domain";
import { CITIES } from "@/lib/domain";
import { cn } from "@/lib/utils";

const DATES = [
  { value: "", label: "Any date" },
  { value: "week", label: "Next 7 days" },
  { value: "month", label: "Next 30 days" },
];

const PRICES = [
  { value: "", label: "Any price" },
  { value: "free", label: "Free" },
  { value: "under5000", label: "Under 5,000 FCFA" },
  { value: "5000-15000", label: "5,000 – 15,000 FCFA" },
  { value: "over15000", label: "Over 15,000 FCFA" },
];

export interface ActiveFilters {
  q?: string;
  category?: string;
  city?: string;
  date?: string;
  price?: string;
  sort?: string;
}

export function EventFilters({
  categories,
  filters,
  total,
}: {
  categories: CategorySummary[];
  filters: ActiveFilters;
  total: number;
}) {
  const active = Object.entries(filters).filter(
    ([key, value]) => value && key !== "sort",
  );
  const activeCategory = categories.find((c) => c.slug === filters.category);

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <form action="/events" method="get" className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <label htmlFor="filter-q" className="sr-only">
            Search events or organizers
          </label>
          <input
            id="filter-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search events or organizers"
            className="h-11 w-full rounded-lg border border-line bg-card pl-10 pr-3.5 text-[13px] text-ink placeholder:text-muted focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
          />
        </div>

        <div>
          <label htmlFor="filter-category" className="sr-only">
            Category
          </label>
          <select
            id="filter-category"
            name="category"
            defaultValue={filters.category ?? ""}
            className="h-11 w-full rounded-lg border border-line bg-card px-3 text-[13px] text-ink focus-visible:border-brand-400 focus-visible:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-city" className="sr-only">
            City
          </label>
          <select
            id="filter-city"
            name="city"
            defaultValue={filters.city ?? ""}
            className="h-11 w-full rounded-lg border border-line bg-card px-3 text-[13px] text-ink focus-visible:border-brand-400 focus-visible:outline-none"
          >
            <option value="">All cities</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="h-11 rounded-lg bg-brand-600 px-6 text-[13px] font-semibold text-white transition hover:bg-brand-700"
        >
          Search
        </button>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-3">
          <div>
            <label htmlFor="filter-date" className="sr-only">
              Date
            </label>
            <select
              id="filter-date"
              name="date"
              defaultValue={filters.date ?? ""}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[12px] text-ink focus-visible:border-brand-400 focus-visible:outline-none"
            >
              {DATES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-price" className="sr-only">
              Price
            </label>
            <select
              id="filter-price"
              name="price"
              defaultValue={filters.price ?? ""}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[12px] text-ink focus-visible:border-brand-400 focus-visible:outline-none"
            >
              {PRICES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <label htmlFor="filter-sort" className="sr-only">
              Sort
            </label>
            <select
              id="filter-sort"
              name="sort"
              defaultValue={filters.sort ?? "upcoming"}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[12px] text-ink focus-visible:border-brand-400 focus-visible:outline-none"
            >
              <option value="upcoming">Soonest first</option>
              <option value="newest">Newest listed</option>
              <option value="popular">Most popular</option>
            </select>
          </div>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <p className="mr-1 text-[12px] text-muted">
          <span className="font-semibold text-ink">{total}</span> event
          {total === 1 ? "" : "s"} found
        </p>
        {activeCategory ? (
          <FilterChip label={activeCategory.name} href={buildHref(filters, "category")} />
        ) : null}
        {filters.city ? (
          <FilterChip label={filters.city} href={buildHref(filters, "city")} />
        ) : null}
        {filters.date ? (
          <FilterChip
            label={DATES.find((d) => d.value === filters.date)?.label ?? "Date"}
            href={buildHref(filters, "date")}
          />
        ) : null}
        {filters.price ? (
          <FilterChip
            label={PRICES.find((p) => p.value === filters.price)?.label ?? "Price"}
            href={buildHref(filters, "price")}
          />
        ) : null}
        {filters.q ? (
          <FilterChip label={`“${filters.q}”`} href={buildHref(filters, "q")} />
        ) : null}
        {active.length > 0 ? (
          <Link
            href="/events"
            className="ml-auto text-[11px] font-medium text-muted underline underline-offset-4 hover:text-ink"
          >
            Clear all
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function buildHref(filters: ActiveFilters, removeKey: keyof ActiveFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== removeKey) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/events?${qs}` : "/events";
}

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-accent-200 transition hover:border-brand-300",
      )}
    >
      {label}
      <X className="h-3 w-3" />
    </Link>
  );
}
