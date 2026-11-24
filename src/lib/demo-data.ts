import type {
  CategorySummary,
  EventDetail,
  EventSummary,
  OrganizerSummary,
  TicketTypeSummary,
} from "@/lib/domain";

/**
 * Development-only sample catalogue.
 *
 * It is used ONLY when Supabase credentials are absent so that the public
 * product can be reviewed. It is never written to the database and checkout is
 * disabled. The UI labels this state explicitly ("Preview catalogue").
 */

const now = new Date();
function at(days: number, hour: number, minutes = 0): string {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, minutes, 0, 0);
  return date.toISOString();
}

function ticket(
  id: string,
  name: string,
  price: number,
  total: number,
  sold: number,
  description: string,
): TicketTypeSummary {
  return {
    id,
    name,
    description,
    priceXaf: price,
    quantityTotal: total,
    quantitySold: sold,
    quantityReserved: 0,
    available: total - sold,
    minPerOrder: 1,
    maxPerOrder: 8,
    salesStartAt: null,
    salesEndAt: at(2, 23, 59),
    isActive: true,
    salesOpen: true,
  };
}

export const demoCategories: CategorySummary[] = [
  {
    id: "cat-music",
    name: "Music & Concerts",
    slug: "music",
    description: "Live bands, DJ sets and nights that move the city.",
    icon: "Music",
    color: "#3B82F6",
    eventCount: 4,
  },
  {
    id: "cat-tech",
    name: "Tech & Business",
    slug: "tech-business",
    description: "Founders, builders and the ideas shaping tomorrow.",
    icon: "Laptop",
    color: "#2563EB",
    eventCount: 2,
  },
  {
    id: "cat-culture",
    name: "Arts & Culture",
    slug: "arts-culture",
    description: "Exhibitions, theatre, poetry and creative expression.",
    icon: "Palette",
    color: "#60A5FA",
    eventCount: 2,
  },
  {
    id: "cat-food",
    name: "Food & Drink",
    slug: "food-drink",
    description: "Street food, tasting menus and long table evenings.",
    icon: "UtensilsCrossed",
    color: "#38BDF8",
    eventCount: 1,
  },
  {
    id: "cat-sport",
    name: "Sports & Wellness",
    slug: "sports-wellness",
    description: "Movement, competition and the great outdoors.",
    icon: "Trophy",
    color: "#1D4ED8",
    eventCount: 1,
  },
  {
    id: "cat-community",
    name: "Community",
    slug: "community",
    description: "Meet, connect and build something together.",
    icon: "Users",
    color: "#1E40AF",
    eventCount: 1,
  },
];

export const demoOrganizers: OrganizerSummary[] = [
  {
    id: "org-atlantic",
    name: "Atlantic Live",
    slug: "atlantic-live",
    logoUrl: null,
    description:
      "A Douala-based live music promoter producing intimate concerts and large-scale festivals across the coast.",
    city: "Douala",
    status: "approved",
    eventCount: 3,
  },
  {
    id: "org-mountain",
    name: "Mountain View Events",
    slug: "mountain-view-events",
    logoUrl: null,
    description:
      "Buea experience designers creating conferences, cultural nights and mountain-side gatherings.",
    city: "Buea",
    status: "approved",
    eventCount: 3,
  },
  {
    id: "org-mokolo",
    name: "Mokolo Creative",
    slug: "mokolo-creative",
    logoUrl: null,
    description:
      "A Yaoundé creative studio connecting artists, founders and the city's curious.",
    city: "Yaoundé",
    status: "approved",
    eventCount: 2,
  },
  {
    id: "org-ocean",
    name: "Ocean House Limbe",
    slug: "ocean-house-limbe",
    logoUrl: null,
    description:
      "Ocean-front cultural programming, food experiences and community events in Limbe.",
    city: "Limbe",
    status: "approved",
    eventCount: 2,
  },
];

interface DemoSeed {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categorySlug: string;
  organizerSlug: string;
  city: string;
  venue: string;
  address: string;
  startAt: string;
  endAt: string;
  cover: string;
  banner: string;
  featured: boolean;
  ticketsSold: number;
  capacity: number;
  ticketTypes: TicketTypeSummary[];
  views: number;
}

const seed: DemoSeed[] = [
  {
    id: "evt-ndolo",
    slug: "ndolo-live-sessions",
    title: "Ndolo Live Sessions",
    shortDescription:
      "An intimate evening of Afrobeats, makossa and new-wave sounds on the Wouri riverfront.",
    description:
      "Atlantic Live brings together five of the coast's most exciting acts for a single, carefully staged night in Douala. Expect a stripped-back live band, guest appearances from Makossa legends, and a DJ set under the stars until late.\n\nDoors open at 18:30. The main programme begins at 20:00. Food and drinks are available on site; outside drinks are not permitted. The venue is accessible, with reserved seating for guests with reduced mobility — contact the organizer after booking.",
    categorySlug: "music",
    organizerSlug: "atlantic-live",
    city: "Douala",
    venue: "Wouri Riverfront Pavilion",
    address: "Boulevard de la Liberté, Bonanjo, Douala",
    startAt: at(12, 20, 0),
    endAt: at(12, 23, 30),
    cover:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1800&q=80",
    featured: true,
    ticketsSold: 412,
    capacity: 600,
    views: 4820,
    ticketTypes: [
      ticket("tt-ndolo-early", "Early Bird", 7500, 120, 120, "Limited first release."),
      ticket("tt-ndolo-regular", "Regular", 12000, 400, 280, "General admission."),
      ticket("tt-ndolo-vip", "VIP", 30000, 80, 12, "Reserved table, welcome drink and fast-track entry."),
    ],
  },
  {
    id: "evt-summit",
    slug: "cameroon-innovation-summit",
    title: "Cameroon Innovation Summit 2026",
    shortDescription:
      "Two days of product, capital and policy conversations with builders from across Central Africa.",
    description:
      "The Cameroon Innovation Summit is the country's meeting point for founders, operators, investors and public-sector leaders. This year's programme focuses on digital infrastructure, creative industries and the next generation of Cameroonian companies.\n\nThe summit includes keynote conversations, practical workshops, a curated startup showcase and structured networking. Your ticket includes lunch, refreshments and access to the session recordings.",
    categorySlug: "tech-business",
    organizerSlug: "mountain-view-events",
    city: "Buea",
    venue: "Buea Mountain Convention Centre",
    address: "Molyko, Buea",
    startAt: at(24, 9, 0),
    endAt: at(25, 17, 0),
    cover:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1800&q=80",
    featured: true,
    ticketsSold: 188,
    capacity: 450,
    views: 3120,
    ticketTypes: [
      ticket("tt-summit-standard", "Standard Pass", 25000, 300, 150, "Both days, all sessions and lunch."),
      ticket("tt-summit-founder", "Founder Pass", 45000, 100, 30, "Both days plus investor roundtables."),
      ticket("tt-summit-student", "Student Pass", 10000, 50, 50, "Valid student ID required at check-in."),
    ],
  },
  {
    id: "evt-culture",
    slug: "mokolo-after-dark",
    title: "Mokolo After Dark",
    shortDescription:
      "A late-night cultural showcase of fashion, spoken word and contemporary Cameroonian art.",
    description:
      "Mokolo Creative transforms a former textile warehouse into a one-night cultural house. The evening pairs an emerging designer runway with spoken word, a small photography exhibition and a vinyl listening room.\n\nArrive early for the gallery opening. The runway starts promptly at 21:00. This is an 18+ event.",
    categorySlug: "arts-culture",
    organizerSlug: "mokolo-creative",
    city: "Yaoundé",
    venue: "Maison Textile",
    address: "Avenue Kennedy, Centre, Yaoundé",
    startAt: at(17, 19, 30),
    endAt: at(18, 1, 0),
    cover:
      "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1800&q=80",
    featured: true,
    ticketsSold: 146,
    capacity: 260,
    views: 2380,
    ticketTypes: [
      ticket("tt-culture-general", "General Admission", 8000, 220, 136, "Exhibition, runway and listening room."),
      ticket("tt-culture-front", "Front Row", 20000, 40, 10, "Reserved front-row seat and programme."),
    ],
  },
  {
    id: "evt-sunset",
    slug: "limbe-sunset-sessions",
    title: "Limbe Sunset Sessions",
    shortDescription:
      "Golden hour on the Atlantic with live acoustic sets, grilled seafood and ocean air.",
    description:
      "Ocean House Limbe hosts a relaxed sunset session on the black sand beach. Three acoustic acts play as the sun sets over the bay, with a seasonal seafood menu prepared by guest chefs.\n\nBring a light layer for the evening breeze. Beach access is included; swimming is at your own risk. Children under 12 enter free with a paying adult.",
    categorySlug: "food-drink",
    organizerSlug: "ocean-house-limbe",
    city: "Limbe",
    venue: "Ocean House Beach",
    address: "Mile 4, Limbe",
    startAt: at(9, 17, 0),
    endAt: at(9, 21, 0),
    cover:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?auto=format&fit=crop&w=1800&q=80",
    featured: true,
    ticketsSold: 92,
    capacity: 180,
    views: 1860,
    ticketTypes: [
      ticket("tt-sunset-entry", "Sunset Entry", 6000, 150, 82, "Entry and live music."),
      ticket("tt-sunset-dinner", "Dinner Table", 18000, 30, 10, "Reserved table and three-course seafood menu."),
    ],
  },
  {
    id: "evt-run",
    slug: "mount-cameroon-morning-run",
    title: "Mount Cameroon Morning Run",
    shortDescription:
      "A 10K and 5K community run along the foothills, finishing with breakfast and music.",
    description:
      "A community run for every pace. Both routes start at the Buea sports complex, climb gently through Molyko and return for a shared breakfast. Registration includes a timing chip, finisher medal and breakfast.",
    categorySlug: "sports-wellness",
    organizerSlug: "mountain-view-events",
    city: "Buea",
    venue: "Buea Sports Complex",
    address: "Molyko, Buea",
    startAt: at(6, 6, 30),
    endAt: at(6, 11, 0),
    cover:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1800&q=80",
    featured: false,
    ticketsSold: 240,
    capacity: 500,
    views: 1420,
    ticketTypes: [
      ticket("tt-run-10k", "10K Entry", 5000, 350, 190, "Timing chip, medal and breakfast."),
      ticket("tt-run-5k", "5K Entry", 3000, 150, 50, "Medal and breakfast."),
    ],
  },
  {
    id: "evt-jazz",
    slug: "douala-jazz-nights",
    title: "Douala Jazz Nights",
    shortDescription:
      "A seated evening of contemporary jazz with the Atlantic Quartet and special guests.",
    description:
      "An intimate, seated performance in the city's most beautiful colonial-era hall. The Atlantic Quartet perform two sets with a short interval, joined by vocalist Aïcha Mbappe.\n\nDoors 19:00, first set 20:00. Drinks are available at the bar. Photography without flash is welcome.",
    categorySlug: "music",
    organizerSlug: "atlantic-live",
    city: "Douala",
    venue: "Salle des Fêtes, Bonanjo",
    address: "Rue Joffre, Bonanjo, Douala",
    startAt: at(31, 20, 0),
    endAt: at(31, 22, 30),
    cover:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?auto=format&fit=crop&w=1800&q=80",
    featured: false,
    ticketsSold: 78,
    capacity: 220,
    views: 980,
    ticketTypes: [
      ticket("tt-jazz-seated", "Seated", 15000, 180, 68, "Reserved seating."),
      ticket("tt-jazz-balcony", "Balcony", 22000, 40, 10, "Balcony seat and interval drink."),
    ],
  },
  {
    id: "evt-founders",
    slug: "founders-breakfast-yaounde",
    title: "Founders Breakfast: Yaoundé",
    shortDescription:
      "A small, candid breakfast for early-stage founders to compare notes and solve real problems.",
    description:
      "Twenty-five founders, one long table, no pitches. We discuss hiring, pricing, distribution and the unglamorous parts of building a company in Cameroon. Breakfast is included.\n\nThis session is limited to founders and co-founders of operating companies. Applications are reviewed; your ticket is confirmed on acceptance.",
    categorySlug: "tech-business",
    organizerSlug: "mokolo-creative",
    city: "Yaoundé",
    venue: "Bastos Garden Club",
    address: "Bastos, Yaoundé",
    startAt: at(20, 8, 0),
    endAt: at(20, 10, 30),
    cover:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1800&q=80",
    featured: false,
    ticketsSold: 21,
    capacity: 30,
    views: 760,
    ticketTypes: [ticket("tt-founders-seat", "Founder Seat", 12000, 30, 21, "Breakfast and facilitated session.")],
  },
  {
    id: "evt-poetry",
    slug: "voices-of-the-city",
    title: "Voices of the City",
    shortDescription:
      "An open-air evening of poetry, storytelling and acoustic music in Buea.",
    description:
      "A warm, open-air gathering celebrating Cameroonian voices in English, French and Pidgin. Six featured poets, an acoustic set and a short open-mic session to close the night.",
    categorySlug: "arts-culture",
    organizerSlug: "mountain-view-events",
    city: "Buea",
    venue: "Alliance Française Garden",
    address: "Molyko, Buea",
    startAt: at(14, 18, 30),
    endAt: at(14, 21, 30),
    cover:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80",
    featured: false,
    ticketsSold: 64,
    capacity: 140,
    views: 620,
    ticketTypes: [
      ticket("tt-poetry-standard", "Standard", 4000, 120, 60, "General admission."),
      ticket("tt-poetry-support", "Supporter", 10000, 20, 4, "Front seating and a signed anthology."),
    ],
  },
  {
    id: "evt-market",
    slug: "ocean-house-makers-market",
    title: "Ocean House Makers Market",
    shortDescription:
      "A weekend market of ceramics, textiles, small-batch food and live demonstrations.",
    description:
      "Over forty makers from the South West and Littoral regions gather on the Limbe seafront. Expect ceramics, hand-woven textiles, natural skincare, coffee and a rotating food court.\n\nEntry is timed to keep the market comfortable. Children under 12 enter free.",
    categorySlug: "community",
    organizerSlug: "ocean-house-limbe",
    city: "Limbe",
    venue: "Ocean House Grounds",
    address: "Mile 4, Limbe",
    startAt: at(38, 10, 0),
    endAt: at(38, 18, 0),
    cover:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80",
    banner:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80",
    featured: false,
    ticketsSold: 110,
    capacity: 400,
    views: 540,
    ticketTypes: [
      ticket("tt-market-general", "Day Pass", 2000, 400, 110, "Entry between 10:00 and 18:00."),
    ],
  },
];

const categoryBySlug = new Map(demoCategories.map((c) => [c.slug, c]));
const organizerBySlug = new Map(demoOrganizers.map((o) => [o.slug, o]));

export const demoEvents: EventDetail[] = seed.map((item) => {
  const category = categoryBySlug.get(item.categorySlug);
  const organizer = organizerBySlug.get(item.organizerSlug)!;
  const startingPrice = item.ticketTypes.reduce(
    (min, t) => Math.min(min, t.priceXaf),
    Number.POSITIVE_INFINITY,
  );
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    shortDescription: item.shortDescription,
    description: item.description,
    coverImageUrl: item.cover,
    bannerImageUrl: item.banner,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    categoryColor: category?.color ?? null,
    city: item.city,
    venueName: item.venue,
    address: item.address,
    startAt: item.startAt,
    endAt: item.endAt,
    status: "published",
    isFeatured: item.featured,
    viewsCount: item.views,
    organizerId: organizer.id,
    organizerName: organizer.name,
    organizerSlug: organizer.slug,
    organizerLogoUrl: organizer.logoUrl,
    organizerDescription: organizer.description,
    startingPriceXaf: startingPrice === Number.POSITIVE_INFINITY ? null : startingPrice,
    ticketsSold: item.ticketsSold,
    capacity: item.capacity,
    ticketTypes: item.ticketTypes,
  };
});

export const demoEventSummaries: EventSummary[] = demoEvents.map(
  ({ ticketTypes: _ticketTypes, description: _description, address: _address, bannerImageUrl: _banner, viewsCount: _views, organizerId: _oid, organizerDescription: _odesc, ...summary }) =>
    summary,
);

export function isDemoSlug(slug: string) {
  return demoEvents.some((event) => event.slug === slug);
}
