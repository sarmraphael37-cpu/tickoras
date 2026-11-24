import "server-only";

import type {
  EventRow,
  OrganizerRow,
  PayoutRow,
  TicketTypeRow,
} from "@/types/database";
import type { PayoutSummary } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

function asObject<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export interface OrganizerEventRecord {
  id: string;
  title: string;
  slug: string;
  status: EventRow["status"];
  categoryName: string | null;
  city: string;
  venueName: string;
  startAt: string;
  endAt: string;
  coverImageUrl: string | null;
  viewsCount: number;
  rejectionReason: string | null;
  ticketsSold: number;
  capacity: number;
  orders: number;
  grossRevenue: number;
  checkedIn: number;
}

export interface OrganizerEventDetail extends OrganizerEventRecord {
  event: EventRow;
  ticketTypes: TicketTypeRow[];
}

export interface OrganizerBookingRow {
  id: string;
  reference: string;
  status: string;
  totalXaf: number;
  subtotalXaf: number;
  serviceFeeXaf: number;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  ticketCount: number;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStartAt: string;
}

export interface OrganizerAttendeeRow {
  ticketId: string;
  ticketReference: string;
  attendeeName: string;
  status: string;
  checkedInAt: string | null;
  ticketTypeName: string;
  eventTitle: string;
  eventId: string;
  bookingReference: string;
  bookingStatus: string;
}

export interface OrganizerTicketRow {
  id: string;
  name: string;
  description: string | null;
  priceXaf: number;
  quantityTotal: number;
  quantitySold: number;
  quantityReserved: number;
  isActive: boolean;
  salesStartAt: string | null;
  salesEndAt: string | null;
  eventId: string;
  eventTitle: string;
}

export async function listOrganizerTicketTypes(
  organizerId: string,
): Promise<OrganizerTicketRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ticket_types")
    .select(
      `id, name, description, price_xaf, quantity_total, quantity_sold,
       quantity_reserved, is_active, sales_start_at, sales_end_at,
       event:events!inner(id, title, organizer_id)`,
    )
    .eq("event.organizer_id", organizerId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[tickora] organizer ticket types:", error.message);
    return [];
  }
  return ((data ?? []) as any[]).map((row) => {
    const event = asObject<any>(row.event);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      priceXaf: Number(row.price_xaf ?? 0),
      quantityTotal: Number(row.quantity_total ?? 0),
      quantitySold: Number(row.quantity_sold ?? 0),
      quantityReserved: Number(row.quantity_reserved ?? 0),
      isActive: Boolean(row.is_active),
      salesStartAt: row.sales_start_at ?? null,
      salesEndAt: row.sales_end_at ?? null,
      eventId: event?.id ?? "",
      eventTitle: event?.title ?? "",
    };
  });
}

export interface OrganizerCheckInRow {
  id: string;
  ticketReference: string;
  attendeeName: string;
  ticketTypeName: string;
  eventTitle: string;
  method: "qr" | "manual";
  scannedAt: string;
}

export interface OrganizerStaffRow {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  name: string;
  email: string;
  role: "scanner" | "manager";
  createdAt: string;
}

export interface OrganizerAnalytics {
  daily: Array<{ day: string; revenueXaf: number; orders: number }>;
  events: Array<{
    eventId: string;
    title: string;
    ticketsSold: number;
    orders: number;
    grossRevenue: number;
    checkedIn: number;
  }>;
}

export async function listOrganizerEvents(
  organizerId: string,
): Promise<OrganizerEventRecord[]> {
  const supabase = await createClient();
  const [eventsResult, summaryResult] = await Promise.all([
    supabase
      .from("events")
      .select(
        `id, title, slug, status, city, venue_name, start_at, end_at,
         cover_image_url, views_count, rejection_reason,
         category:categories(name),
         ticket_types(quantity_total, quantity_sold, is_active)`,
      )
      .eq("organizer_id", organizerId)
      .order("start_at", { ascending: false }),
    supabase
      .from("event_sales_summary")
      .select("event_id, tickets_sold, orders, gross_revenue, checked_in")
      .eq("organizer_id", organizerId),
  ]);

  if (eventsResult.error) {
    console.error("[tickora] organizer events:", eventsResult.error.message);
    return [];
  }

  const summaries = new Map<string, any>(
    ((summaryResult.data ?? []) as any[]).map((row) => [row.event_id, row]),
  );

  return ((eventsResult.data ?? []) as any[]).map((row) => {
    const summary = summaries.get(row.id);
    const tickets = (row.ticket_types ?? []) as any[];
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      categoryName: asObject<any>(row.category)?.name ?? null,
      city: row.city,
      venueName: row.venue_name,
      startAt: row.start_at,
      endAt: row.end_at,
      coverImageUrl: row.cover_image_url ?? null,
      viewsCount: Number(row.views_count ?? 0),
      rejectionReason: row.rejection_reason ?? null,
      ticketsSold: Number(summary?.tickets_sold ?? 0),
      capacity: tickets.reduce(
        (sum, ticket) => sum + Number(ticket.quantity_total ?? 0),
        0,
      ),
      orders: Number(summary?.orders ?? 0),
      grossRevenue: Number(summary?.gross_revenue ?? 0),
      checkedIn: Number(summary?.checked_in ?? 0),
    };
  });
}

export async function getOrganizerEvent(
  organizerId: string,
  eventId: string,
): Promise<OrganizerEventDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      `*, category:categories(name),
       ticket_types(*),
       sales:event_sales_summary(event_id, tickets_sold, orders, gross_revenue, checked_in)`,
    )
    .eq("id", eventId)
    .eq("organizer_id", organizerId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[tikora] organizer event:", error.message);
    return null;
  }

  const row = data as any;
  const summary = asObject<any>(row.sales);
  const ticketTypes = ((row.ticket_types ?? []) as TicketTypeRow[]).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    categoryName: asObject<any>(row.category)?.name ?? null,
    city: row.city,
    venueName: row.venue_name,
    startAt: row.start_at,
    endAt: row.end_at,
    coverImageUrl: row.cover_image_url ?? null,
    viewsCount: Number(row.views_count ?? 0),
    rejectionReason: row.rejection_reason ?? null,
    ticketsSold: Number(summary?.tickets_sold ?? 0),
    capacity: ticketTypes.reduce(
      (sum, ticket) => sum + Number(ticket.quantity_total ?? 0),
      0,
    ),
    orders: Number(summary?.orders ?? 0),
    grossRevenue: Number(summary?.gross_revenue ?? 0),
    checkedIn: Number(summary?.checked_in ?? 0),
    event: row as EventRow,
    ticketTypes,
  };
}

export async function listOrganizerBookings(
  organizerId: string,
  limit = 100,
): Promise<OrganizerBookingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, reference, status, total_xaf, subtotal_xaf, service_fee_xaf,
       contact_name, contact_email, created_at, tickets(id),
       event:events!inner(id, title, slug, start_at, organizer_id)`,
    )
    .eq("event.organizer_id", organizerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[tickora] organizer bookings:", error.message);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => {
    const event = asObject<any>(row.event) ?? {};
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      totalXaf: Number(row.total_xaf ?? 0),
      subtotalXaf: Number(row.subtotal_xaf ?? 0),
      serviceFeeXaf: Number(row.service_fee_xaf ?? 0),
      contactName: row.contact_name ?? "",
      contactEmail: row.contact_email ?? "",
      createdAt: row.created_at,
      ticketCount: Array.isArray(row.tickets) ? row.tickets.length : 0,
      eventId: event.id,
      eventTitle: event.title,
      eventSlug: event.slug,
      eventStartAt: event.start_at,
    };
  });
}

export async function listOrganizerAttendees(
  organizerId: string,
  limit = 200,
): Promise<OrganizerAttendeeRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `id, ticket_reference, attendee_name, status, checked_in_at,
       ticket_type:ticket_types(name),
       booking:bookings(reference, status),
       event:events!inner(id, title, organizer_id)`,
    )
    .eq("event.organizer_id", organizerId)
    .order("issued_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[tickora] organizer attendees:", error.message);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => {
    const event = asObject<any>(row.event) ?? {};
    const type = asObject<any>(row.ticket_type);
    const booking = asObject<any>(row.booking);
    return {
      ticketId: row.id,
      ticketReference: row.ticket_reference,
      attendeeName: row.attendee_name,
      status: row.status,
      checkedInAt: row.checked_in_at ?? null,
      ticketTypeName: type?.name ?? "Ticket",
      eventTitle: event.title,
      eventId: event.id,
      bookingReference: booking?.reference ?? "",
      bookingStatus: booking?.status ?? "",
    };
  });
}

export async function listOrganizerCheckIns(
  organizerId: string,
  limit = 100,
): Promise<OrganizerCheckInRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select(
      `id, method, scanned_at,
       ticket:tickets(ticket_reference, attendee_name, ticket_type:ticket_types(name)),
       event:events!inner(title, organizer_id)`,
    )
    .eq("event.organizer_id", organizerId)
    .order("scanned_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[tickora] organizer check-ins:", error.message);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => {
    const ticket = asObject<any>(row.ticket) ?? {};
    const event = asObject<any>(row.event) ?? {};
    return {
      id: row.id,
      ticketReference: ticket.ticket_reference ?? "",
      attendeeName: ticket.attendee_name ?? "",
      ticketTypeName: asObject<any>(ticket.ticket_type)?.name ?? "Ticket",
      eventTitle: event.title ?? "",
      method: row.method,
      scannedAt: row.scanned_at,
    };
  });
}

export async function getOrganizerAnalytics(
  organizerId: string,
): Promise<OrganizerAnalytics> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [dailyResult, eventsResult, summaryResult] = await Promise.all([
    supabase
      .from("organizer_daily_sales")
      .select("day, revenue_xaf, orders")
      .eq("organizer_id", organizerId)
      .gte("day", since.toISOString())
      .order("day", { ascending: true }),
    supabase
      .from("events")
      .select("id, title")
      .eq("organizer_id", organizerId),
    supabase
      .from("event_sales_summary")
      .select("event_id, tickets_sold, orders, gross_revenue, checked_in")
      .eq("organizer_id", organizerId),
  ]);

  const events = ((eventsResult.data ?? []) as any[]) ?? [];
  const summaries = new Map<string, any>(
    ((summaryResult.data ?? []) as any[]).map((row) => [row.event_id, row]),
  );

  return {
    daily: ((dailyResult.data ?? []) as any[]).map((row) => ({
      day: row.day,
      revenueXaf: Number(row.revenue_xaf ?? 0),
      orders: Number(row.orders ?? 0),
    })),
    events: events
      .map((event) => {
        const summary = summaries.get(event.id);
        return {
          eventId: event.id,
          title: event.title,
          ticketsSold: Number(summary?.tickets_sold ?? 0),
          orders: Number(summary?.orders ?? 0),
          grossRevenue: Number(summary?.gross_revenue ?? 0),
          checkedIn: Number(summary?.checked_in ?? 0),
        };
      })
      .sort((a, b) => b.grossRevenue - a.grossRevenue),
  };
}

export interface EventAnalytics {
  daily: Array<{ day: string; revenueXaf: number; orders: number }>;
  grossRevenue: number;
  orders: number;
  ticketsSold: number;
  checkedIn: number;
  remaining: number;
}

/** Per-event analytics built from the organizer's own confirmed bookings. */
export async function getEventAnalytics(
  eventId: string,
): Promise<EventAnalytics> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("created_at, subtotal_xaf, status")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[tickora] event analytics:", error.message);
  }
  const rows = (data ?? []) as any[];
  const byDay = new Map<string, { revenueXaf: number; orders: number }>();
  for (const row of rows) {
    const day = String(row.created_at).slice(0, 10);
    const current = byDay.get(day) ?? { revenueXaf: 0, orders: 0 };
    current.revenueXaf += Number(row.subtotal_xaf ?? 0);
    current.orders += 1;
    byDay.set(day, current);
  }

  const [{ data: summary }, { data: tiers }] = await Promise.all([
    supabase
      .from("event_sales_summary")
      .select("tickets_sold, orders, gross_revenue, checked_in")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("ticket_types")
      .select("quantity_total, quantity_sold, quantity_reserved")
      .eq("event_id", eventId),
  ]);
  const totalInventory = Number(
    ((tiers ?? []) as any[]).reduce(
      (sum, tier) => sum + Number(tier.quantity_total ?? 0),
      0,
    ),
  );
  const sold = Number((summary as any)?.tickets_sold ?? 0);

  return {
    daily: [...byDay.entries()].map(([day, value]) => ({ day, ...value })),
    grossRevenue: Number((summary as any)?.gross_revenue ?? 0),
    orders: Number((summary as any)?.orders ?? 0),
    ticketsSold: sold,
    checkedIn: Number((summary as any)?.checked_in ?? 0),
    remaining: Math.max(0, totalInventory - sold),
  };
}

export async function listOrganizerPayouts(
  organizerId: string,
): Promise<PayoutSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizer_payouts")
    .select(
      "id, organizer_id, amount_xaf, status, method, destination, reference, processed_at, created_at",
    )
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[tickora] organizer payouts:", error.message);
    return [];
  }

  return ((data ?? []) as PayoutRow[]).map((row) => ({
    id: row.id,
    organizerId: row.organizer_id,
    organizerName: "",
    amountXaf: Number(row.amount_xaf ?? 0),
    status: row.status,
    method: row.method,
    destination: row.destination,
    reference: row.reference ?? null,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? null,
  }));
}

export async function getOrganizerProfile(
  organizerId: string,
): Promise<OrganizerRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .eq("id", organizerId)
    .maybeSingle();
  if (error) {
    console.error("[tickora] organizer profile:", error.message);
    return null;
  }
  return (data as OrganizerRow | null) ?? null;
}

export async function getOrganizerBalance(organizerId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("organizer_available_balance", {
    p_organizer_id: organizerId,
  });
  if (error) {
    console.error("[tickora] organizer balance:", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

export interface OrganizerFinancials {
  grossSales: number;
  platformFees: number;
  refunds: number;
  netPayable: number;
  confirmedBookings: number;
  pendingBookings: number;
}

/** Aggregates real booking/refund records for the organizer's own events. */
export async function getOrganizerFinancials(
  organizerId: string,
): Promise<OrganizerFinancials> {
  const empty: OrganizerFinancials = {
    grossSales: 0,
    platformFees: 0,
    refunds: 0,
    netPayable: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
  };
  const supabase = await createClient();
  const { data: eventRows } = await supabase
    .from("events")
    .select("id")
    .eq("organizer_id", organizerId);
  const eventIds = ((eventRows ?? []) as any[]).map((row) => row.id as string);
  if (eventIds.length === 0) return empty;

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id, status, subtotal_xaf, service_fee_xaf")
    .in("event_id", eventIds);
  const bookings = (bookingRows ?? []) as any[];
  const bookingIds = bookings.map((row) => row.id as string);

  let refundRows: any[] = [];
  if (bookingIds.length > 0) {
    const { data } = await supabase
      .from("refunds")
      .select("amount_xaf, status")
      .in("booking_id", bookingIds);
    refundRows = (data ?? []) as any[];
  }

  const confirmed = bookings.filter((row) => row.status === "confirmed");
  const grossSales = confirmed.reduce(
    (sum, row) => sum + Number(row.subtotal_xaf ?? 0),
    0,
  );
  const platformFees = confirmed.reduce(
    (sum, row) => sum + Number(row.service_fee_xaf ?? 0),
    0,
  );
  const refunds = refundRows
    .filter((row) => ["approved", "processed"].includes(row.status))
    .reduce((sum, row) => sum + Number(row.amount_xaf ?? 0), 0);

  return {
    grossSales,
    platformFees,
    refunds,
    netPayable: Math.max(0, grossSales - refunds),
    confirmedBookings: confirmed.length,
    pendingBookings: bookings.filter((row) => row.status === "pending_payment")
      .length,
  };
}

export async function listOrganizerStaff(
  organizerId: string,
): Promise<OrganizerStaffRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_staff")
    .select(
      `id, event_id, user_id, role, created_at,
       event:events!inner(title, organizer_id)`,
    )
    .eq("event.organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[tickora] organizer staff:", error.message);
    return [];
  }

  const rows = (data ?? []) as any[];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  let profiles: Array<{ id: string; full_name: string; email: string }> = [];
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    profiles = (profileRows ?? []) as any[];
  }
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const profile = byId.get(row.user_id);
    const event = asObject<any>(row.event);
    return {
      id: row.id,
      eventId: row.event_id,
      eventTitle: event?.title ?? "",
      userId: row.user_id,
      name: profile?.full_name ?? "Team member",
      email: profile?.email ?? "",
      role: row.role,
      createdAt: row.created_at,
    };
  });
}

export async function getOrganizerOverview(organizerId: string) {
  const [events, bookings, payouts, balance] = await Promise.all([
    listOrganizerEvents(organizerId),
    listOrganizerBookings(organizerId, 8),
    listOrganizerPayouts(organizerId),
    getOrganizerBalance(organizerId),
  ]);

  const now = Date.now();
  const totalRevenue = events.reduce((sum, event) => sum + event.grossRevenue, 0);
  const ticketsSold = events.reduce((sum, event) => sum + event.ticketsSold, 0);
  const checkedIn = events.reduce((sum, event) => sum + event.checkedIn, 0);

  return {
    events,
    bookings,
    payouts,
    balance,
    totals: {
      events: events.length,
      published: events.filter((event) => event.status === "published").length,
      drafts: events.filter((event) =>
        ["draft", "rejected"].includes(event.status),
      ).length,
      awaitingApproval: events.filter(
        (event) => event.status === "pending_approval",
      ).length,
      upcoming: events.filter(
        (event) =>
          event.status === "published" &&
          new Date(event.endAt).getTime() >= now,
      ).length,
      totalRevenue,
      ticketsSold,
      checkedIn,
      checkedInRate:
        ticketsSold > 0 ? Math.round((checkedIn / ticketsSold) * 100) : 0,
    },
  };
}
