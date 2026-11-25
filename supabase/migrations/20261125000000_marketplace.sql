-- ============================================================================
-- TICKORA Event Services Marketplace
-- Additive migration: service categories, providers, portfolios, bookings,
-- reviews, service_provider role, RLS, and helper RPCs.
-- ============================================================================

-- New role ---------------------------------------------------------------
alter type public.app_role add value if not exists 'service_provider';

-- Enums -------------------------------------------------------------------
do $$ begin
  create type public.service_booking_status as enum (
    'pending',
    'quotation_submitted',
    'accepted',
    'payment_pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'disputed'
  );
exception when duplicate_object then null;
end $$;

-- Tables ------------------------------------------------------------------

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  description text,
  city text,
  coverage_areas text[] not null default '{}',
  phone text,
  whatsapp text,
  email text,
  logo_url text,
  starting_price_xaf integer check (starting_price_xaf is null or starting_price_xaf >= 0),
  years_experience integer check (years_experience is null or years_experience >= 0),
  is_verified boolean not null default false,
  is_active boolean not null default true,
  rating_avg numeric(3,2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_provider_categories (
  provider_id uuid not null references public.service_providers (id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete cascade,
  primary key (provider_id, category_id)
);

create table if not exists public.provider_portfolios (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers (id) on delete cascade,
  image_url text not null,
  title text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  organizer_id uuid not null references public.organizers (id) on delete restrict,
  provider_id uuid not null references public.service_providers (id) on delete restrict,
  event_id uuid references public.events (id) on delete set null,
  title text not null,
  details text,
  event_date date,
  budget_xaf integer check (budget_xaf is null or budget_xaf >= 0),
  status public.service_booking_status not null default 'pending',
  quoted_amount_xaf integer check (quoted_amount_xaf is null or quoted_amount_xaf >= 0),
  quote_note text,
  platform_commission_xaf integer not null default 0 check (platform_commission_xaf >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists service_bookings_provider_idx on public.service_bookings (provider_id, status);
create index if not exists service_bookings_organizer_idx on public.service_bookings (organizer_id, status);
create index if not exists service_providers_city_idx on public.service_providers (city) where is_active;
create index if not exists provider_portfolios_provider_idx on public.provider_portfolios (provider_id);

create table if not exists public.service_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.service_bookings (id) on delete cascade,
  provider_id uuid not null references public.service_providers (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists service_reviews_provider_idx on public.service_reviews (provider_id);

-- Triggers ----------------------------------------------------------------

drop trigger if exists set_updated_at_service_providers on public.service_providers;
create trigger set_updated_at_service_providers
  before update on public.service_providers
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_service_bookings on public.service_bookings;
create trigger set_updated_at_service_bookings
  before update on public.service_bookings
  for each row execute function public.set_updated_at();

-- Recompute provider rating when a review is added -------------------------
create or replace function public.refresh_provider_rating(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.service_providers p
  set rating_avg = coalesce((
        select round(avg(r.rating)::numeric, 2)
        from public.service_reviews r
        where r.provider_id = p_provider_id
      ), 0),
      rating_count = (
        select count(*) from public.service_reviews r
        where r.provider_id = p_provider_id
      )
  where p.id = p_provider_id;
end;
$$;

create or replace function public.service_review_rating_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_provider_rating(new.provider_id);
  return new;
end;
$$;

drop trigger if exists refresh_provider_rating_trg on public.service_reviews;
create trigger refresh_provider_rating_trg
  after insert on public.service_reviews
  for each row execute function public.service_review_rating_trigger();

-- Booking reference generator ----------------------------------------------
create or replace function public.service_booking_reference()
returns text
language plpgsql
volatile
set search_path = public
as $$
begin
  return 'SVC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
end;
$$;

-- Provider onboarding RPC: creates provider profile + role atomically ------
create or replace function public.create_service_provider_profile(
  p_business_name text,
  p_slug text,
  p_description text default null,
  p_city text default null,
  p_phone text default null,
  p_category_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_provider_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from public.service_providers where user_id = v_uid) then
    raise exception 'ALREADY_EXISTS: provider profile';
  end if;
  if length(trim(p_business_name)) < 2 then
    raise exception 'INVALID_INPUT: business name required';
  end if;

  insert into public.service_providers (
    user_id, business_name, slug, description, city, phone
  ) values (
    v_uid, trim(p_business_name), lower(trim(p_slug)),
    nullif(trim(p_description), ''), nullif(trim(p_city), ''),
    nullif(trim(p_phone), '')
  )
  returning id into v_provider_id;

  insert into public.service_provider_categories (provider_id, category_id)
  select v_provider_id, unnest(p_category_ids)
  on conflict do nothing;

  insert into public.user_roles (user_id, role)
  values (v_uid, 'service_provider')
  on conflict (user_id, role) do nothing;

  return jsonb_build_object('provider_id', v_provider_id);
end;
$$;

-- Seed service categories ---------------------------------------------------
insert into public.service_categories (name, slug, description, sort_order) values
  ('Event Photographers', 'photographers', 'Professional event and portrait photography.', 1),
  ('Videographers', 'videographers', 'Event filming, highlight reels and live coverage.', 2),
  ('DJs and Entertainment', 'djs-entertainment', 'DJ services, live bands and performers.', 3),
  ('Sound Engineers', 'sound-engineers', 'PA systems, mixing and live sound reinforcement.', 4),
  ('Event Decorators', 'decorators', 'Stage design, florals, lighting and theming.', 5),
  ('Security Personnel', 'security', 'Crowd control, access management and safety staff.', 6),
  ('Catering Services', 'catering', 'Food trucks, buffets, snacks and beverage service.', 7),
  ('Event Venues', 'venues', 'Spaces, halls and outdoor locations for hire.', 8),
  ('Marketing Agencies', 'marketing-agencies', 'Promotion, PR, social media and ticket campaigns.', 9),
  ('Equipment Rental', 'equipment-rental', 'Staging, lighting, AV and furniture hire.', 10)
on conflict (slug) do nothing;

-- RLS -----------------------------------------------------------------------
alter table public.service_categories enable row level security;
alter table public.service_providers enable row level security;
alter table public.service_provider_categories enable row level security;
alter table public.provider_portfolios enable row level security;
alter table public.service_bookings enable row level security;
alter table public.service_reviews enable row level security;

-- service_categories: public read, admin write
drop policy if exists "service_categories_public_read" on public.service_categories;
create policy "service_categories_public_read" on public.service_categories
  for select using (is_active or public.is_privileged_context());

drop policy if exists "service_categories_admin_write" on public.service_categories;
create policy "service_categories_admin_write" on public.service_categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- service_providers: public read of active, owner manages own
drop policy if exists "service_providers_public_read" on public.service_providers;
create policy "service_providers_public_read" on public.service_providers
  for select using (is_active or user_id = auth.uid() or public.is_privileged_context());

drop policy if exists "service_providers_owner_insert" on public.service_providers;
create policy "service_providers_owner_insert" on public.service_providers
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "service_providers_owner_update" on public.service_providers;
create policy "service_providers_owner_update" on public.service_providers
  for update to authenticated
  using (user_id = auth.uid() or public.is_privileged_context())
  with check (user_id = auth.uid() or public.is_privileged_context());

drop policy if exists "service_providers_admin_delete" on public.service_providers;
create policy "service_providers_admin_delete" on public.service_providers
  for delete to authenticated using (public.is_admin());

-- service_provider_categories: readable with provider, owner/admin writes
drop policy if exists "spc_public_read" on public.service_provider_categories;
create policy "spc_public_read" on public.service_provider_categories
  for select using (true);

drop policy if exists "spc_owner_write" on public.service_provider_categories;
create policy "spc_owner_write" on public.service_provider_categories
  for all to authenticated
  using (
    exists (select 1 from public.service_providers p
            where p.id = provider_id and p.user_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.service_providers p
            where p.id = provider_id and p.user_id = auth.uid())
    or public.is_admin()
  );

-- provider_portfolios: public read, owner/admin writes
drop policy if exists "portfolios_public_read" on public.provider_portfolios;
create policy "portfolios_public_read" on public.provider_portfolios
  for select using (true);

drop policy if exists "portfolios_owner_write" on public.provider_portfolios;
create policy "portfolios_owner_write" on public.provider_portfolios
  for all to authenticated
  using (
    exists (select 1 from public.service_providers p
            where p.id = provider_id and p.user_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.service_providers p
            where p.id = provider_id and p.user_id = auth.uid())
    or public.is_admin()
  );

-- service_bookings: organizer creates/reads own, provider reads/updates own
drop policy if exists "service_bookings_organizer_read" on public.service_bookings;
create policy "service_bookings_organizer_read" on public.service_bookings
  for select to authenticated
  using (
    organizer_id in (select id from public.organizers where owner_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "service_bookings_provider_read" on public.service_bookings;
create policy "service_bookings_provider_read" on public.service_bookings
  for select to authenticated
  using (
    provider_id in (select id from public.service_providers where user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "service_bookings_organizer_insert" on public.service_bookings;
create policy "service_bookings_organizer_insert" on public.service_bookings
  for insert to authenticated
  with check (
    organizer_id in (select id from public.organizers where owner_id = auth.uid())
    and status = 'pending'
  );

drop policy if exists "service_bookings_party_update" on public.service_bookings;
create policy "service_bookings_party_update" on public.service_bookings
  for update to authenticated
  using (
    organizer_id in (select id from public.organizers where owner_id = auth.uid())
    or provider_id in (select id from public.service_providers where user_id = auth.uid())
    or public.is_admin()
  )
  with check (
    organizer_id in (select id from public.organizers where owner_id = auth.uid())
    or provider_id in (select id from public.service_providers where user_id = auth.uid())
    or public.is_admin()
  );

-- service_reviews: public read, eligible parties write once
drop policy if exists "service_reviews_public_read" on public.service_reviews;
create policy "service_reviews_public_read" on public.service_reviews
  for select using (true);

drop policy if exists "service_reviews_organizer_insert" on public.service_reviews;
create policy "service_reviews_organizer_insert" on public.service_reviews
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.service_bookings b
      where b.id = booking_id
        and b.organizer_id in (select id from public.organizers where owner_id = auth.uid())
        and b.status = 'completed'
    )
  );

-- Notification helper: notifies the counterparty of a service booking -------
-- p_audience: 'provider' notifies the provider owner, 'organizer' notifies the
-- organizer owner. Called by server actions after status transitions.
create or replace function public.service_booking_notify(
  p_booking_id uuid,
  p_audience text,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.service_bookings%rowtype;
  v_provider_owner uuid;
  v_organizer_owner uuid;
  v_recipient uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_audience not in ('provider', 'organizer') then
    raise exception 'INVALID_INPUT: audience';
  end if;

  select * into v_booking from public.service_bookings where id = p_booking_id;
  if not found then raise exception 'NOT_FOUND: booking'; end if;

  -- Caller must be a party to this booking (or admin).
  if not public.is_admin()
     and not exists (
       select 1 from public.organizers o
       where o.id = v_booking.organizer_id and o.owner_id = auth.uid()
     )
     and not exists (
       select 1 from public.service_providers p
       where p.id = v_booking.provider_id and p.user_id = auth.uid()
     ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select user_id into v_provider_owner
  from public.service_providers where id = v_booking.provider_id;
  select owner_id into v_organizer_owner
  from public.organizers where id = v_booking.organizer_id;

  v_recipient := case p_audience
    when 'provider' then v_provider_owner
    else v_organizer_owner
  end;

  if v_recipient is null then return; end if;

  insert into public.notifications (user_id, type, title, body, href)
  values (
    v_recipient,
    'service_booking',
    left(p_title, 200),
    left(p_body, 1000),
    case p_audience when 'provider' then '/provider/bookings' else '/organizer/services' end
  );
end;
$$;

-- Grants --------------------------------------------------------------------
grant select on public.service_categories to anon, authenticated;
grant select, insert, update, delete on public.service_categories to authenticated;
grant select on public.service_providers to anon, authenticated;
grant select, insert, update, delete on public.service_providers to authenticated;
grant select on public.service_provider_categories to anon, authenticated;
grant select, insert, update, delete on public.service_provider_categories to authenticated;
grant select on public.provider_portfolios to anon, authenticated;
grant select, insert, update, delete on public.provider_portfolios to authenticated;
grant select, insert, update on public.service_bookings to authenticated;
grant select on public.service_reviews to anon, authenticated;
grant insert on public.service_reviews to authenticated;

grant execute on function public.create_service_provider_profile(text, text, text, text, text, uuid[]) to authenticated;
grant execute on function public.service_booking_notify(uuid, text, text, text) to authenticated;
grant execute on function public.refresh_provider_rating(uuid) to service_role;
