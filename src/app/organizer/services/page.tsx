import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search, Store } from "lucide-react";
import {
  BookingRequestForm,
  ServiceBookingActions,
  ServiceReviewForm,
  ServiceStatusBadge,
} from "@/components/marketplace/marketplace-forms";
import { ProviderCard } from "@/components/marketplace/provider-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { requireViewer } from "@/lib/auth";
import {
  getOrganizerIdForUser,
  getOrganizerServiceBookings,
  getServiceCategories,
  getServiceProviderBySlug,
  listServiceProviders,
} from "@/lib/data/marketplace";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate, formatXAF } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Service marketplace" };
export const dynamic = "force-dynamic";

interface SearchParams {
  [key: string]: string | string[] | undefined;
}
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrganizerServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer("/organizer/services");
  const providerSlug = first(params.provider);

  const organizerId = await getOrganizerIdForUser(viewer.id);
  const [categories, bookings] = await Promise.all([
    getServiceCategories(),
    getOrganizerServiceBookings(viewer.id),
  ]);

  // Provider selected for a booking request
  let selectedProvider = null;
  if (providerSlug) {
    selectedProvider = await getServiceProviderBySlug(providerSlug);
  }

  // Organizer events for linking
  let events: Array<{ id: string; title: string }> = [];
  if (selectedProvider && organizerId && isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("events")
      .select("id, title")
      .eq("organizer_id", organizerId)
      .order("start_at", { ascending: false })
      .limit(50);
    events = (data ?? []) as Array<{ id: string; title: string }>;
  }

  // Browse providers
  const category = first(params.category);
  const city = first(params.city);
  const q = first(params.q);
  const providers = await listServiceProviders({
    query: q,
    categorySlug: category,
    city,
  });

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const values: Record<string, string | undefined> = {
      q,
      category,
      city,
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/organizer/services?${qs}` : "/organizer/services";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] leading-tight text-ink">
            Service marketplace
          </h1>
          <p className="mt-1 text-[12px] text-muted">
            Hire photographers, caterers, security and more for your events.
          </p>
        </div>
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-accent-300 hover:underline"
        >
          Public marketplace <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
        </Link>
      </div>

      {!organizerId ? (
        <Card className="border-warning/40 bg-warning/10 p-4">
          <p className="text-[12.5px] font-semibold text-warning">
            Organizer profile required
          </p>
          <p className="mt-1 text-[11.5px] text-muted">
            You can browse providers, but booking requests need an approved
            organizer account.
          </p>
        </Card>
      ) : null}

      {selectedProvider ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-300">
                Booking request
              </p>
              <h2 className="mt-1 text-[17px] font-semibold text-ink">
                {selectedProvider.businessName}
              </h2>
            </div>
            <Link
              href="/organizer/services"
              className="text-[11px] font-medium text-muted hover:text-ink"
            >
              ← Back to marketplace
            </Link>
          </div>
          <div className="mt-4">
            {organizerId ? (
              <BookingRequestForm
                providerId={selectedProvider.id}
                providerName={selectedProvider.businessName}
                events={events}
              />
            ) : (
              <p className="text-[12px] text-muted">
                Your organizer account is not approved yet.
              </p>
            )}
          </div>
        </Card>
      ) : null}

      {/* My service bookings */}
      {bookings.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ink">
            My service bookings ({bookings.length})
          </h2>
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-[14px]">{booking.title}</CardTitle>
                  <ServiceStatusBadge status={booking.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
                  <span className="font-mono">{booking.reference}</span>
                  <span>Provider: {booking.counterpartyName}</span>
                  {booking.eventDate ? <span>{formatDate(booking.eventDate)}</span> : null}
                  {booking.budgetXaf ? <span>Budget: {formatXAF(booking.budgetXaf)}</span> : null}
                </div>
                {booking.details ? (
                  <p className="rounded-lg bg-surface p-3 text-[12px] leading-5 text-muted">
                    {booking.details}
                  </p>
                ) : null}
                {booking.quotedAmountXaf ? (
                  <div className="rounded-lg border border-line p-3">
                    <p className="text-[12.5px] font-semibold text-ink">
                      Quotation: {formatXAF(booking.quotedAmountXaf)}
                    </p>
                    {booking.quoteNote ? (
                      <p className="mt-1 text-[11.5px] text-muted">{booking.quoteNote}</p>
                    ) : null}
                  </div>
                ) : null}
                {booking.status === "completed" ? (
                  <ServiceReviewForm bookingId={booking.id} />
                ) : null}
                <ServiceBookingActions
                  bookingId={booking.id}
                  status={booking.status}
                  role="organizer"
                />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {/* Browse providers */}
      {!selectedProvider ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Browse providers</h2>
            <form action="/organizer/services" method="get" className="flex gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                <Input name="q" defaultValue={q} placeholder="Search…" className="h-9 w-44 pl-8 text-[12px]" />
              </div>
              <Input name="city" defaultValue={city} placeholder="City" className="h-9 w-32 text-[12px]" />
              <Button type="submit" size="sm">Filter</Button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ category: undefined })}
              className={cn(
                "rounded-full border px-3 py-1 text-[10.5px] font-medium transition",
                !category
                  ? "border-brand-500 bg-brand-600 text-white"
                  : "border-line bg-card text-muted hover:text-ink",
              )}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildHref({ category: cat.slug })}
                className={cn(
                  "rounded-full border px-3 py-1 text-[10.5px] font-medium transition",
                  category === cat.slug
                    ? "border-brand-500 bg-brand-600 text-white"
                    : "border-line bg-card text-muted hover:text-ink",
                )}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {providers.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No providers yet"
              description="The marketplace is new — check back soon or invite providers you know."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <div key={provider.id} className="relative">
                  <ProviderCard provider={provider} />
                  {organizerId ? (
                    <Link
                      href={`/organizer/services?provider=${provider.slug}`}
                      className="absolute bottom-16 right-4 z-10"
                    >
                      <Badge tone="brand" className="cursor-pointer shadow">
                        Request quote
                      </Badge>
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
