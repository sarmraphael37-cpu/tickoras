import type { Metadata } from "next";
import Link from "next/link";
import { Search, Store } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProviderCard } from "@/components/marketplace/provider-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  getServiceCategories,
  listServiceProviders,
} from "@/lib/data/marketplace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Event services marketplace",
  description:
    "Hire photographers, videographers, DJs, caterers, security, venues and more for your events across Cameroon.",
};

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = first(params.q)?.slice(0, 120);
  const category = first(params.category);
  const city = first(params.city)?.slice(0, 80);
  const verified = first(params.verified) === "1";

  const [categories, providers] = await Promise.all([
    getServiceCategories(),
    listServiceProviders({
      query,
      categorySlug: category,
      city,
      verifiedOnly: verified,
    }),
  ]);

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const values: Record<string, string | undefined> = {
      q: query,
      category,
      city,
      verified: verified ? "1" : undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/services?${qs}` : "/services";
  };

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-cream">
          <div className="container-page pb-9 pt-9 sm:pb-12 sm:pt-12">
            <nav className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/" className="hover:text-ink">Home</Link>
              <span>/</span>
              <span className="text-ink">Services</span>
            </nav>
            <div className="mt-5 max-w-2xl">
              <p className="eyebrow">Event services marketplace</p>
              <h1 className="display-title mt-2 text-[38px] leading-[1.02] sm:text-[50px]">
                Everything your event
                <br />
                <span className="italic text-accent-300">needs, one marketplace.</span>
              </h1>
              <p className="mt-3 text-[13px] leading-6 text-muted">
                Photographers, caterers, security, venues and more — vetted
                providers serving events across Cameroon.
              </p>
            </div>

            <form action="/services" method="get" className="mt-6 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search providers…"
                  className="pl-9"
                />
              </div>
              <Input
                name="city"
                defaultValue={city}
                placeholder="City (e.g. Buea)"
                className="sm:w-44"
              />
              <Button type="submit">Search</Button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={buildHref({ category: undefined, verified: undefined })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition",
                  !category && !verified
                    ? "border-brand-500 bg-brand-600 text-white"
                    : "border-line bg-card text-muted hover:text-ink",
                )}
              >
                All services
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={buildHref({ category: cat.slug, verified: undefined })}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition",
                    category === cat.slug
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-line bg-card text-muted hover:text-ink",
                  )}
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                href={buildHref({ verified: verified ? undefined : "1" })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition",
                  verified
                    ? "border-brand-500 bg-brand-600 text-white"
                    : "border-line bg-card text-muted hover:text-ink",
                )}
              >
                Verified only
              </Link>
            </div>
          </div>
        </section>

        <section className="container-page py-10">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[12px] text-muted">
              <span className="font-semibold text-ink">{providers.length}</span>{" "}
              provider{providers.length === 1 ? "" : "s"}
              {category
                ? ` in ${categories.find((c) => c.slug === category)?.name ?? category}`
                : ""}
              {city ? ` · ${city}` : ""}
            </p>
            <Link
              href="/provider"
              className="text-[11.5px] font-medium text-accent-300 hover:underline"
            >
              Are you a provider? Join the marketplace →
            </Link>
          </div>

          {providers.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No providers found"
              description="Try a different category or city — or be the first provider listed."
              actionLabel="Become a provider"
              actionHref="/provider"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
