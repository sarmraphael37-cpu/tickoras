/**
 * TICKORA database types.
 *
 * This file mirrors `supabase/migrations/*` and is intentionally committed so
 * the application type-checks without a live project. Once a project is linked,
 * regenerate it with:
 *   npm run db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | "attendee"
  | "organizer"
  | "admin"
  | "scanner"
  | "service_provider";
export type OrganizerStatus = "pending" | "approved" | "rejected" | "suspended";
export type EventStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "rejected"
  | "suspended"
  | "cancelled"
  | "completed";
export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "expired"
  | "cancelled"
  | "refunded";
export type PaymentProvider = "demo" | "mtn_momo" | "orange_money" | "card";
export type PaymentStatus =
  | "initiated"
  | "pending"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "refunded"
  | "cancelled";
export type TicketStatus = "valid" | "used" | "cancelled" | "refunded";
export type RefundStatus = "requested" | "approved" | "rejected" | "processed";
export type PayoutStatus =
  | "requested"
  | "approved"
  | "processing"
  | "paid"
  | "rejected";
export type ServiceBookingStatus =
  | "pending"
  | "quotation_submitted"
  | "accepted"
  | "payment_pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}
export interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  granted_at: string;
}
export interface OrganizerRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: OrganizerStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  referral_enabled: boolean;
  referral_reward_type: "fixed" | "percent" | "discount_voucher" | "loyalty_points";
  referral_reward_value: number;
  affiliate_commission_type: "percent" | "fixed";
  affiliate_commission_value: number;
  is_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "info_requested"
  | "suspended";

export interface VerificationRequestRow {
  id: string;
  subject_type: "organizer" | "service_provider";
  subject_id: string;
  user_id: string;
  documents: Array<{ label: string; url: string }>;
  notes: string | null;
  status: VerificationStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicReviewStatus = "published" | "pending" | "reported" | "rejected";

export interface PublicReviewRow {
  id: string;
  target_type: "event" | "organizer";
  target_id: string;
  user_id: string;
  booking_id: string | null;
  rating: number;
  comment: string | null;
  status: PublicReviewStatus;
  created_at: string;
  updated_at: string;
  reviewer?: { full_name?: string | null } | null;
  avg_rating?: number;
  review_count?: number;
}

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";
export type PlatformPaymentKind = "subscription" | "featured";
export type PlatformPaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded";
export type FeaturedPromotionStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled"
  | "refunded";

export interface SubscriptionPlanRow {
  id: string;
  code: "starter" | "professional" | "enterprise";
  name: string;
  price_xaf: number;
  billing_months: number;
  features: Record<string, boolean | number>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizerSubscriptionRow {
  id: string;
  organizer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformPaymentRow {
  id: string;
  organizer_id: string;
  kind: PlatformPaymentKind;
  plan_id: string | null;
  featured_promotion_id: string | null;
  amount_xaf: number;
  currency: string;
  provider: PaymentProvider;
  status: PlatformPaymentStatus;
  provider_reference: string | null;
  idempotency_key: string;
  is_demo: boolean;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  initiated_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeaturedPromotionRow {
  id: string;
  organizer_id: string;
  event_id: string;
  placement: "homepage" | "sponsored" | "featured_badge";
  starts_at: string;
  ends_at: string;
  amount_xaf: number;
  status: FeaturedPromotionStatus;
  platform_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ComplaintStatus = "open" | "investigating" | "resolved" | "rejected";

export interface ComplaintRow {
  id: string;
  reference: string;
  user_id: string;
  organizer_id: string | null;
  event_id: string | null;
  service_booking_id: string | null;
  subject: string;
  description: string;
  evidence: Array<{ label: string; url: string }>;
  status: ComplaintStatus;
  priority: "low" | "normal" | "high";
  admin_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  event_title?: string | null;
}
export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}
export interface EventRow {
  id: string;
  organizer_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string;
  short_description: string | null;
  cover_image_url: string | null;
  banner_image_url: string | null;
  venue_name: string;
  address: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  start_at: string;
  end_at: string;
  timezone: string;
  status: EventStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  published_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_featured: boolean;
  views_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export interface TicketTypeRow {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_xaf: number;
  quantity_total: number;
  quantity_sold: number;
  quantity_reserved: number;
  min_per_order: number;
  max_per_order: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export interface BookingRow {
  id: string;
  reference: string;
  attendee_id: string;
  event_id: string;
  status: BookingStatus;
  subtotal_xaf: number;
  service_fee_xaf: number;
  total_xaf: number;
  currency: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  reservation_expires_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  client_idempotency_key: string | null;
  discount_xaf: number;
  promo_code_id: string | null;
  referral_link_id: string | null;
  affiliate_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface BookingItemRow {
  id: string;
  booking_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price_xaf: number;
  line_total_xaf: number;
  created_at: string;
}
export interface InventoryReservationRow {
  id: string;
  booking_id: string;
  ticket_type_id: string;
  quantity: number;
  status: "active" | "consumed" | "released";
  expires_at: string;
  released_at: string | null;
  created_at: string;
}
export interface PaymentRow {
  id: string;
  booking_id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount_xaf: number;
  currency: string;
  provider_reference: string | null;
  idempotency_key: string;
  is_demo: boolean;
  failure_reason: string | null;
  metadata: Json;
  initiated_at: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface PaymentWebhookEventRow {
  id: string;
  provider: string;
  external_event_id: string;
  payload: Json;
  signature_valid: boolean;
  processed_at: string | null;
  processing_error: string | null;
  created_at: string;
}
export interface RefundRow {
  id: string;
  payment_id: string;
  booking_id: string;
  amount_xaf: number;
  status: RefundStatus;
  reason: string;
  requested_by: string;
  reviewed_by: string | null;
  admin_note: string | null;
  provider_reference: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface TicketRow {
  id: string;
  booking_id: string;
  event_id: string;
  ticket_type_id: string;
  attendee_id: string;
  attendee_name: string;
  ticket_reference: string;
  qr_token: string;
  qr_token_hash: string;
  status: TicketStatus;
  checked_in_at: string | null;
  issued_at: string;
  created_at: string;
}
export interface EventStaffRow {
  id: string;
  event_id: string;
  user_id: string;
  role: "scanner" | "manager";
  assigned_by: string | null;
  created_at: string;
}
export interface CheckInRow {
  id: string;
  ticket_id: string;
  event_id: string;
  scanned_by: string;
  method: "qr" | "manual";
  device_info: string | null;
  scanned_at: string;
}
export interface ScanAttemptRow {
  id: string;
  actor_id: string;
  event_id: string | null;
  ticket_id: string | null;
  ticket_reference: string | null;
  method: "qr" | "manual";
  outcome: "success" | "invalid" | "duplicate";
  code: string | null;
  created_at: string;
}
export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
}
export interface PayoutRow {
  id: string;
  organizer_id: string;
  amount_xaf: number;
  status: PayoutStatus;
  method: string;
  destination: string;
  reference: string | null;
  admin_note: string | null;
  requested_by: string;
  reviewed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: string;
}
export interface PlatformSettingRow {
  key: string;
  value: Json;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}
export interface NewsletterRow {
  id: string;
  email: string;
  source: string;
  created_at: string;
}
export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

/**
 * Supabase's `GenericTable` constraint requires `Record<string, unknown>`.
 * Interfaces do not get an implicit index signature, so we normalise every
 * row shape through a mapped type before handing it to the client.
 */
export interface ServiceCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
export interface ServiceProviderRow {
  id: string;
  user_id: string;
  business_name: string;
  slug: string;
  description: string | null;
  city: string | null;
  coverage_areas: string[];
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  starting_price_xaf: number | null;
  years_experience: number | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}
export interface ProviderPortfolioRow {
  id: string;
  provider_id: string;
  image_url: string;
  title: string | null;
  sort_order: number;
  created_at: string;
}
export interface ServiceBookingRow {
  id: string;
  reference: string;
  organizer_id: string;
  provider_id: string;
  event_id: string | null;
  title: string;
  details: string | null;
  event_date: string | null;
  budget_xaf: number | null;
  status: ServiceBookingStatus;
  quoted_amount_xaf: number | null;
  quote_note: string | null;
  platform_commission_xaf: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
export interface PromoCodeRow {
  id: string;
  organizer_id: string;
  event_id: string | null;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_order_xaf: number;
  starts_at: string | null;
  ends_at: string | null;
  status: "active" | "paused";
  created_at: string;
  updated_at: string;
}

export interface ReferralLinkRow {
  id: string;
  event_id: string;
  user_id: string;
  code: string;
  clicks_count: number;
  conversions_count: number;
  created_at: string;
}

export type AffiliateStatus = "pending" | "approved" | "rejected" | "suspended";

export interface AffiliateProfileRow {
  id: string;
  user_id: string;
  organizer_id: string;
  display_name: string;
  platform: string | null;
  audience_size: number | null;
  code: string;
  status: AffiliateStatus;
  clicks_count: number;
  conversions_count: number;
  total_earnings_xaf: number;
  created_at: string;
  updated_at: string;
}

export interface ReferralRewardRow {
  id: string;
  referral_link_id: string;
  booking_id: string;
  reward_type: string;
  reward_value: number;
  reward_xaf: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  created_at: string;
  paid_at: string | null;
}

export interface AffiliateCommissionRow {
  id: string;
  affiliate_id: string;
  booking_id: string;
  commission_type: "percent" | "fixed";
  commission_value: number;
  commission_xaf: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  created_at: string;
  paid_at: string | null;
}

export interface PromoRedemptionRow {
  id: string;
  promo_code_id: string;
  booking_id: string;
  discount_xaf: number;
  created_at: string;
}

export interface EventExpenseRow {
  id: string;
  organizer_id: string;
  event_id: string | null;
  category: string;
  description: string;
  amount_xaf: number;
  expense_date: string;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceReviewRow {
  id: string;
  booking_id: string;
  provider_id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

type Shape<T> = { [K in keyof T]: T[K] };

type Table<R, I = Partial<R>, U = Partial<R>> = {
  Row: Shape<R>;
  Insert: Shape<I>;
  Update: Shape<U>;
  Relationships: [];
};

interface EventSalesSummaryRow {
  event_id: string | null;
  organizer_id: string | null;
  event_title: string | null;
  tickets_sold: number | null;
  orders: number | null;
  gross_revenue: number | null;
  checked_in: number | null;
}

interface OrganizerDailySalesRow {
  organizer_id: string | null;
  day: string | null;
  revenue_xaf: number | null;
  orders: number | null;
}

interface PlatformDailyRevenueRow {
  day: string | null;
  organizer_revenue_xaf: number | null;
  platform_revenue_xaf: number | null;
  orders: number | null;
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      user_roles: Table<UserRoleRow>;
      organizers: Table<OrganizerRow>;
      categories: Table<CategoryRow>;
      events: Table<EventRow>;
      ticket_types: Table<TicketTypeRow>;
      bookings: Table<BookingRow>;
      booking_items: Table<BookingItemRow>;
      inventory_reservations: Table<InventoryReservationRow>;
      payments: Table<PaymentRow>;
      payment_webhook_events: Table<PaymentWebhookEventRow>;
      refunds: Table<RefundRow>;
      tickets: Table<TicketRow>;
      event_staff: Table<EventStaffRow>;
      check_ins: Table<CheckInRow>;
      scan_attempts: Table<ScanAttemptRow>;
      notifications: Table<NotificationRow>;
      organizer_payouts: Table<PayoutRow>;
      audit_logs: Table<AuditLogRow>;
      platform_settings: Table<PlatformSettingRow>;
      newsletter_subscribers: Table<NewsletterRow>;
      contact_messages: Table<ContactMessageRow>;
      service_categories: Table<ServiceCategoryRow>;
      service_providers: Table<ServiceProviderRow>;
      service_provider_categories: Table<{
        provider_id: string;
        category_id: string;
      }>;
      provider_portfolios: Table<ProviderPortfolioRow>;
      service_bookings: Table<ServiceBookingRow>;
      service_reviews: Table<ServiceReviewRow>;
      event_expenses: Table<EventExpenseRow>;
      promo_codes: Table<PromoCodeRow>;
      referral_links: Table<ReferralLinkRow>;
      affiliate_profiles: Table<AffiliateProfileRow>;
      referral_rewards: Table<ReferralRewardRow>;
      affiliate_commissions: Table<AffiliateCommissionRow>;
      promo_redemptions: Table<PromoRedemptionRow>;
      verification_requests: Table<VerificationRequestRow>;
      public_reviews: Table<PublicReviewRow>;
      complaints: Table<ComplaintRow>;
      subscription_plans: Table<SubscriptionPlanRow>;
      organizer_subscriptions: Table<OrganizerSubscriptionRow>;
      platform_payments: Table<PlatformPaymentRow>;
      featured_promotions: Table<FeaturedPromotionRow>;
    };
    Views: {
      event_sales_summary: { Row: Shape<EventSalesSummaryRow>; Relationships: [] };
      organizer_daily_sales: { Row: Shape<OrganizerDailySalesRow>; Relationships: [] };
      platform_daily_revenue: { Row: Shape<PlatformDailyRevenueRow>; Relationships: [] };
    };
    Functions: {
      reserve_booking: {
        Args: {
          p_event_id: string;
          p_items: Json;
          p_contact_name: string;
          p_contact_email: string;
          p_contact_phone: string;
          p_idempotency_key?: string;
        };
        Returns: Json;
      };
      create_payment_intent: {
        Args: {
          p_booking_id: string;
          p_provider: PaymentProvider;
        };
        Returns: Json;
      };
      confirm_demo_payment: {
        Args: { p_payment_id: string };
        Returns: Json;
      };
      process_verified_payment: {
        Args: {
          p_payment_id: string;
          p_provider_reference: string;
          p_payload?: Json;
        };
        Returns: Json;
      };
      check_in_ticket: {
        Args: { p_token: string; p_event_id?: string | null; p_method?: string };
        Returns: Json;
      };
      expire_stale_bookings: {
        Args: { p_limit?: number };
        Returns: number;
      };
      get_my_ticket_qr: {
        Args: { p_ticket_id: string };
        Returns: string;
      };
      organizer_available_balance: {
        Args: { p_organizer_id: string };
        Returns: number;
      };
      request_payout: {
        Args: {
          p_organizer_id: string;
          p_amount_xaf: number;
          p_method: string;
          p_destination: string;
        };
        Returns: string;
      };
      admin_review_event: {
        Args: { p_event_id: string; p_approve: boolean; p_reason?: string | null };
        Returns: Json;
      };
      admin_review_organizer: {
        Args: {
          p_organizer_id: string;
          p_approve: boolean;
          p_reason?: string | null;
        };
        Returns: Json;
      };
      admin_review_refund: {
        Args: { p_refund_id: string; p_approve: boolean; p_note?: string | null };
        Returns: Json;
      };
      admin_review_payout: {
        Args: {
          p_payout_id: string;
          p_status: string;
          p_note?: string | null;
        };
        Returns: Json;
      };
      save_event_draft: {
        Args: { p_event: Json; p_ticket_types: Json };
        Returns: string;
      };
      submit_event_for_approval: {
        Args: { p_event_id: string };
        Returns: Json;
      };
      admin_suspend_event: {
        Args: { p_event_id: string; p_reason: string };
        Returns: Json;
      };
      cancel_booking: {
        Args: { p_booking_id: string };
        Returns: Json;
      };
      add_event_staff_by_email: {
        Args: { p_event_id: string; p_email: string; p_role?: string };
        Returns: Json;
      };
      record_event_view: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      admin_log_action: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_metadata?: Json;
        };
        Returns: undefined;
      };
      admin_settle_refund: {
        Args: {
          p_refund_id: string;
          p_reference?: string | null;
          p_note?: string | null;
        };
        Returns: Json;
      };
      record_scan_attempt: {
        Args: {
          p_event_id?: string | null;
          p_ticket_id?: string | null;
          p_ticket_reference?: string | null;
          p_method?: string;
          p_outcome: string;
          p_code?: string | null;
        };
        Returns: string;
      };
      create_service_provider_profile: {
        Args: {
          p_business_name: string;
          p_slug: string;
          p_description?: string | null;
          p_city?: string | null;
          p_phone?: string | null;
          p_category_ids?: string[];
        };
        Returns: Json;
      };
      service_booking_notify: {
        Args: {
          p_booking_id: string;
          p_audience: string;
          p_title: string;
          p_body: string;
        };
        Returns: undefined;
      };
      refresh_provider_rating: {
        Args: { p_provider_id: string };
        Returns: undefined;
      };
      set_event_location: {
        Args: {
          p_event_id: string;
          p_latitude: number | null;
          p_longitude: number | null;
        };
        Returns: undefined;
      };
      track_marketing_click: {
        Args: { p_code: string };
        Returns: string | null;
      };
      resolve_marketing_code: {
        Args: { p_code: string };
        Returns: Record<string, unknown> | null;
      };
      apply_booking_attribution: {
        Args: {
          p_booking_id: string;
          p_promo_code?: string | null;
          p_referral_code?: string | null;
          p_affiliate_code?: string | null;
        };
        Returns: Record<string, unknown>;
      };
      set_affiliate_status: {
        Args: { p_affiliate_id: string; p_status: string };
        Returns: undefined;
      };
      review_verification: {
        Args: { p_request_id: string; p_status: string; p_note?: string | null };
        Returns: undefined;
      };
      submit_public_review: {
        Args: {
          p_target_type: string;
          p_target_id: string;
          p_rating: number;
          p_comment?: string | null;
          p_booking_id?: string | null;
        };
        Returns: string;
      };
      report_review: {
        Args: { p_review_id: string };
        Returns: undefined;
      };
      moderate_review: {
        Args: { p_review_id: string; p_status: string };
        Returns: undefined;
      };
      update_complaint_status: {
        Args: {
          p_complaint_id: string;
          p_status: string;
          p_note?: string | null;
          p_priority?: string | null;
        };
        Returns: undefined;
      };
      create_platform_payment: {
        Args: {
          p_organizer_id: string;
          p_kind: string;
          p_amount_xaf: number;
          p_provider: string;
          p_idempotency_key: string;
          p_plan_id?: string | null;
          p_metadata?: Json;
        };
        Returns: string;
      };
      confirm_platform_payment: {
        Args: { p_payment_id: string };
        Returns: Json;
      };
      admin_settle_platform_payment: {
        Args: { p_payment_id: string; p_reference?: string | null };
        Returns: Json;
      };
      cancel_subscription: {
        Args: { p_subscription_id: string };
        Returns: undefined;
      };
      admin_update_plan: {
        Args: { p_plan_id: string; p_price_xaf: number; p_is_active?: boolean | null };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: AppRole;
      organizer_status: OrganizerStatus;
      event_status: EventStatus;
      booking_status: BookingStatus;
      payment_provider: PaymentProvider;
      payment_status: PaymentStatus;
      ticket_status: TicketStatus;
      refund_status: RefundStatus;
      payout_status: PayoutStatus;
      service_booking_status: ServiceBookingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
