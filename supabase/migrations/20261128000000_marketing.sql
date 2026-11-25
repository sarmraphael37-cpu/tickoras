-- ============================================================================
-- TICKORA Marketing, Referral & Affiliate Engine
-- Promo codes, attendee referral links, organizer affiliates, attribution,
-- reward/commission records granted only on confirmed bookings.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Promo codes
-- --------------------------------------------------------------------------
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_-]{3,32}$'),
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  min_order_xaf integer not null default 0 check (min_order_xaf >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index if not exists promo_codes_code_organizer_idx
  on public.promo_codes (organizer_id, upper(code));
create index if not exists promo_codes_event_idx on public.promo_codes (event_id);

-- --------------------------------------------------------------------------
-- Referral links (attendees refer events they hold tickets for / any event)
-- --------------------------------------------------------------------------
create table if not exists public.referral_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6,16}$'),
  clicks_count integer not null default 0,
  conversions_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists referral_links_event_idx on public.referral_links (event_id);

-- --------------------------------------------------------------------------
-- Affiliate profiles (recruited by organizers)
-- --------------------------------------------------------------------------
create table if not exists public.affiliate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organizer_id uuid not null references public.organizers (id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 120),
  platform text,               -- e.g. Instagram, TikTok, blog
  audience_size integer check (audience_size is null or audience_size >= 0),
  code text not null check (code ~ '^[A-Z0-9]{4,24}$'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  clicks_count integer not null default 0,
  conversions_count integer not null default 0,
  total_earnings_xaf integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists affiliate_profiles_code_idx
  on public.affiliate_profiles (upper(code));
create index if not exists affiliate_profiles_organizer_idx
  on public.affiliate_profiles (organizer_id);
create unique index if not exists affiliate_profiles_user_organizer_idx
  on public.affiliate_profiles (user_id, organizer_id);

-- --------------------------------------------------------------------------
-- Rewards & commissions — created only when a booking is confirmed
-- --------------------------------------------------------------------------
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_link_id uuid not null references public.referral_links (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  reward_type text not null check (reward_type in ('fixed', 'percent', 'discount_voucher', 'loyalty_points')),
  reward_value integer not null default 0,
  reward_xaf integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (booking_id, referral_link_id)
);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_profiles (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  commission_type text not null check (commission_type in ('percent', 'fixed')),
  commission_value integer not null,
  commission_xaf integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (booking_id, affiliate_id)
);

create index if not exists referral_rewards_link_idx on public.referral_rewards (referral_link_id);
create index if not exists affiliate_commissions_affiliate_idx
  on public.affiliate_commissions (affiliate_id);

-- --------------------------------------------------------------------------
-- Promo redemptions
-- --------------------------------------------------------------------------
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade unique,
  discount_xaf integer not null check (discount_xaf >= 0),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Booking attribution columns + discount support
-- --------------------------------------------------------------------------
alter table public.bookings
  add column if not exists discount_xaf integer not null default 0 check (discount_xaf >= 0),
  add column if not exists promo_code_id uuid references public.promo_codes (id) on delete set null,
  add column if not exists referral_link_id uuid references public.referral_links (id) on delete set null,
  add column if not exists affiliate_id uuid references public.affiliate_profiles (id) on delete set null;

alter table public.bookings drop constraint if exists bookings_total_xaf_check;
alter table public.bookings
  add constraint bookings_total_xaf_check
  check (total_xaf = subtotal_xaf + service_fee_xaf - discount_xaf);

-- Organizer-level marketing settings
alter table public.organizers
  add column if not exists referral_enabled boolean not null default true,
  add column if not exists referral_reward_type text not null default 'fixed'
    check (referral_reward_type in ('fixed', 'percent', 'discount_voucher', 'loyalty_points')),
  add column if not exists referral_reward_value integer not null default 0
    check (referral_reward_value >= 0),
  add column if not exists affiliate_commission_type text not null default 'percent'
    check (affiliate_commission_type in ('percent', 'fixed')),
  add column if not exists affiliate_commission_value integer not null default 0
    check (affiliate_commission_value >= 0);

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.promo_codes enable row level security;
alter table public.referral_links enable row level security;
alter table public.affiliate_profiles enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.promo_redemptions enable row level security;

-- Promo codes: organizers manage own; attendees may read active codes for
-- events they can see (needed for validation UX) — writes only via RPCs.
drop policy if exists "promo_codes_organizer_all" on public.promo_codes;
create policy "promo_codes_organizer_all" on public.promo_codes
  for all to authenticated
  using (
    organizer_id in (select id from public.organizers where owner_id = auth.uid())
    or public.is_admin()
  )
  with check (
    organizer_id in (select id from public.organizers where owner_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "promo_codes_public_read" on public.promo_codes;
create policy "promo_codes_public_read" on public.promo_codes
  for select to anon, authenticated
  using (status = 'active');

-- Referral links: owner manages; public reads for click resolution.
drop policy if exists "referral_links_owner" on public.referral_links;
create policy "referral_links_owner" on public.referral_links
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "referral_links_public_read" on public.referral_links;
create policy "referral_links_public_read" on public.referral_links
  for select to anon, authenticated using (true);

-- Affiliate profiles: self read/update limited fields via actions (RLS owner),
-- organizer reads affiliates of own org, public sees approved only.
drop policy if exists "affiliate_profiles_self" on public.affiliate_profiles;
create policy "affiliate_profiles_self" on public.affiliate_profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or organizer_id in (select id from public.organizers where owner_id = auth.uid())
    or status = 'approved'
  );

drop policy if exists "affiliate_profiles_insert" on public.affiliate_profiles;
create policy "affiliate_profiles_insert" on public.affiliate_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "affiliate_profiles_update" on public.affiliate_profiles;
create policy "affiliate_profiles_update" on public.affiliate_profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- Organizer approves/rejects via RPC (status transitions) — add organizer
-- update path limited to status column is complex; instead an RPC handles it.

-- Rewards/commissions: owner (referrer/affiliate) reads own; organizer reads
-- rewards for own events; admin all.
drop policy if exists "referral_rewards_read" on public.referral_rewards;
create policy "referral_rewards_read" on public.referral_rewards
  for select to authenticated
  using (
    referral_link_id in (select id from public.referral_links where user_id = auth.uid())
    or public.is_admin()
    or referral_link_id in (
      select rl.id from public.referral_links rl
      join public.events e on e.id = rl.event_id
      join public.organizers o on o.id = e.organizer_id
      where o.owner_id = auth.uid()
    )
  );

drop policy if exists "affiliate_commissions_read" on public.affiliate_commissions;
create policy "affiliate_commissions_read" on public.affiliate_commissions
  for select to authenticated
  using (
    affiliate_id in (select id from public.affiliate_profiles where user_id = auth.uid())
    or public.is_admin()
    or affiliate_id in (
      select ap.id from public.affiliate_profiles ap
      join public.organizers o on o.id = ap.organizer_id
      where o.owner_id = auth.uid()
    )
  );

-- Promo redemptions readable by organizer/admin/attendee-own-booking.
drop policy if exists "promo_redemptions_read" on public.promo_redemptions;
create policy "promo_redemptions_read" on public.promo_redemptions
  for select to authenticated
  using (
    public.is_admin()
    or promo_code_id in (
      select pc.id from public.promo_codes pc
      join public.organizers o on o.id = pc.organizer_id
      where o.owner_id = auth.uid()
    )
    or booking_id in (select id from public.bookings where attendee_id = auth.uid())
  );

grant select, insert, update, delete on public.promo_codes to authenticated;
grant select, insert, update, delete on public.referral_links to authenticated;
grant select, insert, update on public.affiliate_profiles to authenticated;
grant select on public.referral_rewards to authenticated;
grant select on public.affiliate_commissions to authenticated;
grant select on public.promo_redemptions to authenticated;

-- ===========================================================================
-- RPCs
-- ===========================================================================

-- Track a link click (referral or affiliate) — callable by anon via edge? Keep
-- authenticated+anon: clicks are public marketing data.
create or replace function public.track_marketing_click(p_code text)
returns text  -- 'referral' | 'affiliate' | 'promo' | null
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref record;
  v_aff record;
begin
  select id, event_id into v_ref from public.referral_links
    where upper(code) = upper(trim(p_code)) limit 1;
  if found then
    update public.referral_links set clicks_count = clicks_count + 1 where id = v_ref.id;
    return 'referral';
  end if;
  select id into v_aff from public.affiliate_profiles
    where upper(code) = upper(trim(p_code)) and status = 'approved' limit 1;
  if found then
    update public.affiliate_profiles set clicks_count = clicks_count + 1 where id = v_aff.id;
    return 'affiliate';
  end if;
  if exists (select 1 from public.promo_codes where upper(code) = upper(trim(p_code))) then
    return 'promo';
  end if;
  return null;
end;
$$;
grant execute on function public.track_marketing_click(text) to anon, authenticated;

-- Resolve a code to a destination for the /r and /a redirect routes.
create or replace function public.resolve_marketing_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref record;
  v_aff record;
  v_promo record;
begin
  select rl.id, rl.event_id, e.slug as event_slug, 'referral' as kind
    into v_ref
    from public.referral_links rl join public.events e on e.id = rl.event_id
    where upper(rl.code) = upper(trim(p_code)) and e.status = 'published' limit 1;
  if found then
    return jsonb_build_object('kind', 'referral', 'event_slug', v_ref.event_slug, 'id', v_ref.id);
  end if;
  select ap.id, ap.organizer_id, o.slug as organizer_slug, 'affiliate' as kind
    into v_aff
    from public.affiliate_profiles ap
    join public.organizers o on o.id = ap.organizer_id
    where upper(ap.code) = upper(trim(p_code)) and ap.status = 'approved' limit 1;
  if found then
    return jsonb_build_object(
      'kind', 'affiliate', 'id', v_aff.id,
      'organizer_slug', v_aff.organizer_slug
    );
  end if;
  select pc.id, pc.event_id, e.slug as event_slug, 'promo' as kind
    into v_promo
    from public.promo_codes pc left join public.events e on e.id = pc.event_id
    where upper(pc.code) = upper(trim(p_code)) and pc.status = 'active' limit 1;
  if found then
    return jsonb_build_object(
      'kind', 'promo', 'id', v_promo.id,
      'event_slug', coalesce(v_promo.event_slug, ''),
      'code', upper(trim(p_code))
    );
  end if;
  return null;
end;
$$;
grant execute on function public.resolve_marketing_code(text) to anon, authenticated;

-- Apply promo + attribution to a pending booking. Server-side only: called
-- from booking actions after reserve_booking, before payment intent.
create or replace function public.apply_booking_attribution(
  p_booking_id uuid,
  p_promo_code text default null,
  p_referral_code text default null,
  p_affiliate_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_promo public.promo_codes%rowtype;
  v_ref public.referral_links%rowtype;
  v_aff public.affiliate_profiles%rowtype;
  v_discount integer := 0;
  v_base integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_booking from public.bookings
    where id = p_booking_id for update;
  if not found then raise exception 'NOT_FOUND: booking'; end if;
  if v_booking.attendee_id <> auth.uid() and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_booking.status <> 'pending_payment' then
    raise exception 'INVALID_STATE: booking is not pending payment';
  end if;

  -- Promo code
  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo from public.promo_codes
      where upper(code) = upper(trim(p_promo_code))
        and status = 'active'
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now())
        and (event_id is null or event_id = v_booking.event_id)
        and (max_uses is null or used_count < max_uses)
      order by created_at desc limit 1;
    if not found then
      raise exception 'INVALID_PROMO: code is invalid or expired';
    end if;
    if v_booking.subtotal_xaf < v_promo.min_order_xaf then
      raise exception 'INVALID_PROMO: minimum order not met';
    end if;
    v_base := v_booking.subtotal_xaf;
    if v_promo.discount_type = 'percent' then
      v_discount := floor(v_base * v_promo.discount_value / 100.0);
    else
      v_discount := least(v_promo.discount_value, v_base);
    end if;
    v_discount := least(v_discount, v_base); -- never exceed subtotal
  end if;

  -- Referral attribution (must be a different user — anti self-referral)
  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select * into v_ref from public.referral_links
      where upper(code) = upper(trim(p_referral_code))
        and event_id = v_booking.event_id;
    if found then
      if v_ref.user_id = auth.uid() then
        raise exception 'INVALID_REFERRAL: self-referral is not allowed';
      end if;
    else
      v_ref.id := null;
    end if;
  end if;

  -- Affiliate attribution (approved only)
  if p_affiliate_code is not null and length(trim(p_affiliate_code)) > 0 then
    select * into v_aff from public.affiliate_profiles
      where upper(code) = upper(trim(p_affiliate_code)) and status = 'approved';
    if not found then v_aff.id := null; end if;
  end if;

  update public.bookings set
    discount_xaf = v_discount,
    promo_code_id = v_promo.id,
    referral_link_id = v_ref.id,
    affiliate_id = v_aff.id,
    total_xaf = subtotal_xaf + service_fee_xaf - v_discount,
    updated_at = now()
  where id = p_booking_id;

  if v_promo.id is not null then
    insert into public.promo_redemptions (promo_code_id, booking_id, discount_xaf)
    values (v_promo.id, p_booking_id, v_discount);
    update public.promo_codes set used_count = used_count + 1 where id = v_promo.id;
  end if;

  return jsonb_build_object(
    'discount_xaf', v_discount,
    'promo_code', v_promo.code,
    'total_xaf', v_booking.subtotal_xaf + v_booking.service_fee_xaf - v_discount
  );
end;
$$;
grant execute on function public.apply_booking_attribution(uuid, text, text, text)
  to authenticated;

-- Grant referral rewards + affiliate commissions when a booking confirms.
-- Idempotent via unique(booking_id, ...) constraints.
create or replace function public.grant_marketing_rewards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_org record;
  v_ref_check record;
  v_aff_check record;
  v_reward_xaf integer;
begin
  if new.status <> 'confirmed' or old.status = 'confirmed' then
    return new;
  end if;

  select organizer_id into v_event from public.events where id = new.event_id;
  select * into v_org from public.organizers where id = v_event.organizer_id;

  -- Referral reward (referrer earns; buyer discount handled by promo)
  if v_org.referral_enabled and new.referral_link_id is not null then
    select * into v_ref_check from public.referral_links where id = new.referral_link_id;
    if found and v_ref_check.user_id <> new.attendee_id then
      if v_org.referral_reward_type = 'fixed' then
        v_reward_xaf := v_org.referral_reward_value;
      elsif v_org.referral_reward_type = 'percent' then
        v_reward_xaf := floor(new.subtotal_xaf * v_org.referral_reward_value / 100.0);
      else
        v_reward_xaf := 0; -- voucher/points handled off-platform for now
      end if;
      insert into public.referral_rewards
        (referral_link_id, booking_id, reward_type, reward_value, reward_xaf)
      values
        (new.referral_link_id, new.id, v_org.referral_reward_type,
         v_org.referral_reward_value, v_reward_xaf)
      on conflict (booking_id, referral_link_id) do nothing;
      update public.referral_links
        set conversions_count = conversions_count + 1
        where id = new.referral_link_id;
    end if;
  end if;

  -- Affiliate commission
  if new.affiliate_id is not null then
    declare
      v_comm_xaf integer;
    begin
      select * into v_aff_check from public.affiliate_profiles where id = new.affiliate_id;
      if found and v_aff_check.status = 'approved' then
        if v_org.affiliate_commission_type = 'percent' then
          v_comm_xaf := floor(new.subtotal_xaf * v_org.affiliate_commission_value / 100.0);
        else
          v_comm_xaf := v_org.affiliate_commission_value;
        end if;
        insert into public.affiliate_commissions
          (affiliate_id, booking_id, commission_type, commission_value, commission_xaf)
        values
          (new.affiliate_id, new.id, v_org.affiliate_commission_type,
           v_org.affiliate_commission_value, v_comm_xaf)
        on conflict (booking_id, affiliate_id) do nothing;
        update public.affiliate_profiles
          set conversions_count = conversions_count + 1,
              total_earnings_xaf = total_earnings_xaf + v_comm_xaf
          where id = new.affiliate_id;
      end if;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_marketing_rewards on public.bookings;
create trigger bookings_marketing_rewards
  after update on public.bookings
  for each row execute function public.grant_marketing_rewards();

-- Organizer affiliate approval RPC (status transitions audited).
create or replace function public.set_affiliate_status(
  p_affiliate_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_status not in ('approved', 'rejected', 'suspended') then
    raise exception 'INVALID_INPUT: bad status';
  end if;
  update public.affiliate_profiles ap
  set status = p_status, updated_at = now()
  where ap.id = p_affiliate_id
    and ap.organizer_id in (
      select id from public.organizers where owner_id = auth.uid()
    );
  if not found then raise exception 'NOT_FOUND: affiliate'; end if;
end;
$$;
grant execute on function public.set_affiliate_status(uuid, text) to authenticated;
