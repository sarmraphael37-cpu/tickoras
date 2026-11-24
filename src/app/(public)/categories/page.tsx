import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CategoryIcon } from "@/components/ui/category-icon";
import { DemoBadge } from "@/components/system/config-notice";
import { getCategories } from "@/lib/data/public";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Event categories",
  description:
    "Browse music, technology, arts, food, sport and community events across Cameroon.",
};

const accents = [
  "from-[#2563EB] to-[#0D1B30]",
  "from-[#1D4ED8] to-[#071426]",
  "from-[#3B82F6] to-[#11243D]",
  "from-[#1E40AF] to-[#071426]",
  "from-[#60A5FA] to-[#0D1B30]",
  "from-[#2563EB] to-[#162B47]",
];

export default async function CategoriesPage() {
  const { categories } = await getCategories();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-cream">
          <div className="container-page py-12 sm:py-16">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="eyebrow">
                <Sparkles className="h-3 w-3" />
                Browse the scene
              </p>
              <DemoBadge />
            </div>
            <h1 className="display-title mt-4 max-w-3xl text-[42px] leading-[0.99] sm:text-[58px]">
              Every kind of night,
              <br />
              <span className="italic text-accent-300">all in one place.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[14px] leading-7 text-muted">
              Six ways into Cameroon&apos;s cultural calendar. Pick a mood and
              we&apos;ll show you what&apos;s coming up.
            </p>
          </div>
        </section>

        <section className="container-page py-10 sm:py-14">
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white sm:p-8",
                  accents[index % accents.length],
                )}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -bottom-12 -right-2 h-40 w-40 rounded-full border border-white/10" />
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-card/10 backdrop-blur">
                    <CategoryIcon name={category.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
                    {category.eventCount} event{category.eventCount === 1 ? "" : "s"}
                  </span>
                </div>
                <h2 className="mt-8 font-display text-[30px] leading-none">
                  {category.name}
                </h2>
                <p className="mt-2.5 max-w-sm text-[12px] leading-6 text-white/65">
                  {category.description ?? `Discover ${category.name.toLowerCase()} events across Cameroon.`}
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">
                  Explore
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-card p-12 text-center">
              <p className="font-display text-2xl">Categories are being set up.</p>
              <p className="mt-2 text-sm text-muted">
                Run the database seed or add categories from the admin dashboard.
              </p>
            </div>
          ) : null}

          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl border border-line bg-card p-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-[24px] leading-tight text-ink">
                Not sure what you&apos;re in the mood for?
              </p>
              <p className="mt-1 text-[12px] text-muted">
                Browse everything happening in the next 30 days.
              </p>
            </div>
            <Link
              href="/events"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand-600 px-5 text-[13px] font-semibold text-white transition hover:bg-brand-700"
            >
              See all events
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
