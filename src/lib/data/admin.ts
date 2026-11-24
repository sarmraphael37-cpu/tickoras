import "server-only";

import type {
  AuditLogRow,
  CategoryRow,
  ContactMessageRow,
  NewsletterRow,
  OrganizerRow,
  PlatformSettingRow,
  ProfileRow,
} from "@/types/database";
import { createClient } from "@/lib/supabase/server";

function asObject<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export interface AdminOrganizerRow extends OrganizerRow {
  ownerName: string | null;
  ownerEmail: string | null;
  eventCount: number;
}

export interface AdminEventRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  city: string;
  venueName: string;
  startAt: string;
  endAt: string;
  organizerName: string;
  organizerId: string;
  coverImageUrl: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  rejectionReason: string | null;
  isFeatured: boolean;
  ticketsSold: number;
  grossRevenue: number;
  createdAt: string;
}

export interface AdminBookingRow {
  id: string;
  reference: string;
  status: string;
  totalXaf: number;
  serviceFeeXaf: number;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  eventTitle: string;
  eventSlug: string;
  ticketCount: number;
}

export interface AdminPaymentRow {
  id: string;
  provider: string;
  status: string;
  amountXaf: number;
  isDemo: boolean;
  providerReference: string | null;
  createdAt: string;
  bookingReference: string;
  bookingStatus: string;
  eventTitle: string;
}

export interface AdminRefundRow {
  id: string;
  amountXaf: number;
  status: string;
  reason: string;
  createdAt: string;
  bookingId: string;
  bookingReference: string;
  requesterName: string;
  requesterEmail: string;
  provider: string | null;
  isDemo: boolean;
}

export interface AdminPayoutRow {
  id: string;
  amountXaf: number;
  status: string;
  method: string;
  destination: string;
  createdAt: string;
  organizerId: string;
  organizerName: string;
  adminNote: string | null;
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isSuspended: boolean;
  createdAt: string;
  roles: string[];
}

export interface AdminRevenuePoint {
  day: string;
  organizerRevenueXaf: number;
  platformRevenueXaf: number;
  orders: number;
}

export interface AdminOverview {
  totals: {
    users: number;
    organizers: number;
    pendingOrganizers: number;
    events: number;
    publishedEvents: number;
    pendingEvents: number;
    bookings: number;
    confirmedBookings: number;
    ticketsSold: number;
    grossRevenue: number;
    platformRevenue: number;
    openRefunds: number;
    openPayouts: number;
    messages: number;
    subscribers: number;
  };
  revenue: AdminRevenuePoint[];
  pendingOrganizersList: AdminOrganizerRow[];
  pendingEventsList: AdminEventRow[];
  recentAudit: Array<AuditLogRow & { actorName: string | null }>;
}

export async function listAdminOrganizers(
  status?: string,
): Promise<AdminOrganizerRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("organizers")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status as OrganizerRow["status"]);

  const { data, error } = await query;
  if (error) {
    console.error("[tickora] admin organizers:", error.message);
    return [];
  }
  const rows = (data ?? []) as OrganizerRow[];

  const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
  const [{ data: profiles }, { data: events }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    supabase.from("events").select("organizer_id"),
  ]);
  const profileMap = new Map(
    ((profiles ?? []) as any[]).map((profile) => [profile.id, profile]),
  );
  const eventCounts = new Map<string, number>();
  for (const event of (events ?? []) as any[]) {
    eventCounts.set(
      event.organizer_id,
      (eventCounts.get(event.organizer_id) ?? 0) + 1,
    );
  }

  return rows.map((row) => ({
    ...row,
    ownerName: profileMap.get(row.owner_id)?.full_name ?? null,
    ownerEmail: profileMap.get(row.owner_id)?.email ?? null,
    eventCount: eventCounts.get(row.id) ?? 0,
  }));
}

export async function listAdminEvents(status?: string): Promise<AdminEventRow[]> {
  const supabase = await createClient();
  const [eventsResult, summaryResult] = await Promise.all([
    (() => {
      let query = supabase
        .from("events")
        .select(
          `id, title, slug, status, city, venue_name, start_at, end_at,
           cover_image_url, submitted_at, published_at, rejection_reason,
           is_featured, created_at, organizer_id,
           organizer:organizers(name)`,
        )
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status as any);
      return query;
    })(),
    supabase
      .from("event_sales_summary")
      .select("event_id, tickets_sold, gross_revenue"),
  ]);

  if (eventsResult.error) {
    console.error("[tickora] admin events:", eventsResult.error.message);
    return [];
  }
  const summaries = new Map<string, any>(
    ((summaryResult.data ?? []) as any[]).map((row) => [row.event_id, row]),
  );

  return ((eventsResult.data ?? []) as any[]).map((row) => {
    const summary = summaries.get(row.id);
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      city: row.city,
      venueName: row.venue_name,
      startAt: row.start_at,
      endAt: row.end_at,
      organizerName: asObject<any>(row.organizer)?.name ?? "Organizer",
      organizerId: row.organizer_id,
      coverImageUrl: row.cover_image_url ?? null,
      submittedAt: row.submitted_at ?? null,
      publishedAt: row.published_at ?? null,
      rejectionReason: row.rejection_reason ?? null,
      isFeatured: Boolean(row.is_featured),
      ticketsSold: Number(summary?.tickets_sold ?? 0),
      grossRevenue: Number(summary?.gross_revenue ?? 0),
      createdAt: row.created_at,
    };
  });
}

export async function listAdminBookings(limit = 200): Promise<AdminBookingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, reference, status, total_xaf, service_fee_xaf, contact_name,
       contact_email, created_at, tickets(id),
       event:events(title, slug)`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[tickora] admin bookings:", error.message);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => {
    const event = asObject<any>(row.event) ?? {};
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      totalXaf: Number(row.total_xaf ?? 0),
      serviceFeeXaf: Number(row.service_fee_xaf ?? 0),
      contactName: row.contact_name ?? "",
      contactEmail: row.contact_email ?? "",
      createdAt: row.created_at,
      eventTitle: event.title ?? "",
      eventSlug: event.slug ?? "",
      ticketCount: Array.isArray(row.tickets) ? row.tickets.length : 0,
    };
  });
}

export async function listAdminPayments(limit = 200): Promise<AdminPaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      `id, provider, status, amount_xaf, is_demo, provider_reference, created_at,
       booking:bookings(reference, status, event:events(title))`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[tickora] admin payments:", error.message);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => {
    const booking = asObject<any>(row.booking) ?? {};
    return {
      id: row.id,
      provider: row.provider,
      status: row.status,
      amountXaf: Number(row.amount_xaf ?? 0),
      isDemo: Boolean(row.is_demo),
      providerReference: row.provider_reference ?? null,
      createdAt: row.created_at,
      bookingReference: booking.reference ?? "",
      bookingStatus: booking.status ?? "",
      eventTitle: asObject<any>(booking.event)?.title ?? "",
    };
  });
}

export async function listAdminRefunds(status?: string): Promise<AdminRefundRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("refunds")
    .select(
      `id, amount_xaf, status, reason, created_at, booking_id, requested_by,
       booking:bookings(reference),
       payment:payments(provider, is_demo)`,
    )
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status as any);

  const { data, error } = await query;
  if (error) {
    console.error("[tickora] admin refunds:", error.message);
    return [];
  }
  const rows = (data ?? []) as any[];
  const requesterIds = [...new Set(rows.map((row) => row.requested_by))];
  const { data: profiles } = requesterIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", requesterIds)
    : { data: [] as any[] };
  const profileMap = new Map(
    ((profiles ?? []) as any[]).map((profile) => [profile.id, profile]),
  );

  return rows.map((row) => {
    const profile = profileMap.get(row.requested_by);
    const payment = asObject<any>(row.payment);
    return {
      id: row.id,
      amountXaf: Number(row.amount_xaf ?? 0),
      status: row.status,
      reason: row.reason,
      createdAt: row.created_at,
      bookingId: row.booking_id,
      bookingReference: asObject<any>(row.booking)?.reference ?? "",
      requesterName: profile?.full_name ?? "Attendee",
      requesterEmail: profile?.email ?? "",
      provider: payment?.provider ?? null,
      isDemo: Boolean(payment?.is_demo),
    };
  });
}

export async function listAdminPayouts(status?: string): Promise<AdminPayoutRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("organizer_payouts")
    .select(
      `id, amount_xaf, status, method, destination, created_at, organizer_id,
       admin_note, organizer:organizers(name)`,
    )
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status as any);

  const { data, error } = await query;
  if (error) {
    console.error("[tickora] admin payouts:", error.message);
    return [];
  }
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    amountXaf: Number(row.amount_xaf ?? 0),
    status: row.status,
    method: row.method,
    destination: row.destination,
    createdAt: row.created_at,
    organizerId: row.organizer_id,
    organizerName: asObject<any>(row.organizer)?.name ?? "Organizer",
    adminNote: row.admin_note ?? null,
  }));
}

export async function listAdminUsers(limit = 500): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, is_suspended, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[tickora] admin users:", error.message);
    return [];
  }
  const rows = (data ?? []) as ProfileRow[];
  const ids = rows.map((row) => row.id);
  const { data: roleRows } = ids.length
    ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
    : { data: [] as any[] };
  const roles = new Map<string, string[]>();
  for (const role of (roleRows ?? []) as any[]) {
    roles.set(role.user_id, [...(roles.get(role.user_id) ?? []), role.role]);
  }

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    isSuspended: row.is_suspended,
    createdAt: row.created_at,
    roles: roles.get(row.id) ?? [],
  }));
}

export async function listAdminCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[tickora] admin categories:", error.message);
    return [];
  }
  return (data ?? []) as CategoryRow[];
}

export async function listAdminAudit(
  limit = 100,
): Promise<Array<AuditLogRow & { actorName: string | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[tickora] admin audit:", error.message);
    return [];
  }
  const rows = (data ?? []) as AuditLogRow[];
  const actorIds = [
    ...new Set(rows.flatMap((row) => (row.actor_id ? [row.actor_id] : []))),
  ];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as any[] };
  const names = new Map(
    ((profiles ?? []) as any[]).map((profile) => [profile.id, profile.full_name]),
  );
  return rows.map((row) => ({
    ...row,
    actorName: row.actor_id ? names.get(row.actor_id) ?? null : null,
  }));
}

export async function listContactMessages(limit = 100): Promise<ContactMessageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ContactMessageRow[];
}

export async function listNewsletterSubscribers(
  limit = 100,
): Promise<NewsletterRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as NewsletterRow[];
}

export async function listPlatformSettingRows(): Promise<PlatformSettingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("*")
    .order("key", { ascending: true });
  return (data ?? []) as PlatformSettingRow[];
}

export interface AdminTicketRow {
  id: string;
  reference: string;
  eventId: string;
  eventTitle: string;
  attendeeName: string;
  ticketType: string;
  status: string;
  checkedInAt: string | null;
  bookingReference: string;
}

export async function listAdminTickets(
  limit = 200,
): Promise<AdminTicketRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `id, ticket_reference, status, attendee_name, checked_in_at,
       event:events(id, title),
       ticket_type:ticket_types(name),
       booking:bookings(reference)`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[tickora] admin tickets:", error.message);
    return [];
  }
  return ((data ?? []) as any[]).map((row) => {
    const event = asObject<any>(row.event) ?? {};
    return {
      id: row.id,
      reference: row.ticket_reference,
      eventId: event.id ?? "",
      eventTitle: event.title ?? "",
      attendeeName: row.attendee_name ?? "",
      ticketType: asObject<any>(row.ticket_type)?.name ?? "Ticket",
      status: row.status,
      checkedInAt: row.checked_in_at ?? null,
      bookingReference: asObject<any>(row.booking)?.reference ?? "",
    };
  });
}

export interface AdminCheckInRow {
  id: string;
  ticketReference: string;
  attendeeName: string;
  ticketType: string;
  eventId: string;
  eventTitle: string;
  method: "qr" | "manual";
  scannedAt: string;
  scannedByName: string;
}

export async function listAdminCheckIns(
  limit = 200,
): Promise<AdminCheckInRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select(
      `id, event_id, method, scanned_at, scanned_by,
       event:events(title),
       ticket:tickets(ticket_reference, attendee_name, ticket_type:ticket_types(name))`,
    )
    .order("scanned_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[tickora] admin check-ins:", error.message);
    return [];
  }
  const rows = (data ?? []) as any[];
  const ids = [...new Set(rows.map((row) => row.scanned_by).filter(Boolean))];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] as any[] };
  const names = new Map(
    ((profiles ?? []) as any[]).map((profile) => [profile.id, profile.full_name]),
  );
  return rows.map((row) => {
    const ticket = asObject<any>(row.ticket) ?? {};
    return {
      id: row.id,
      ticketReference: ticket.ticket_reference ?? "",
      attendeeName: ticket.attendee_name ?? "",
      ticketType: asObject<any>(ticket.ticket_type)?.name ?? "Ticket",
      eventId: row.event_id,
      eventTitle: asObject<any>(row.event)?.title ?? "",
      method: row.method,
      scannedAt: row.scanned_at,
      scannedByName: names.get(row.scanned_by) ?? "Scanner",
    };
  });
}

export async function getAdminUserDetail(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: roles }, { data: bookings }, { data: organizer }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, is_suspended, created_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("bookings")
        .select("id, reference, status, total_xaf, created_at, event:events(title)")
        .eq("attendee_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("organizers")
        .select("id, name, slug, status, created_at")
        .eq("owner_id", userId)
        .maybeSingle(),
    ]);
  return {
    profile: profile as any,
    roles: ((roles ?? []) as any[]).map((row) => row.role as string),
    bookings: (bookings ?? []) as any[],
    organizer: organizer as any,
  };
}

export async function getAdminOrganizerDetail(organizerId: string) {
  const supabase = await createClient();
  const { data: organizer } = await supabase
    .from("organizers")
    .select("*")
    .eq("id", organizerId)
    .maybeSingle();
  if (!organizer) return null;
  const ownerId = (organizer as any).owner_id;
  const [{ data: owner }, { data: events }, { data: eventsSummary }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .eq("id", ownerId)
        .maybeSingle(),
      supabase
        .from("events")
        .select("id, title, status, start_at, created_at")
        .eq("organizer_id", organizerId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("event_sales_summary")
        .select("event_id, tickets_sold, orders, gross_revenue, checked_in")
        .eq("organizer_id", organizerId),
    ]);
  return {
    organizer: organizer as any,
    owner: owner as any,
    events: (events ?? []) as any[],
    summary: ((eventsSummary ?? []) as any[]).reduce(
      (acc, row) => ({
        ticketsSold: acc.ticketsSold + Number(row.tickets_sold ?? 0),
        orders: acc.orders + Number(row.orders ?? 0),
        grossRevenue: acc.grossRevenue + Number(row.gross_revenue ?? 0),
        checkedIn: acc.checkedIn + Number(row.checked_in ?? 0),
      }),
      { ticketsSold: 0, orders: 0, grossRevenue: 0, checkedIn: 0 },
    ),
  };
}

export async function getAdminEventDetail(eventId: string) {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      `*, category:categories(name, slug), organizer:organizers(name, slug, status)`,
    )
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return null;
  const [{ data: tiers }, { data: summary }, { data: bookings }] =
    await Promise.all([
      supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order"),
      supabase
        .from("event_sales_summary")
        .select("tickets_sold, orders, gross_revenue, checked_in")
        .eq("event_id", eventId)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("id, reference, status, total_xaf, created_at, contact_name")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  return {
    event: event as any,
    tiers: (tiers ?? []) as any[],
    summary: (summary as any) ?? null,
    bookings: (bookings ?? []) as any[],
  };
}

export interface AdminAnalytics {
  totals: {
    users: number;
    attendees: number;
    organizers: number;
    events: number;
    publishedEvents: number;
    bookings: number;
    confirmedBookings: number;
    succeededPayments: number;
    grossVolume: number;
    platformRevenue: number;
    refundVolume: number;
    tickets: number;
    checkIns: number;
  };
  revenue: Array<{ day: string; revenueXaf: number; platformXaf: number; orders: number }>;
  cityCounts: Array<{ city: string; count: number }>;
  categoryCounts: Array<{ category: string; count: number }>;
}

export async function getAdminAnalytics(days = 30): Promise<AdminAnalytics> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const count = async (table: string, column = "id") => {
    const { count: value } = await supabase
      .from(table as never)
      .select(column, { count: "exact", head: true });
    return value ?? 0;
  };

  const [
    users,
    organizers,
    events,
    published,
    bookings,
    confirmed,
    payments,
    tickets,
    checkIns,
    refunds,
    revenue,
    cityEvents,
    categoryEvents,
  ] = await Promise.all([
    count("profiles"),
    count("organizers"),
    count("events"),
    (async () => {
      const { count: value } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");
      return value ?? 0;
    })(),
    count("bookings"),
    (async () => {
      const { count: value } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed");
      return value ?? 0;
    })(),
    (async () => {
      const { data, count: value } = await supabase
        .from("payments")
        .select("amount_xaf", { count: "exact" })
        .eq("status", "succeeded");
      return {
        count: value ?? 0,
        total: ((data ?? []) as any[]).reduce(
          (sum, row) => sum + Number(row.amount_xaf ?? 0),
          0,
        ),
      };
    })(),
    count("tickets"),
    count("check_ins"),
    (async () => {
      const { data } = await supabase
        .from("refunds")
        .select("amount_xaf")
        .in("status", ["approved", "processed"]);
      return ((data ?? []) as any[]).reduce(
        (sum, row) => sum + Number(row.amount_xaf ?? 0),
        0,
      );
    })(),
    supabase
      .from("platform_daily_revenue")
      .select("day, organizer_revenue_xaf, platform_revenue_xaf, orders")
      .gte("day", since.toISOString())
      .order("day", { ascending: true }),
    supabase.from("events").select("city"),
    supabase.from("events").select("category:categories(name)"),
  ]);

  const cityMap = new Map<string, number>();
  for (const row of ((cityEvents.data ?? []) as any[])) {
    cityMap.set(row.city, (cityMap.get(row.city) ?? 0) + 1);
  }
  const categoryMap = new Map<string, number>();
  for (const row of ((categoryEvents.data ?? []) as any[])) {
    const name = asObject<any>(row.category)?.name ?? "Uncategorised";
    categoryMap.set(name, (categoryMap.get(name) ?? 0) + 1);
  }

  return {
    totals: {
      users,
      attendees: Math.max(0, users - organizers),
      organizers,
      events,
      publishedEvents: published,
      bookings,
      confirmedBookings: confirmed,
      succeededPayments: payments.count,
      grossVolume: payments.total,
      platformRevenue: ((revenue.data ?? []) as any[]).reduce(
        (sum, row) => sum + Number(row.platform_revenue_xaf ?? 0),
        0,
      ),
      refundVolume: refunds,
      tickets,
      checkIns,
    },
    revenue: ((revenue.data ?? []) as any[]).map((row) => ({
      day: row.day,
      revenueXaf: Number(row.organizer_revenue_xaf ?? 0),
      platformXaf: Number(row.platform_revenue_xaf ?? 0),
      orders: Number(row.orders ?? 0),
    })),
    cityCounts: [...cityMap.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count),
    categoryCounts: [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export interface AdminSearchResults {
  users: AdminUserRow[];
  organizers: AdminOrganizerRow[];
  events: AdminEventRow[];
  bookings: AdminBookingRow[];
}

export async function adminGlobalSearch(
  query: string,
): Promise<AdminSearchResults> {
  const empty: AdminSearchResults = { users: [], organizers: [], events: [], bookings: [] };
  const term = query.trim();
  if (term.length < 2) return empty;
  const supabase = await createClient();
  const pattern = `%${term.replace(/[%_]/g, "")}%`;

  const [users, organizers, events, bookings] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, is_suspended, created_at")
      .or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("organizers")
      .select("*")
      .or(`name.ilike.${pattern},city.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("events")
      .select(
        `id, title, slug, status, city, venue_name, start_at, end_at,
         cover_image_url, submitted_at, published_at, rejection_reason,
         is_featured, created_at, organizer_id,
         organizer:organizers(name)`,
      )
      .or(`title.ilike.${pattern},city.ilike.${pattern},venue_name.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("bookings")
      .select(
        `id, reference, status, total_xaf, service_fee_xaf, contact_name,
         contact_email, created_at, tickets(id),
         event:events(title, slug)`,
      )
      .or(`reference.ilike.${pattern},contact_name.ilike.${pattern},contact_email.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const userIds = ((users.data ?? []) as ProfileRow[]).map((row) => row.id);
  const { data: roleRows } = userIds.length
    ? await supabase.from("user_roles").select("user_id, role").in("user_id", userIds)
    : { data: [] as any[] };
  const roles = new Map<string, string[]>();
  for (const role of (roleRows ?? []) as any[]) {
    roles.set(role.user_id, [...(roles.get(role.user_id) ?? []), role.role]);
  }

  const organizerRows = (organizers.data ?? []) as OrganizerRow[];
  const ownerIds = [...new Set(organizerRows.map((row) => row.owner_id))];
  const [{ data: ownerProfiles }, { data: eventCounts }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
    supabase.from("events").select("organizer_id"),
  ]);
  const ownerMap = new Map(
    ((ownerProfiles ?? []) as any[]).map((profile) => [profile.id, profile]),
  );
  const counts = new Map<string, number>();
  for (const event of (eventCounts ?? []) as any[]) {
    counts.set(event.organizer_id, (counts.get(event.organizer_id) ?? 0) + 1);
  }

  const summaryRows = new Map<string, any>();
  const eventIds = ((events.data ?? []) as any[]).map((row) => row.id);
  if (eventIds.length) {
    const { data: summaries } = await supabase
      .from("event_sales_summary")
      .select("event_id, tickets_sold, gross_revenue")
      .in("event_id", eventIds);
    for (const row of (summaries ?? []) as any[]) {
      summaryRows.set(row.event_id, row);
    }
  }

  return {
    users: ((users.data ?? []) as ProfileRow[]).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      isSuspended: row.is_suspended,
      createdAt: row.created_at,
      roles: roles.get(row.id) ?? [],
    })),
    organizers: organizerRows.map((row) => {
      const owner = ownerMap.get(row.owner_id);
      return {
        ...row,
        ownerName: (owner?.full_name as string | undefined) ?? null,
        ownerEmail: (owner?.email as string | undefined) ?? null,
        eventCount: counts.get(row.id) ?? 0,
      };
    }),
    events: ((events.data ?? []) as any[]).map((row) => {
      const summary = summaryRows.get(row.id);
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        city: row.city,
        venueName: row.venue_name,
        startAt: row.start_at,
        endAt: row.end_at,
        organizerName: asObject<any>(row.organizer)?.name ?? "Organizer",
        organizerId: row.organizer_id,
        coverImageUrl: row.cover_image_url ?? null,
        submittedAt: row.submitted_at ?? null,
        publishedAt: row.published_at ?? null,
        rejectionReason: row.rejection_reason ?? null,
        isFeatured: Boolean(row.is_featured),
        ticketsSold: Number(summary?.tickets_sold ?? 0),
        grossRevenue: Number(summary?.gross_revenue ?? 0),
        createdAt: row.created_at,
      };
    }),
    bookings: ((bookings.data ?? []) as any[]).map((row) => {
      const event = asObject<any>(row.event) ?? {};
      return {
        id: row.id,
        reference: row.reference,
        status: row.status,
        totalXaf: Number(row.total_xaf ?? 0),
        serviceFeeXaf: Number(row.service_fee_xaf ?? 0),
        contactName: row.contact_name ?? "",
        contactEmail: row.contact_email ?? "",
        createdAt: row.created_at,
        eventTitle: event.title ?? "",
        eventSlug: event.slug ?? "",
        ticketCount: Array.isArray(row.tickets) ? row.tickets.length : 0,
      };
    }),
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [
    users,
    organizers,
    pendingOrganizers,
    events,
    publishedEvents,
    pendingEvents,
    bookings,
    confirmedBookings,
    tickets,
    refunds,
    payouts,
    messages,
    subscribers,
    revenue,
    pendingOrganizersList,
    pendingEventsList,
    recentAudit,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("organizers").select("id", { count: "exact", head: true }),
    supabase
      .from("organizers")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["valid", "used"]),
    supabase
      .from("refunds")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase
      .from("organizer_payouts")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "approved", "processing"]),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("platform_daily_revenue")
      .select("day, organizer_revenue_xaf, platform_revenue_xaf, orders")
      .gte("day", since.toISOString())
      .order("day", { ascending: true }),
    listAdminOrganizers("pending"),
    listAdminEvents("pending_approval"),
    listAdminAudit(8),
  ]);

  const revenueRows = ((revenue.data ?? []) as any[]).map((row) => ({
    day: row.day,
    organizerRevenueXaf: Number(row.organizer_revenue_xaf ?? 0),
    platformRevenueXaf: Number(row.platform_revenue_xaf ?? 0),
    orders: Number(row.orders ?? 0),
  }));

  return {
    totals: {
      users: users.count ?? 0,
      organizers: organizers.count ?? 0,
      pendingOrganizers: pendingOrganizers.count ?? 0,
      events: events.count ?? 0,
      publishedEvents: publishedEvents.count ?? 0,
      pendingEvents: pendingEvents.count ?? 0,
      bookings: bookings.count ?? 0,
      confirmedBookings: confirmedBookings.count ?? 0,
      ticketsSold: tickets.count ?? 0,
      grossRevenue: revenueRows.reduce(
        (sum, row) => sum + row.organizerRevenueXaf,
        0,
      ),
      platformRevenue: revenueRows.reduce(
        (sum, row) => sum + row.platformRevenueXaf,
        0,
      ),
      openRefunds: refunds.count ?? 0,
      openPayouts: payouts.count ?? 0,
      messages: messages.count ?? 0,
      subscribers: subscribers.count ?? 0,
    },
    revenue: revenueRows,
    pendingOrganizersList,
    pendingEventsList,
    recentAudit,
  };
}
