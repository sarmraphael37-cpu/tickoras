import { CalendarRange, MapPin, Search } from "lucide-react";
import type { CategorySummary } from "@/lib/domain";
import { CITIES } from "@/lib/domain";

const DATES = [
  { value: "", label: "Any date" },
  { value: "week", label: "Next 7 days" },
  { value: "month", label: "Next 30 days" },
];

export function HeroSearch({ categories }: { categories: CategorySummary[] }) {
  return (
    <form
      action="/events"
      method="get"
      className="mt-8 rounded-2xl border border-line bg-card p-3 shadow-[0_20px_50px_-30px_rgba(4,38,31,0.35)] sm:mt-10"
      role="search"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-center">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 sm:col-span-2 lg:col-span-1">
          <Search className="h-4 w-4 shrink-0 text-accent-300" />
          <div className="min-w-0 flex-1">
            <label
              htmlFor="hero-q"
              className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted"
            >
              What are you looking for?
            </label>
            <input
              id="hero-q"
              name="q"
              type="search"
              placeholder="Concerts, summits, food nights…"
              className="mt-0.5 w-full border-0 bg-transparent p-0 text-[13px] font-medium text-ink placeholder:font-normal placeholder:text-muted focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        <SearchField
          id="hero-city"
          name="city"
          label="Location"
          icon={<MapPin className="h-4 w-4 shrink-0 text-accent-300" />}
          options={[
            { value: "", label: "All of Cameroon" },
            ...CITIES.map((city) => ({ value: city, label: city })),
          ]}
        />

        <SearchField
          id="hero-date"
          name="date"
          label="Date"
          icon={<CalendarRange className="h-4 w-4 shrink-0 text-accent-300" />}
          options={DATES}
        />

        <SearchField
          id="hero-category"
          name="category"
          label="Category"
          icon={<Search className="h-4 w-4 shrink-0 text-accent-300" />}
          options={[
            { value: "", label: "Everything" },
            ...categories.map((category) => ({
              value: category.slug,
              label: category.name,
            })),
          ]}
        />

        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:col-span-2 lg:col-span-1"
        >
          <Search className="h-4 w-4" />
          Search events
        </button>
      </div>
      <input type="hidden" name="sort" value="upcoming" />
    </form>
  );
}

function SearchField({
  id,
  name,
  label,
  icon,
  options,
}: {
  id: string;
  name: string;
  label: string;
  icon: React.ReactNode;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
      {icon}
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted"
        >
          {label}
        </label>
        <select
          id={id}
          name={name}
          className="mt-0.5 w-full cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-ink focus:outline-none focus:ring-0"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
