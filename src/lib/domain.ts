import type {
  AppRole,
  BookingStatus,
  EventStatus,
  OrganizerStatus,
  PaymentProvider,
  PaymentStatus,
  PayoutStatus,
  RefundStatus,
  TicketStatus,
} from "@/types/database";

export const CITIES = ["Buea", "Douala", "Yaoundé", "Limbe"] as const;
export type City = (typeof CITIES)[number];

export const EVENT_STATUSES: EventStatus[] = [
  "draft",
  "pending_approval",
  "published",
  "rejected",
  "suspended",
  "cancelled",
  "completed",
];

export interface Viewer {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  roles: AppRole[];
  organizerId: string | null;
  organizerStatus: OrganizerStatus | null;
  organizerName: string | null;
  isSuspended: boolean;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  eventCount: number;
}

export interface OrganizerSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  city: string | null;
  status: OrganizerStatus;
  eventCount: number;
}

export interface TicketTypeSummary {
  id: string;
  name: string;
  description: string | null;
  priceXaf: number;
  quantityTotal: number;
  quantitySold: number;
  quantityReserved: number;
  available: number;
  minPerOrder: number;
  maxPerOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  isActive: boolean;
  salesOpen: boolean;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  categoryColor: string | null;
  city: string;
  venueName: string;
  startAt: string;
  endAt: string;
  status: EventStatus;
  isFeatured: boolean;
  organizerName: string;
  organizerSlug: string;
  organizerLogoUrl: string | null;
  startingPriceXaf: number | null;
  ticketsSold: number;
  capacity: number;
  /** IANA timezone for the event; falls back to Africa/Douala in the UI. */
  timezone?: string | null;
}

export interface EventDetail extends EventSummary {
  description: string;
  address: string | null;
  bannerImageUrl: string | null;
  viewsCount: number;
  organizerId: string;
  organizerDescription: string | null;
  ticketTypes: TicketTypeSummary[];
}

export interface BookingSummary {
  id: string;
  reference: string;
  status: BookingStatus;
  totalXaf: number;
  serviceFeeXaf: number;
  subtotalXaf: number;
  createdAt: string;
  reservationExpiresAt: string | null;
  event: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl: string | null;
    startAt: string;
    endAt: string;
    venueName: string;
    city: string;
  };
  itemCount: number;
  ticketCount: number;
}

export interface PaymentSummary {
  id: string;
  bookingId: string;
  bookingReference: string;
  eventTitle: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amountXaf: number;
  isDemo: boolean;
  providerReference: string | null;
  createdAt: string;
  bookingStatus: BookingStatus;
}

export interface TicketSummary {
  id: string;
  reference: string;
  status: TicketStatus;
  attendeeName: string;
  ticketTypeName: string;
  checkedInAt: string | null;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventStartAt: string;
  eventEndAt: string;
  venueName: string;
  city: string;
  coverImageUrl: string | null;
  bookingReference: string;
}

export interface RefundSummary {
  id: string;
  amountXaf: number;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  bookingReference: string | null;
  requesterName: string | null;
  paymentProvider: PaymentProvider | null;
}

export interface PayoutSummary {
  id: string;
  organizerId: string;
  organizerName: string;
  amountXaf: number;
  status: PayoutStatus;
  method: string;
  destination: string;
  reference: string | null;
  createdAt: string;
  processedAt: string | null;
}

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  demo: "Demo payment",
  mtn_momo: "MTN Mobile Money",
  orange_money: "Orange Money",
  card: "Card payment",
};

export const CITY_IMAGERY: Record<City, string> = {
  Buea:
    "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&q=80",
  Douala:
    "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&w=1200&q=80",
  Yaoundé:
    "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=80",
  Limbe:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
};
