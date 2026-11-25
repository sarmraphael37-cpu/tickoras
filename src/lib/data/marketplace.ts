import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  ProviderPortfolioRow,
  ServiceBookingRow,
  ServiceBookingStatus,
  ServiceCategoryRow,
  ServiceProviderRow,
  ServiceReviewRow,
} from "@/types/database";

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface ServiceProvider {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  description: string | null;
  city: string | null;
  coverageAreas: string[];
  phone: string | null;
  whatsapp: string | null;
  logoUrl: string | null;
  startingPriceXaf: number | null;
  yearsExperience: number | null;
  isVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  latitude: number | null;
  longitude: number | null;
  categories: ServiceCategory[];
}

export interface ProviderDetail extends ServiceProvider {
  email: string | null;
  portfolios: ProviderPortfolioRow[];
  reviews: Array<ServiceReviewRow & { authorName: string | null }>;
}

export interface ServiceBooking {
  id: string;
  reference: string;
  title: string;
  details: string | null;
  eventDate: string | null;
  budgetXaf: number | null;
  status: ServiceBookingStatus;
  quotedAmountXaf: number | null;
  quoteNote: string | null;
  platformCommissionXaf: number;
  createdAt: string;
  completedAt: string | null;
  counterpartyName: string;
  eventTitle: string | null;
}

function mapProvider(row: ServiceProviderRow, categories: ServiceCategory[]): ServiceProvider {
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    slug: row.slug,
    description: row.description,
    city: row.city,
    coverageAreas: row.coverage_areas ?? [],
    phone: row.phone,
    whatsapp: row.whatsapp,
    logoUrl: row.logo_url,
    startingPriceXaf: row.starting_price_xaf,
    yearsExperience: row.years_experience,
    isVerified: row.is_verified,
    ratingAvg: Number(row.rating_avg),
    ratingCount: row.rating_count,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    categories,
  };
}

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_categories")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as ServiceCategory[];
}

export interface ProviderFilters {
  categorySlug?: string;
  city?: string;
  query?: string;
  verifiedOnly?: boolean;
  minRating?: number;
  maxPrice?: number;
}

export async function listServiceProviders(
  filters: ProviderFilters = {},
): Promise<ServiceProvider[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();

  let query = supabase
    .from("service_providers")
    .select("*, service_provider_categories(category_id)")
    .eq("is_active", true)
    .order("rating_avg", { ascending: false })
    .limit(100);

  if (filters.city) {
    query = query.or(`city.ilike.%${filters.city}%,coverage_areas.cs.{${filters.city}}`);
  }
  if (filters.verifiedOnly) query = query.eq("is_verified", true);
  if (filters.maxPrice) query = query.lte("starting_price_xaf", filters.maxPrice);
  if (filters.minRating) query = query.gte("rating_avg", filters.minRating);
  if (filters.query) {
    query = query.or(
      `business_name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`,
    );
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Fetch categories for all providers in one query
  const categoryIds = new Set<string>();
  const providerCategoryMap = new Map<string, string[]>();
  for (const row of data as unknown as Array<ServiceProviderRow & {
    service_provider_categories: Array<{ category_id: string }> | null;
  }>) {
    const ids = (row.service_provider_categories ?? []).map((c) => c.category_id);
    providerCategoryMap.set(row.id, ids);
    ids.forEach((id) => categoryIds.add(id));
  }

  let categoriesById = new Map<string, ServiceCategory>();
  if (categoryIds.size > 0) {
    const { data: cats } = await supabase
      .from("service_categories")
      .select("id, name, slug, description")
      .in("id", Array.from(categoryIds));
    categoriesById = new Map(
      ((cats ?? []) as ServiceCategory[]).map((c) => [c.id, c]),
    );
  }

  let providers = (data as ServiceProviderRow[]).map((row) =>
    mapProvider(
      row,
      (providerCategoryMap.get(row.id) ?? [])
        .map((id) => categoriesById.get(id))
        .filter((c): c is ServiceCategory => Boolean(c)),
    ),
  );

  if (filters.categorySlug) {
    const { data: cat } = await supabase
      .from("service_categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .maybeSingle();
    if (cat) {
      providers = providers.filter((p) =>
        p.categories.some((c) => c.id === cat.id),
      );
    }
  }

  return providers;
}

export async function getServiceProviderBySlug(
  slug: string,
): Promise<ProviderDetail | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();

  const { data: provider } = await supabase
    .from("service_providers")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!provider) return null;

  const { data: links } = await supabase
    .from("service_provider_categories")
    .select("category_id")
    .eq("provider_id", provider.id);
  const catIds = (links ?? []).map((l) => l.category_id);
  const { data: cats } = catIds.length
    ? await supabase
        .from("service_categories")
        .select("id, name, slug, description")
        .in("id", catIds)
    : { data: [] };

  const { data: portfolios } = await supabase
    .from("provider_portfolios")
    .select("*")
    .eq("provider_id", provider.id)
    .order("sort_order");

  const { data: reviews } = await supabase
    .from("service_reviews")
    .select("*")
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Resolve reviewer names
  const authorIds = Array.from(new Set((reviews ?? []).map((r) => r.author_id)));
  const { data: profiles } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds)
    : { data: [] };
  const nameMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string }>).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

  const base = mapProvider(provider, (cats ?? []) as ServiceCategory[]);
  return {
    ...base,
    email: provider.email,
    portfolios: (portfolios ?? []) as ProviderPortfolioRow[],
    reviews: (reviews ?? []).map((r) => ({
      ...r,
      authorName: nameMap.get(r.author_id) ?? "TICKORA user",
    })),
  };
}

/** Provider profile for the logged-in user (dashboard). */
export async function getMyProviderProfile(
  userId: string,
): Promise<ServiceProviderRow | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_providers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ServiceProviderRow) ?? null;
}

/** Organizer's own organizer id. */
export async function getOrganizerIdForUser(
  userId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizers")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Bookings where the user is the provider owner. */
export async function getProviderBookings(
  userId: string,
): Promise<ServiceBooking[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from("service_providers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!provider) return [];

  const { data } = await supabase
    .from("service_bookings")
    .select("*, service_providers(business_name), organizers(owner_id), events(title)")
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: false })
    .limit(200);

  // Resolve organizer names via profiles
  const rows = data as unknown as Array<
    ServiceBookingRow & {
      service_providers: { business_name: string } | null;
      organizers: { owner_id: string } | null;
      events: { title: string } | null;
    }
  >;
  const ownerIds = Array.from(
    new Set(rows.map((r) => r.organizers?.owner_id).filter(Boolean) as string[]),
  );
  const { data: profiles } = ownerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds)
    : { data: [] };
  const nameMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string }>).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    title: row.title,
    details: row.details,
    eventDate: row.event_date,
    budgetXaf: row.budget_xaf,
    status: row.status,
    quotedAmountXaf: row.quoted_amount_xaf,
    quoteNote: row.quote_note,
    platformCommissionXaf: row.platform_commission_xaf,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    counterpartyName:
      nameMap.get(row.organizers?.owner_id ?? "") ?? "Organizer",
    eventTitle: row.events?.title ?? null,
  }));
}

/** Bookings where the user is the organizer owner. */
export async function getOrganizerServiceBookings(
  userId: string,
): Promise<ServiceBooking[]> {
  const organizerId = await getOrganizerIdForUser(userId);
  if (!organizerId) return [];
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();

  const { data } = await supabase
    .from("service_bookings")
    .select("*, service_providers(business_name, slug), events(title)")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (data as unknown as Array<
    ServiceBookingRow & {
      service_providers: { business_name: string; slug: string } | null;
      events: { title: string } | null;
    }
  >).map((row) => ({
    id: row.id,
    reference: row.reference,
    title: row.title,
    details: row.details,
    eventDate: row.event_date,
    budgetXaf: row.budget_xaf,
    status: row.status,
    quotedAmountXaf: row.quoted_amount_xaf,
    quoteNote: row.quote_note,
    platformCommissionXaf: row.platform_commission_xaf,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    counterpartyName: row.service_providers?.business_name ?? "Provider",
    eventTitle: row.events?.title ?? null,
  }));
}

/** Provider earnings summary for dashboard. */
export async function getProviderEarnings(userId: string) {
  const bookings = await getProviderBookings(userId);
  const completed = bookings.filter((b) => b.status === "completed");
  const gross = completed.reduce((sum, b) => sum + (b.quotedAmountXaf ?? 0), 0);
  const commission = completed.reduce(
    (sum, b) => sum + b.platformCommissionXaf,
    0,
  );
  return {
    completedCount: completed.length,
    grossXaf: gross,
    commissionXaf: commission,
    netXaf: gross - commission,
    pendingCount: bookings.filter((b) =>
      ["pending", "quotation_submitted", "accepted", "payment_pending", "confirmed", "in_progress"].includes(b.status),
    ).length,
  };
}
