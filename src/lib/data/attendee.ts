import "server-only";

import type {
  BookingSummary,
  PaymentSummary,
  RefundSummary,
  TicketSummary,
} from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

function asObject<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const BOOKING_SELECT = `
  id, reference, status, subtotal_xaf, service_fee_xaf, total_xaf,
  created_at, reservation_expires_at, confirmed_at, cancelled_at, refunded_at,
  contact_name, contact_email, contact_phone,
  event:events(id, slug, title, cover_image_url, start_at, end_at, venue_name, city),
  booking_items(id, ticket_type_id, quantity, unit_price_xaf, line_total_xaf,
    ticket_type:ticket_types(name)),
  tickets(id)
`;

function mapBooking(row: any): BookingSummary {
  const event = asObject<any>(row.event) ?? {};
  const items = (row.booking_items ?? []) as any[];
  const tickets = Array.isArray(row.tickets)
    ? row.tickets[0]?.count !== undefined
      ? Number(row.tickets[0]?.count ?? 0)
      : row.tickets.length
    : Number(row.tickets?.count ?? 0);

  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    totalXaf: Number(row.total_xaf ?? 0),
    serviceFeeXaf: Number(row.service_fee_xaf ?? 0),
    subtotalXaf: Number(row.subtotal_xaf ?? 0),
    createdAt: row.created_at,
    reservationExpiresAt: row.reservation_expires_at ?? null,
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      coverImageUrl: event.cover_image_url ?? null,
      startAt: event.start_at,
      endAt: event.end_at,
      venueName: event.venue_name,
      city: event.city,
    },
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    ticketCount: tickets,
  };
}

export interface AttendeeBookingDetail {
  booking: BookingSummary & {
    confirmedAt: string | null;
    cancelledAt: string | null;
    refundedAt: string | null;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceXaf: number;
    lineTotalXaf: number;
  }>;
  payments: Array<{
    id: string;
    provider: PaymentSummary["provider"];
    status: PaymentSummary["status"];
    amountXaf: number;
    isDemo: boolean;
    providerReference: string | null;
    failureReason: string | null;
    createdAt: string;
  }>;
  refunds: RefundSummary[];
  tickets: Array<{
    id: string;
    reference: string;
    status: TicketSummary["status"];
    attendeeName: string;
    ticketTypeName: string;
    checkedInAt: string | null;
  }>;
}

export async function listAttendeeBookings(
  userId: string,
  limit?: number,
): Promise<BookingSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("attendee_id", userId)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("[tickora] attendee bookings:", error.message);
    return [];
  }
  return (data ?? []).map(mapBooking);
}

export async function getAttendeeBooking(
  bookingId: string,
  userId: string,
): Promise<AttendeeBookingDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `${BOOKING_SELECT},
       payments(id, provider, status, amount_xaf, is_demo, provider_reference,
         failure_reason, created_at),
       refunds(id, amount_xaf, status, reason, created_at),
       tickets(id, ticket_reference, status, attendee_name, checked_in_at,
         ticket_type:ticket_types(name))`,
    )
    .eq("id", bookingId)
    .eq("attendee_id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[tickora] attendee booking:", error.message);
    return null;
  }

  const row = data as any;
  const summary = mapBooking(row);
  const items = ((row.booking_items ?? []) as any[]).map((item) => ({
    id: item.id ?? item.ticket_type_id,
    name: asObject<any>(item.ticket_type)?.name ?? "Ticket",
    quantity: Number(item.quantity ?? 0),
    unitPriceXaf: Number(item.unit_price_xaf ?? 0),
    lineTotalXaf: Number(item.line_total_xaf ?? 0),
  }));

  return {
    booking: {
      ...summary,
      confirmedAt: row.confirmed_at ?? null,
      cancelledAt: row.cancelled_at ?? null,
      refundedAt: row.refunded_at ?? null,
      contactName: row.contact_name ?? "",
      contactEmail: row.contact_email ?? "",
      contactPhone: row.contact_phone ?? null,
    },
    items,
    payments: ((row.payments ?? []) as any[])
      .map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        status: payment.status,
        amountXaf: Number(payment.amount_xaf ?? 0),
        isDemo: Boolean(payment.is_demo),
        providerReference: payment.provider_reference ?? null,
        failureReason: payment.failure_reason ?? null,
        createdAt: payment.created_at,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    refunds: ((row.refunds ?? []) as any[]).map((refund) => ({
      id: refund.id,
      amountXaf: Number(refund.amount_xaf ?? 0),
      status: refund.status,
      reason: refund.reason,
      createdAt: refund.created_at,
      bookingReference: summary.reference,
      requesterName: null,
      paymentProvider: null,
    })),
    tickets: ((row.tickets ?? []) as any[]).map((ticket) => ({
      id: ticket.id,
      reference: ticket.ticket_reference,
      status: ticket.status,
      attendeeName: ticket.attendee_name,
      ticketTypeName: asObject<any>(ticket.ticket_type)?.name ?? "Ticket",
      checkedInAt: ticket.checked_in_at ?? null,
    })),
  };
}

export async function listAttendeeTickets(
  userId: string,
  limit?: number,
): Promise<TicketSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tickets")
    .select(
      `id, ticket_reference, status, attendee_name, checked_in_at,
       event:events(id, slug, title, start_at, end_at, venue_name, city, cover_image_url),
       ticket_type:ticket_types(name),
       booking:bookings(reference)`,
    )
    .eq("attendee_id", userId)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("[tickora] attendee tickets:", error.message);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => {
    const event = asObject<any>(row.event) ?? {};
    const type = asObject<any>(row.ticket_type);
    const booking = asObject<any>(row.booking);
    return {
      id: row.id,
      reference: row.ticket_reference,
      status: row.status,
      attendeeName: row.attendee_name,
      ticketTypeName: type?.name ?? "Ticket",
      checkedInAt: row.checked_in_at ?? null,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventStartAt: event.start_at,
      eventEndAt: event.end_at,
      venueName: event.venue_name,
      city: event.city,
      coverImageUrl: event.cover_image_url ?? null,
      bookingReference: booking?.reference ?? "",
    } satisfies TicketSummary;
  });
}

export interface AttendeeTicketDetail extends TicketSummary {
  qrSvg: string;
}

export async function getAttendeeTicket(
  ticketId: string,
  userId: string,
): Promise<AttendeeTicketDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `id, ticket_reference, status, attendee_name, checked_in_at,
       event:events(id, slug, title, start_at, end_at, venue_name, city, cover_image_url),
       ticket_type:ticket_types(name),
       booking:bookings(reference)`,
    )
    .eq("id", ticketId)
    .eq("attendee_id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[tickora] attendee ticket:", error.message);
    return null;
  }

  const row = data as any;
  const event = asObject<any>(row.event) ?? {};
  const type = asObject<any>(row.ticket_type);
  const booking = asObject<any>(row.booking);

  // The raw token is fetched through a security-definer RPC that verifies
  // ownership. It is never selected from the table by the browser.
  const { data: token, error: tokenError } = await supabase.rpc(
    "get_my_ticket_qr",
    { p_ticket_id: ticketId },
  );
  if (tokenError || !token) {
    console.error("[tickora] get_my_ticket_qr:", tokenError?.message);
    return null;
  }

  const QRCode = (await import("qrcode")).default;
  const qrSvg = await QRCode.toString(String(token), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#071426", light: "#FFFFFF" },
  });

  return {
    id: row.id,
    reference: row.ticket_reference,
    status: row.status,
    attendeeName: row.attendee_name,
    ticketTypeName: type?.name ?? "Ticket",
    checkedInAt: row.checked_in_at ?? null,
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: event.title,
    eventStartAt: event.start_at,
    eventEndAt: event.end_at,
    venueName: event.venue_name,
    city: event.city,
    coverImageUrl: event.cover_image_url ?? null,
    bookingReference: booking?.reference ?? "",
    qrSvg,
  };
}

export async function listAttendeePayments(
  userId: string,
): Promise<PaymentSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      `id, booking_id, provider, status, amount_xaf, is_demo, provider_reference, created_at,
       booking:bookings(reference, status, attendee_id, event:events(title))`,
    )
    .eq("booking.attendee_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[tickora] attendee payments:", error.message);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => {
    const booking = asObject<any>(row.booking) ?? {};
    const event = asObject<any>(booking.event);
    return {
      id: row.id,
      bookingId: row.booking_id,
      bookingReference: booking.reference ?? "",
      eventTitle: event?.title ?? "",
      provider: row.provider,
      status: row.status,
      amountXaf: Number(row.amount_xaf ?? 0),
      isDemo: Boolean(row.is_demo),
      providerReference: row.provider_reference ?? null,
      createdAt: row.created_at,
      bookingStatus: booking.status,
    } satisfies PaymentSummary;
  });
}

export async function listAttendeeRefunds(
  userId: string,
): Promise<RefundSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("refunds")
    .select(
      `id, amount_xaf, status, reason, created_at,
       booking:bookings(reference)`,
    )
    .eq("requested_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[tickora] attendee refunds:", error.message);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => {
    const booking = asObject<any>(row.booking);
    return {
      id: row.id,
      amountXaf: Number(row.amount_xaf ?? 0),
      status: row.status,
      reason: row.reason,
      createdAt: row.created_at,
      bookingReference: booking?.reference ?? null,
      requesterName: null,
      paymentProvider: null,
    } satisfies RefundSummary;
  });
}

export interface AttendeeOverview {
  upcomingTickets: TicketSummary[];
  recentBookings: BookingSummary[];
  pendingBookings: BookingSummary[];
  totals: {
    tickets: number;
    upcomingEvents: number;
    confirmedBookings: number;
    spentXaf: number;
    unreadNotifications: number;
  };
}

export async function getAttendeeOverview(
  userId: string,
): Promise<AttendeeOverview> {
  const supabase = await createClient();
  const [tickets, bookings, notificationCount] = await Promise.all([
    listAttendeeTickets(userId),
    listAttendeeBookings(userId),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  const now = Date.now();
  const upcomingTickets = tickets
    .filter(
      (ticket) =>
        ticket.status === "valid" && new Date(ticket.eventEndAt).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.eventStartAt).getTime() - new Date(b.eventStartAt).getTime(),
    );

  return {
    upcomingTickets,
    recentBookings: bookings.slice(0, 5),
    pendingBookings: bookings.filter((booking) => booking.status === "pending_payment"),
    totals: {
      tickets: tickets.length,
      upcomingEvents: new Set(upcomingTickets.map((ticket) => ticket.eventId)).size,
      confirmedBookings: bookings.filter((booking) => booking.status === "confirmed")
        .length,
      spentXaf: bookings
        .filter((booking) => booking.status === "confirmed")
        .reduce((sum, booking) => sum + booking.totalXaf, 0),
      unreadNotifications: notificationCount.count ?? 0,
    },
  };
}
