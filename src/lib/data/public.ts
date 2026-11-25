import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  demoCategories,
  demoEventSummaries,
  demoEvents,
  demoOrganizers,
} from "@/lib/demo-data";
import type {
  CategorySummary,
  EventDetail,
  EventSummary,
  OrganizerSummary,
  TicketTypeSummary,
} from "@/lib/domain";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type DataSource = "live" | "demo";

export interface EventFilters {
  query?: string;
  category?: string;
  city?: string;
  date?: string;
  price?: string;
  sort?: string;
  view?: "list" | "map";
  page?: number;
  pageSize?: number;
}

const EVENT_SELECT = `
  id, slug, title, short_description, cover_image_url, city, venue_name,
  address, latitude, longitude,
  start_at, end_at, timezone, status, is_featured, views_count, organizer_id,
  category:categories(name, slug, color),
  organizer:organizers(name, slug, logo_url, status),
  ticket_types(name, description, price_xaf, quantity_total, quantity_sold,
    quantity_reserved, min_per_order, max_per_order, sales_start_at,
    sales_end_at, is_active, sort_order)
`;

function asObject<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function activeTickets(raw: any[] | null | undefined) {
  return (raw ?? []).filter((ticket) => ticket.is_active !== false);
}

function mapEventSummary(row: any): EventSummary {
  const category = asObject(row.category);
  const organizer = asObject(row.organizer);
  const tickets = activeTickets(row.ticket_types);
  const prices = tickets
    .map((ticket) => Number(ticket.price_xaf))
    .filter((price) => Number.isFinite(price));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    categoryColor: category?.color ?? null,
    city: row.city,
    venueName: row.venue_name,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone ?? null,
    status: row.status,
    isFeatured: Boolean(row.is_featured),
    organizerName: organizer?.name ?? "Independent organizer",
    organizerSlug: organizer?.slug ?? "",
    organizerLogoUrl: organizer?.logo_url ?? null,
    startingPriceXaf: prices.length ? Math.min(...prices) : null,
    ticketsSold: tickets.reduce(
      (sum, ticket) => sum + Number(ticket.quantity_sold ?? 0),
      0,
    ),
    capacity: tickets.reduce(
      (sum, ticket) => sum + Number(ticket.quantity_total ?? 0),
      0,
    ),
  };
}

function mapTicketTypes(raw: any[]): TicketTypeSummary[] {
  const now = Date.now();
  return raw
    .filter((ticket) => ticket.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((ticket) => {
      const salesStart = ticket.sales_start_at
        ? new Date(ticket.sales_start_at).getTime()
        : null;
      const salesEnd = ticket.sales_end_at
        ? new Date(ticket.sales_end_at).getTime()
        : null;
      const available = Math.max(
        0,
        Number(ticket.quantity_total) -
          Number(ticket.quantity_sold) -
          Number(ticket.quantity_reserved),
      );
      return {
        id: ticket.id,
        name: ticket.name,
        description: ticket.description ?? null,
        priceXaf: Number(ticket.price_xaf),
        quantityTotal: Number(ticket.quantity_total),
        quantitySold: Number(ticket.quantity_sold),
        quantityReserved: Number(ticket.quantity_reserved),
        available,
        minPerOrder: Number(ticket.min_per_order ?? 1),
        maxPerOrder: Number(ticket.max_per_order ?? 10),
        salesStartAt: ticket.sales_start_at ?? null,
        salesEndAt: ticket.sales_end_at ?? null,
        isActive: Boolean(ticket.is_active),
        salesOpen:
          available > 0 &&
          (salesStart === null || salesStart <= now) &&
          (salesEnd === null || salesEnd >= now),
      };
    });
}

function filterDemo(filters: EventFilters): EventSummary[] {
  const query = filters.query?.trim().toLowerCase();
  let events = demoEventSummaries.filter((event) => {
    const start = new Date(event.startAt).getTime();
    if (start < Date.now() - 6 * 3600_000) return false;
    if (query) {
      const haystack =
        `${event.title} ${event.organizerName} ${event.city} ${event.categoryName ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.category && event.categorySlug !== filters.category) return false;
    if (filters.city && event.city !== filters.city) return false;
    if (filters.price) {
      const price = event.startingPriceXaf ?? 0;
      if (filters.price === "free" && price !== 0) return false;
      if (filters.price === "under5000" && price >= 5000) return false;
      if (filters.price === "5000-15000" && (price < 5000 || price > 15000))
        return false;
      if (filters.price === "over15000" && price <= 15000) return false;
    }
    if (filters.date) {
      const start = new Date(event.startAt);
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      if (
        filters.date === "week" &&
        (start < today || start > endOfWeek)
      )
        return false;
      if (filters.date === "month") {
        const endOfMonth = new Date(today);
        endOfMonth.setDate(today.getDate() + 30);
        if (start < today || start > endOfMonth) return false;
      }
    }
    return true;
  });

  events = [...events].sort((a, b) => {
    if (filters.sort === "newest") return a.id < b.id ? 1 : -1;
    if (filters.sort === "popular") return b.ticketsSold - a.ticketsSold;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
  return events;
}

async function queryEvents(
  supabase: SupabaseClient,
  filters: EventFilters,
  limitOverride?: number,
): Promise<{ events: EventSummary[]; error: string | null }> {
  const pageSize = limitOverride ?? filters.pageSize ?? 9;
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let organizerIds: string[] = [];
  const query = filters.query?.trim();
  if (query) {
    const { data: organizers } = await supabase
      .from("organizers")
      .select("id")
      .eq("status", "approved")
      .ilike("name", `%${query.replace(/[,%()]/g, " ")}%`)
      .limit(20);
    organizerIds = (organizers ?? []).map((row: any) => row.id);
  }

  let categoryId: string | null = null;
  if (filters.category) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();
    categoryId = (category as any)?.id ?? null;
  }

  let builder = supabase
    .from("events")
    .select(EVENT_SELECT, { count: "exact" })
    .eq("status", "published")
    .gte("start_at", new Date(Date.now() - 6 * 3600_000).toISOString());

  if (query) {
    const safe = query.replace(/[,%()]/g, " ").trim();
    const ors = [`title.ilike.%${safe}%`, `short_description.ilike.%${safe}%`];
    if (organizerIds.length) ors.push(`organizer_id.in.(${organizerIds.join(",")})`);
    builder = builder.or(ors.join(","));
  }
  if (categoryId) builder = builder.eq("category_id", categoryId);
  if (filters.city) builder = builder.eq("city", filters.city);
  if (filters.price) {
    builder = builder.eq("ticket_types.is_active", true);
    if (filters.price === "free") builder = builder.eq("ticket_types.price_xaf", 0);
    if (filters.price === "under5000")
      builder = builder.lt("ticket_types.price_xaf", 5000);
    if (filters.price === "5000-15000") {
      builder = builder
        .gte("ticket_types.price_xaf", 5000)
        .lte("ticket_types.price_xaf", 15000);
    }
    if (filters.price === "over15000")
      builder = builder.gt("ticket_types.price_xaf", 15000);
  }
  if (filters.date === "week") {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    builder = builder.lte("start_at", end.toISOString());
  }
  if (filters.date === "month") {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    builder = builder.lte("start_at", end.toISOString());
  }

  if (filters.sort === "newest") {
    builder = builder.order("created_at", { ascending: false });
  } else if (filters.sort === "popular") {
    builder = builder.order("views_count", { ascending: false });
  } else {
    builder = builder.order("start_at", { ascending: true });
  }

  const { data, error } = await builder.range(from, to);
  if (error) {
    console.error("[tickora] event query failed:", error.message);
    return { events: [], error: error.message };
  }
  return { events: (data ?? []).map(mapEventSummary), error: null };
}

export async function listEvents(filters: EventFilters = {}): Promise<{
  events: EventSummary[];
  total: number;
  source: DataSource;
  error: string | null;
}> {
  if (!isSupabaseConfigured) {
    const all = filterDemo(filters);
    const pageSize = filters.pageSize ?? 9;
    const page = Math.max(1, filters.page ?? 1);
    return {
      events: all.slice((page - 1) * pageSize, page * pageSize),
      total: all.length,
      source: "demo",
      error: null,
    };
  }

  const supabase = await createClient();
  const { events, error } = await queryEvents(supabase, filters);
  let total = events.length;

  // Exact count for pagination is fetched separately to keep the select shape stable.
  let countBuilder = supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gte("start_at", new Date(Date.now() - 6 * 3600_000).toISOString());
  if (filters.city) countBuilder = countBuilder.eq("city", filters.city);
  if (filters.category) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();
    if (category) countBuilder = countBuilder.eq("category_id", (category as any).id);
  }
  const { count, error: countError } = await countBuilder;
  if (typeof count === "number") total = count;
  if (countError) {
    console.error("[tickora] event count failed:", countError.message);
  }

  return {
    events,
    total,
    source: "live",
    error: error ?? (countError ? countError.message : null),
  };
}

export async function getFeaturedEvents(limit = 4): Promise<EventSummary[]> {
  if (!isSupabaseConfigured) {
    return demoEventSummaries.filter((e) => e.isFeatured).slice(0, limit);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .eq("is_featured", true)
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[tickora] featured query failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapEventSummary);
}

export async function getTrendingEvents(limit = 5): Promise<EventSummary[]> {
  if (!isSupabaseConfigured) {
    return [...demoEventSummaries]
      .sort((a, b) => b.ticketsSold - a.ticketsSold)
      .slice(0, limit);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .gte("start_at", new Date().toISOString())
    .order("views_count", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapEventSummary);
}

export async function getUpcomingEvents(limit = 6): Promise<EventSummary[]> {
  if (!isSupabaseConfigured) {
    return [...demoEventSummaries]
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      )
      .slice(0, limit);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapEventSummary);
}

export async function getEventBySlug(
  slug: string,
): Promise<{ event: EventDetail | null; source: DataSource }> {
  if (!isSupabaseConfigured) {
    return {
      event: demoEvents.find((event) => event.slug === slug) ?? null,
      source: "demo",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      `${EVENT_SELECT}, description, banner_image_url, address, organizer_id,
       organizer:organizers(name, slug, logo_url, description, status)`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[tickora] event detail failed:", error.message);
    return { event: null, source: "live" };
  }

  const summary = mapEventSummary(data);
  const organizer = asObject((data as any).organizer);
  const event: EventDetail = {
    ...summary,
    description: (data as any).description ?? "",
    address: (data as any).address ?? null,
    bannerImageUrl: (data as any).banner_image_url ?? null,
    viewsCount: Number((data as any).views_count ?? 0),
    organizerId: (data as any).organizer_id,
    organizerDescription: organizer?.description ?? null,
    ticketTypes: mapTicketTypes((data as any).ticket_types ?? []),
  };

  // Best-effort view analytics; failure must never block the page.
  void supabase
    .rpc("record_event_view", { p_event_id: event.id })
    .then(({ error: viewError }) => {
      if (viewError) console.warn("[tickora] view tracking:", viewError.message);
    });

  return { event, source: "live" };
}

export async function getCategories(): Promise<{
  categories: CategorySummary[];
  source: DataSource;
}> {
  if (!isSupabaseConfigured) {
    return { categories: demoCategories, source: "demo" };
  }
  const supabase = await createClient();
  const [{ data: categories, error }, { data: events }] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("events").select("category_id").eq("status", "published"),
  ]);
  if (error) {
    console.error("[tickora] categories failed:", error.message);
    return { categories: [], source: "live" };
  }
  const counts = new Map<string, number>();
  for (const event of (events ?? []) as any[]) {
    if (event.category_id)
      counts.set(event.category_id, (counts.get(event.category_id) ?? 0) + 1);
  }
  return {
    categories: (categories ?? []).map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      color: category.color,
      eventCount: counts.get(category.id) ?? 0,
    })),
    source: "live",
  };
}

export async function getOrganizers(limit = 6): Promise<{
  organizers: OrganizerSummary[];
  source: DataSource;
}> {
  if (!isSupabaseConfigured) {
    return {
      organizers: demoOrganizers.slice(0, limit),
      source: "demo",
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizers")
    .select("id, name, slug, logo_url, description, city, status, events(count)")
    .eq("status", "approved")
    .order("name")
    .limit(limit);
  if (error) {
    console.error("[tickora] organizers failed:", error.message);
    return { organizers: [], source: "live" };
  }
  return {
    organizers: (data ?? []).map((organizer: any) => {
      const count = Array.isArray(organizer.events)
        ? organizer.events[0]?.count
        : organizer.events?.count;
      return {
        id: organizer.id,
        name: organizer.name,
        slug: organizer.slug,
        logoUrl: organizer.logo_url,
        description: organizer.description,
        city: organizer.city,
        status: organizer.status,
        eventCount: Number(count ?? 0),
      };
    }),
    source: "live",
  };
}

export async function getOrganizerBySlug(slug: string): Promise<{
  organizer: (OrganizerSummary & { email: string | null }) | null;
  events: EventSummary[];
}> {
  if (!isSupabaseConfigured) {
    const organizer = demoOrganizers.find((item) => item.slug === slug);
    return {
      organizer: organizer ? { ...organizer, email: null } : null,
      events: demoEventSummaries.filter((event) => event.organizerSlug === slug),
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizers")
    .select("id, name, slug, logo_url, description, city, status, email")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error || !data) return { organizer: null, events: [] };

  const { data: events } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("organizer_id", (data as any).id)
    .eq("status", "published")
    .gte("start_at", new Date().toISOString())
    .order("start_at");

  return {
    organizer: {
      id: (data as any).id,
      name: (data as any).name,
      slug: (data as any).slug,
      logoUrl: (data as any).logo_url,
      description: (data as any).description,
      city: (data as any).city,
      status: (data as any).status,
      email: (data as any).email,
      eventCount: (events ?? []).length,
    },
    events: (events ?? []).map(mapEventSummary),
  };
}

export async function getPublicStats(): Promise<{
  eventCount: number;
  organizerCount: number;
  cityCount: number;
  source: DataSource;
}> {
  if (!isSupabaseConfigured) {
    return {
      eventCount: demoEventSummaries.length,
      organizerCount: demoOrganizers.length,
      cityCount: new Set(demoEventSummaries.map((event) => event.city)).size,
      source: "demo",
    };
  }
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("city")
    .eq("status", "published");
  const [{ count: organizerCount }] = await Promise.all([
    supabase
      .from("organizers")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
  ]);
  const rows = (events ?? []) as any[];
  return {
    eventCount: rows.length,
    organizerCount: organizerCount ?? 0,
    cityCount: new Set(rows.map((event) => event.city)).size,
    source: "live",
  };
}

/** Active category detail used by `/categories/[slug]`. */
export async function getCategoryBySlug(slug: string): Promise<{
  category: CategorySummary | null;
  source: DataSource;
}> {
  const { categories, source } = await getCategories();
  return {
    category: categories.find((category) => category.slug === slug) ?? null,
    source,
  };
}

export async function getRelatedEvents(
  eventId: string,
  categorySlug: string | null,
  limit = 3,
): Promise<EventSummary[]> {
  if (!isSupabaseConfigured) {
    return demoEventSummaries
      .filter(
        (event) => event.id !== eventId && event.categorySlug === categorySlug,
      )
      .slice(0, limit);
  }
  const supabase = await createClient();
  let builder = supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .neq("id", eventId)
    .gte("start_at", new Date().toISOString())
    .order("start_at")
    .limit(limit);
  if (categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (category) builder = builder.eq("category_id", (category as any).id);
  }
  const { data } = await builder;
  return (data ?? []).map(mapEventSummary);
}
