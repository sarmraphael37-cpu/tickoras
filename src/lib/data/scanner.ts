import "server-only";

import type { Viewer } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export interface ScannerEvent {
  id: string;
  title: string;
  slug: string;
  status: string;
  city: string;
  venueName: string;
  startsAt: string;
  coverImageUrl: string | null;
  source: "assigned" | "owned" | "admin";
}

export interface RecentCheckIn {
  id: string;
  ticketReference: string;
  attendeeName: string;
  ticketTypeName: string;
  eventId: string;
  eventTitle: string;
  method: "qr" | "manual";
  scannedAt: string;
  scannedByName: string;
}

/**
 * Events the current user is allowed to scan. RLS enforces the same rules on
 * tickets and check-ins; this list only narrows the selector shown to staff.
 */
export async function listScannerEvents(viewer: Viewer): Promise<ScannerEvent[]> {
  const supabase = await createClient();
  const byId = new Map<string, ScannerEvent>();

  if (viewer.roles.includes("admin")) {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, slug, status, city, venue_name, start_at, cover_image_url")
      .in("status", ["published", "completed"])
      .order("start_at", { ascending: false })
      .limit(200);
    if (error) console.error("[tickora] scanner admin events:", error.message);
    for (const row of ((data ?? []) as any[])) {
      byId.set(row.id, {
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        city: row.city,
        venueName: row.venue_name,
        startsAt: row.start_at,
        coverImageUrl: row.cover_image_url ?? null,
        source: "admin",
      });
    }
  }

  if (viewer.roles.includes("organizer") && viewer.organizerId) {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, slug, status, city, venue_name, start_at, cover_image_url")
      .eq("organizer_id", viewer.organizerId)
      .order("start_at", { ascending: false })
      .limit(200);
    if (error) console.error("[tickora] scanner owned events:", error.message);
    for (const row of ((data ?? []) as any[])) {
      byId.set(row.id, {
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        city: row.city,
        venueName: row.venue_name,
        startsAt: row.start_at,
        coverImageUrl: row.cover_image_url ?? null,
        source: "owned",
      });
    }
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("event_staff")
    .select(
      `event_id, role,
       event:events(id, title, slug, status, city, venue_name, start_at, cover_image_url)`,
    )
    .eq("user_id", viewer.id);
  if (assignmentError) {
    console.error("[tickora] scanner assignments:", assignmentError.message);
  }
  for (const row of ((assignments ?? []) as any[])) {
    const event = row.event as any;
    if (!event?.id) continue;
    byId.set(event.id, {
      id: event.id,
      title: event.title,
      slug: event.slug,
      status: event.status,
      city: event.city,
      venueName: event.venue_name,
      startsAt: event.start_at,
      coverImageUrl: event.cover_image_url ?? null,
      source: "assigned",
    });
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );
}

export interface ScannerEventStats {
  expected: number;
  checkedIn: number;
  remaining: number;
}

export interface ScannerEventCard extends ScannerEvent, ScannerEventStats {}

interface EventSummaryRow {
  event_id: string;
  tickets_sold: number | string | null;
  checked_in: number | string | null;
}

function toStats(rows: EventSummaryRow[], eventId: string): ScannerEventStats {
  const row = rows.find((item) => item.event_id === eventId);
  const expected = Number(row?.tickets_sold ?? 0);
  const checkedIn = Number(row?.checked_in ?? 0);
  return { expected, checkedIn, remaining: Math.max(0, expected - checkedIn) };
}

async function loadEventSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventIds: string[],
): Promise<EventSummaryRow[]> {
  if (eventIds.length === 0) return [];
  const { data, error } = await supabase
    .from("event_sales_summary")
    .select("event_id, tickets_sold, checked_in")
    .in("event_id", eventIds);
  if (error) {
    console.error("[tickora] scanner summaries:", error.message);
    return [];
  }
  return (data ?? []) as EventSummaryRow[];
}

/** Assigned events enriched with door statistics. */
export async function listScannerEventCards(
  viewer: Viewer,
): Promise<ScannerEventCard[]> {
  const events = await listScannerEvents(viewer);
  if (events.length === 0) return [];
  const supabase = await createClient();
  const summaries = await loadEventSummaries(
    supabase,
    events.map((event) => event.id),
  );
  return events.map((event) => ({ ...event, ...toStats(summaries, event.id) }));
}

export interface ScannerEventDetail {
  event: {
    id: string;
    title: string;
    slug: string;
    status: string;
    city: string;
    venueName: string;
    startsAt: string;
    description: string | null;
    coverImageUrl: string | null;
  };
  stats: ScannerEventStats;
  recent: RecentCheckIn[];
}

/** Single assigned event with live door stats, or null when not accessible. */
export async function getScannerEventDetail(
  viewer: Viewer,
  eventId: string,
): Promise<ScannerEventDetail | null> {
  const events = await listScannerEvents(viewer);
  const match = events.find((event) => event.id === eventId);
  if (!match) return null;

  const supabase = await createClient();
  const [{ data: event }, summaries, recent] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, slug, status, city, venue_name, start_at, description, cover_image_url")
      .eq("id", eventId)
      .maybeSingle(),
    loadEventSummaries(supabase, [eventId]),
    listRecentCheckIns([eventId], 15),
  ]);
  if (!event) return null;

  const row = event as any;
  return {
    event: {
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      city: row.city,
      venueName: row.venue_name,
      startsAt: row.start_at,
      description: row.description ?? null,
      coverImageUrl: row.cover_image_url ?? null,
    },
    stats: toStats(summaries, eventId),
    recent,
  };
}

export type ScanOutcome = "success" | "invalid" | "duplicate";

export interface ScanAttemptRow {
  id: string;
  eventId: string | null;
  eventTitle: string;
  ticketReference: string | null;
  method: "qr" | "manual";
  outcome: ScanOutcome;
  code: string | null;
  scannedAt: string;
  scannerName: string;
}

/** Scan history for every event the viewer is authorized to scan (RLS enforced). */
export async function listScanHistory(
  viewer: Viewer,
  options: { eventId?: string; outcome?: ScanOutcome; limit?: number } = {},
): Promise<ScanAttemptRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("scan_attempts")
    .select(
      `id, event_id, ticket_reference, method, outcome, code, created_at, actor_id,
       event:events(title)`,
    )
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 200);
  if (options.eventId) query = query.eq("event_id", options.eventId);
  if (options.outcome) query = query.eq("outcome", options.outcome);

  const { data, error } = await query;
  if (error) {
    console.error("[tickora] scan history:", error.message);
    return [];
  }
  const rows = (data ?? []) as any[];

  // Best-effort scanner names — profile RLS may hide other users' rows.
  const actorIds = [...new Set(rows.map((row) => row.actor_id))];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as any[] };
  const names = new Map(
    ((profiles ?? []) as any[]).map((profile) => [profile.id, profile.full_name]),
  );

  return rows.map((row) => ({
    id: row.id,
    eventId: row.event_id ?? null,
    eventTitle: (row.event as any)?.title ?? "Unknown event",
    ticketReference: row.ticket_reference ?? null,
    method: row.method,
    outcome: row.outcome as ScanOutcome,
    code: row.code ?? null,
    scannedAt: row.created_at,
    scannerName:
      row.actor_id === viewer.id
        ? viewer.fullName
        : names.get(row.actor_id) ?? "Scanner",
  }));
}

export async function listRecentCheckIns(
  eventIds: string[],
  limit = 20,
): Promise<RecentCheckIn[]> {
  if (eventIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select(
      `id, ticket_id, event_id, scanned_by, method, scanned_at,
       event:events(title),
       ticket:tickets(ticket_reference, attendee_name, ticket_type:ticket_types(name))`,
    )
    .in("event_id", eventIds)
    .order("scanned_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[tickora] scanner check-ins:", error.message);
    return [];
  }

  const rows = (data ?? []) as any[];
  const scannerIds = [...new Set(rows.map((row) => row.scanned_by))];
  const { data: scanners } = scannerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", scannerIds)
    : { data: [] as any[] };
  const scannerNames = new Map(
    ((scanners ?? []) as any[]).map((profile) => [profile.id, profile.full_name]),
  );

  return rows.map((row) => {
    const ticket = row.ticket as any;
    return {
      id: row.id,
      ticketReference: ticket?.ticket_reference ?? "—",
      attendeeName: ticket?.attendee_name ?? "Attendee",
      ticketTypeName: ticket?.ticket_type?.name ?? "Ticket",
      eventId: row.event_id,
      eventTitle: (row.event as any)?.title ?? "Event",
      method: row.method,
      scannedAt: row.scanned_at,
      scannedByName: scannerNames.get(row.scanned_by) ?? "Scanner",
    };
  });
}
