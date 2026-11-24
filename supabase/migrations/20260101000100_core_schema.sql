-- ============================================================================
-- TICKORA · 002 · Core schema, constraints, indexes and triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_role_idx on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- Organizers & categories
-- ---------------------------------------------------------------------------
create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  logo_url text,
  banner_url text,
  email text,
  phone text,
  city text,
  status public.organizer_status not null default 'pending',
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create index if not exists organizers_status_idx on public.organizers (status);
create index if not exists organizers_slug_idx on public.organizers (slug);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  icon text,
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists categories_active_sort_idx
  on public.categories (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- Events & ticket types
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null check (length(trim(title)) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text not null default '',
  short_description text check (short_description is null or length(short_description) <= 300),
  cover_image_url text,
  banner_image_url text,
  venue_name text not null default '',
  address text,
  city text not null check (city in ('Buea', 'Douala', 'Yaoundé', 'Limbe')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'Africa/Douala',
  status public.event_status not null default 'draft',
  rejection_reason text,
  submitted_at timestamptz,
  published_at timestamptz,
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  is_featured boolean not null default false,
  views_count integer not null default 0 check (views_count >= 0),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (status <> 'published' or published_at is not null)
);

create index if not exists events_public_idx
  on public.events (status, start_at) where status = 'published';
create index if not exists events_organizer_idx on public.events (organizer_id, status);
create index if not exists events_category_idx on public.events (category_id, status);
create index if not exists events_city_idx on public.events (city, start_at);
create index if not exists events_featured_idx
  on public.events (is_featured, start_at) where status = 'published';
create index if not exists events_slug_idx on public.events (slug);

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  description text,
  price_xaf integer not null default 0 check (price_xaf >= 0 and price_xaf <= 100000000),
  quantity_total integer not null check (quantity_total >= 0 and quantity_total <= 1000000),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  min_per_order integer not null default 1 check (min_per_order between 1 and 20),
  max_per_order integer not null default 8 check (max_per_order between 1 and 20),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity_sold + quantity_reserved <= quantity_total),
  check (max_per_order >= min_per_order),
  check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);

create unique index if not exists ticket_types_event_name_idx
  on public.ticket_types (event_id, lower(name));
create index if not exists ticket_types_event_idx on public.ticket_types (event_id, sort_order);

-- ---------------------------------------------------------------------------
-- Bookings, items, inventory reservations
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'TKR-' || to_char(now(), 'YYMM') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  attendee_id uuid not null references auth.users (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  status public.booking_status not null default 'pending_payment',
  subtotal_xaf integer not null default 0 check (subtotal_xaf >= 0),
  service_fee_xaf integer not null default 0 check (service_fee_xaf >= 0),
  total_xaf integer not null default 0 check (total_xaf >= 0),
  currency text not null default 'XAF' check (currency = 'XAF'),
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text,
  reservation_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  client_idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_xaf = subtotal_xaf + service_fee_xaf),
  check (status <> 'pending_payment' or reservation_expires_at is not null),
  check (status <> 'confirmed' or confirmed_at is not null)
);

create unique index if not exists bookings_attendee_idempotency_idx
  on public.bookings (attendee_id, client_idempotency_key)
  where client_idempotency_key is not null;
create index if not exists bookings_attendee_idx on public.bookings (attendee_id, created_at desc);
create index if not exists bookings_event_idx on public.bookings (event_id, status);
create index if not exists bookings_pending_expiry_idx
  on public.bookings (reservation_expires_at)
  where status = 'pending_payment';
create index if not exists bookings_reference_idx on public.bookings (reference);

create table if not exists public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 20),
  unit_price_xaf integer not null check (unit_price_xaf >= 0),
  line_total_xaf integer not null check (line_total_xaf >= 0),
  created_at timestamptz not null default now(),
  check (line_total_xaf = unit_price_xaf * quantity),
  unique (booking_id, ticket_type_id)
);

create index if not exists booking_items_booking_idx on public.booking_items (booking_id);
create index if not exists booking_items_ticket_type_idx on public.booking_items (ticket_type_id);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 20),
  status text not null default 'active' check (status in ('active', 'consumed', 'released')),
  expires_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, ticket_type_id)
);

create index if not exists inventory_reservations_active_idx
  on public.inventory_reservations (expires_at) where status = 'active';

-- ---------------------------------------------------------------------------
-- Payments, webhooks, refunds
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  provider public.payment_provider not null,
  status public.payment_status not null default 'initiated',
  amount_xaf integer not null check (amount_xaf >= 0),
  currency text not null default 'XAF' check (currency = 'XAF'),
  provider_reference text,
  idempotency_key text not null unique,
  is_demo boolean not null default false,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  initiated_at timestamptz not null default now(),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'succeeded' or verified_at is not null),
  check (provider <> 'demo' or is_demo = true)
);

create unique index if not exists payments_provider_reference_idx
  on public.payments (provider, provider_reference)
  where provider_reference is not null;
create index if not exists payments_booking_idx on public.payments (booking_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  booking_id uuid not null references public.bookings (id) on delete restrict,
  amount_xaf integer not null check (amount_xaf > 0),
  status public.refund_status not null default 'requested',
  reason text not null check (length(trim(reason)) between 10 and 2000),
  requested_by uuid not null references auth.users (id),
  reviewed_by uuid references auth.users (id),
  admin_note text,
  provider_reference text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists refunds_one_open_per_booking_idx
  on public.refunds (booking_id)
  where status in ('requested', 'approved');
create index if not exists refunds_status_idx on public.refunds (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Tickets, staff and check-ins
-- ---------------------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  attendee_id uuid not null references auth.users (id) on delete restrict,
  attendee_name text not null default '',
  ticket_reference text not null unique,
  qr_token text not null unique,
  qr_token_hash text not null unique,
  status public.ticket_status not null default 'valid',
  checked_in_at timestamptz,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (status <> 'used' or checked_in_at is not null)
);

create index if not exists tickets_attendee_idx on public.tickets (attendee_id, created_at desc);
create index if not exists tickets_booking_idx on public.tickets (booking_id);
create index if not exists tickets_event_idx on public.tickets (event_id, status);

create table if not exists public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'scanner' check (role in ('scanner', 'manager')),
  assigned_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_staff_user_idx on public.event_staff (user_id);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  scanned_by uuid not null references auth.users (id),
  method text not null default 'qr' check (method in ('qr', 'manual')),
  device_info text,
  scanned_at timestamptz not null default now()
);

create index if not exists check_ins_event_idx on public.check_ins (event_id, scanned_at desc);

-- ---------------------------------------------------------------------------
-- Notifications, payouts, audit, settings, inbox
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

create table if not exists public.organizer_payouts (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete restrict,
  amount_xaf integer not null check (amount_xaf > 0),
  status public.payout_status not null default 'requested',
  method text not null check (method in ('mtn_momo', 'orange_money', 'bank_transfer')),
  destination text not null check (length(trim(destination)) between 4 and 120),
  reference text,
  admin_note text,
  requested_by uuid not null references auth.users (id),
  reviewed_by uuid references auth.users (id),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payouts_organizer_idx on public.organizer_payouts (organizer_id, created_at desc);
create index if not exists payouts_status_idx on public.organizer_payouts (status, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text not null default 'website',
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'organizers', 'events', 'ticket_types', 'bookings',
    'payments', 'refunds', 'organizer_payouts'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Ticket token generation (hash only used for lookup; token never in listings)
-- ---------------------------------------------------------------------------
create or replace function public.prepare_ticket_secrets()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.qr_token is null or length(new.qr_token) < 32 then
    new.qr_token := encode(extensions.gen_random_bytes(32), 'hex');
  end if;
  new.qr_token_hash := encode(extensions.digest(new.qr_token, 'sha256'), 'hex');
  if new.ticket_reference is null or new.ticket_reference = '' then
    new.ticket_reference :=
      'TKT-' || to_char(now(), 'YYMM') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_ticket_secrets on public.tickets;
create trigger prepare_ticket_secrets
  before insert on public.tickets
  for each row execute function public.prepare_ticket_secrets();

-- ---------------------------------------------------------------------------
-- Volume / abuse guards
-- ---------------------------------------------------------------------------
alter table public.newsletter_subscribers
  drop constraint if exists newsletter_email_length;
alter table public.newsletter_subscribers
  add constraint newsletter_email_length check (length(email) <= 254);
alter table public.contact_messages
  drop constraint if exists contact_message_length;
alter table public.contact_messages
  add constraint contact_message_length check (length(message) between 20 and 5000);
