-- ============================================================================
-- TICKORA Monetization: subscriptions, platform payments, featured promotions
-- ============================================================================

-- --------------------------------------------------------------------------
-- Subscription plans (admin-editable pricing & entitlements)
-- --------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('starter', 'professional', 'enterprise')),
  name text not null,
  price_xaf integer not null check (price_xaf >= 0),
  billing_months integer not null default 1 check (billing_months >= 1),
  features jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_subscription_plans on public.subscription_plans;
create trigger set_updated_at_subscription_plans
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

insert into public.subscription_plans (code, name, price_xaf, billing_months, features, sort_order)
values
  ('starter', 'Starter', 0, 1, '{"events":1,"digital_tickets":true,"qr_checkin":true,"basic_analytics":true,"marketing":false,"finance_reports":false,"ai_assistant":false,"multi_event":false,"custom_branding":false,"api_access":false,"priority_support":false}'::jsonb, 1),
  ('professional', 'Professional', 10000, 1, '{"events":5,"digital_tickets":true,"qr_checkin":true,"basic_analytics":true,"advanced_analytics":true,"marketing":true,"finance_reports":true,"ai_assistant":true,"multi_event":true,"custom_branding":false,"api_access":false,"priority_support":false}'::jsonb, 2),
  ('enterprise', 'Enterprise', 30000, 1, '{"events":-1,"digital_tickets":true,"qr_checkin":true,"basic_analytics":true,"advanced_analytics":true,"marketing":true,"finance_reports":true,"ai_assistant":true,"multi_event":true,"custom_branding":true,"api_access":true,"priority_support":true}'::jsonb, 3)
on conflict (code) do nothing;

-- --------------------------------------------------------------------------
-- Organizer subscriptions
-- --------------------------------------------------------------------------
create table if not exists public.organizer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists organizer_subscriptions_active_idx
  on public.organizer_subscriptions (organizer_id)
  where status in ('active', 'past_due');

drop trigger if exists set_updated_at_organizer_subscriptions on public.organizer_subscriptions;
create trigger set_updated_at_organizer_subscriptions
  before update on public.organizer_subscriptions
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- Platform payments (subscriptions + featured promotions)
-- --------------------------------------------------------------------------
create table if not exists public.platform_payments (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete cascade,
  kind text not null check (kind in ('subscription', 'featured')),
  plan_id uuid references public.subscription_plans (id) on delete set null,
  featured_promotion_id uuid,
  amount_xaf integer not null check (amount_xaf >= 0),
  currency text not null default 'XAF' check (currency = 'XAF'),
  provider public.payment_provider not null,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  provider_reference text,
  idempotency_key text not null unique,
  is_demo boolean not null default false,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  initiated_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists platform_payments_org_idx on public.platform_payments (organizer_id);
create index if not exists platform_payments_status_idx on public.platform_payments (status);

drop trigger if exists set_updated_at_platform_payments on public.platform_payments;
create trigger set_updated_at_platform_payments
  before update on public.platform_payments
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- Featured promotions
-- --------------------------------------------------------------------------
create table if not exists public.featured_promotions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  placement text not null default 'featured_badge'
    check (placement in ('homepage', 'sponsored', 'featured_badge')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  amount_xaf integer not null check (amount_xaf >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'cancelled', 'refunded')),
  platform_payment_id uuid references public.platform_payments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists featured_promotions_event_idx on public.featured_promotions (event_id, status);

drop trigger if exists set_updated_at_featured_promotions on public.featured_promotions;
create trigger set_updated_at_featured_promotions
  before update on public.featured_promotions
  for each row execute function public.set_updated_at();

-- Events: track when featured placement expires
alter table public.events
  add column if not exists featured_ends_at timestamptz;

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.subscription_plans enable row level security;
alter table public.organizer_subscriptions enable row level security;
alter table public.platform_payments enable row level security;
alter table public.featured_promotions enable row level security;

-- Plans: public read active
drop policy if exists "plans_public_read" on public.subscription_plans;
create policy "plans_public_read" on public.subscription_plans
  for select to anon, authenticated using (is_active);

-- Organizer sees own subscription + payments + promotions; admin sees all
drop policy if exists "subs_owner" on public.organizer_subscriptions;
create policy "subs_owner" on public.organizer_subscriptions
  for select to authenticated
  using (
    public.is_admin()
    or organizer_id in (select id from public.organizers where owner_id = auth.uid())
  );

drop policy if exists "platform_payments_owner" on public.platform_payments;
create policy "platform_payments_owner" on public.platform_payments
  for select to authenticated
  using (
    public.is_admin()
    or organizer_id in (select id from public.organizers where owner_id = auth.uid())
  );

drop policy if exists "featured_owner" on public.featured_promotions;
create policy "featured_owner" on public.featured_promotions
  for select to authenticated
  using (
    public.is_admin()
    or organizer_id in (select id from public.organizers where owner_id = auth.uid())
  );

grant select on public.subscription_plans to anon, authenticated;
grant select on public.organizer_subscriptions to authenticated;
grant select on public.platform_payments to authenticated;
grant select on public.featured_promotions to authenticated;
grant select, insert, update on public.subscription_plans to authenticated;

-- ===========================================================================
-- RPCs
-- ===========================================================================

-- Create a pending platform payment (subscription or featured promotion).
-- Caller must own the organizer.
create or replace function public.create_platform_payment(
  p_organizer_id uuid,
  p_kind text,
  p_amount_xaf integer,
  p_provider text,
  p_idempotency_key text,
  p_plan_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_payment_id uuid;
  v_existing public.platform_payments%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.organizers
    where id = p_organizer_id and owner_id = v_uid
  ) and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_kind not in ('subscription', 'featured') then
    raise exception 'INVALID_INPUT: kind';
  end if;
  if p_amount_xaf < 0 then raise exception 'INVALID_INPUT: amount'; end if;
  if p_provider not in ('demo', 'mtn_momo', 'orange_money', 'card') then
    raise exception 'INVALID_INPUT: provider';
  end if;

  -- Idempotent: return existing payment for the same key
  select * into v_existing from public.platform_payments
  where idempotency_key = p_idempotency_key;
  if found then return v_existing.id; end if;

  insert into public.platform_payments
    (organizer_id, kind, plan_id, amount_xaf, provider, idempotency_key,
     is_demo, metadata)
  values
    (p_organizer_id, p_kind, p_plan_id, p_amount_xaf, p_provider::public.payment_provider,
     p_idempotency_key, p_provider = 'demo', p_metadata)
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;
grant execute on function public.create_platform_payment(uuid, text, integer, text, text, uuid, jsonb)
  to authenticated;

-- Confirm a platform payment. Demo payments can be self-confirmed only when
-- the payment row is flagged is_demo; real providers require admin settlement.
create or replace function public.confirm_platform_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.platform_payments%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_sub_id uuid;
begin
  select * into v_pay from public.platform_payments where id = p_payment_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  -- Ownership or admin
  if v_pay.organizer_id not in (
      select id from public.organizers where owner_id = auth.uid()
    ) and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_pay.status = 'succeeded' then
    return jsonb_build_object('status', 'already_confirmed');
  end if;
  if v_pay.status <> 'pending' then
    raise exception 'INVALID_STATE';
  end if;

  -- Demo payments may be confirmed by the owner (demo mode only enforced
  -- server-side in the action layer via env flag).
  if v_pay.provider <> 'demo'::public.payment_provider then
    raise exception 'PROVIDER_PENDING: real provider confirmation required';
  end if;
  if not v_pay.is_demo then
    raise exception 'INVALID_STATE';
  end if;

  update public.platform_payments
  set status = 'succeeded', paid_at = now()
  where id = p_payment_id;

  if v_pay.kind = 'subscription' then
    select * into v_plan from public.subscription_plans where id = v_pay.plan_id;
    if not found then raise exception 'NOT_FOUND: plan'; end if;

    -- Expire/cancel any existing active subscription, then activate new
    update public.organizer_subscriptions
    set status = 'expired', updated_at = now()
    where organizer_id = v_pay.organizer_id and status in ('active', 'past_due');

    insert into public.organizer_subscriptions
      (organizer_id, plan_id, status, current_period_start, current_period_end)
    values (
      v_pay.organizer_id, v_pay.plan_id, 'active', now(),
      now() + (v_plan.billing_months || ' months')::interval
    )
    returning id into v_sub_id;

    return jsonb_build_object('status', 'activated', 'subscription_id', v_sub_id);
  else
    -- Featured promotion: activate the linked promotion row
    update public.featured_promotions
    set status = 'active',
        platform_payment_id = p_payment_id,
        starts_at = now(),
        ends_at = now() + interval '30 days'
    where id = (v_pay.metadata->>'featured_promotion_id')::uuid
       or platform_payment_id = p_payment_id;

    -- Also mark the event featured for the promo duration
    update public.events e
    set is_featured = true,
        featured_ends_at = now() + interval '30 days'
    where e.id in (
      select event_id from public.featured_promotions
      where platform_payment_id = p_payment_id
         or id = (v_pay.metadata->>'featured_promotion_id')::uuid
    );

    return jsonb_build_object('status', 'featured_activated');
  end if;
end;
$$;
grant execute on function public.confirm_platform_payment(uuid) to authenticated;

-- Admin: settle a real-provider platform payment after offline/provider
-- reconciliation. Marks succeeded and runs the same activation logic by
-- delegating to the shared activation path.
create or replace function public.admin_settle_platform_payment(
  p_payment_id uuid,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.platform_payments%rowtype;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  select * into v_pay from public.platform_payments where id = p_payment_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_pay.status <> 'pending' then
    return jsonb_build_object('status', 'already_' || v_pay.status);
  end if;

  update public.platform_payments
  set status = 'succeeded',
      paid_at = now(),
      provider_reference = coalesce(p_reference, provider_reference)
  where id = p_payment_id;

  -- Reuse activation logic by calling the internal path with admin context:
  -- temporarily perform the same updates inline.
  if v_pay.kind = 'subscription' then
    update public.organizer_subscriptions
    set status = 'expired', updated_at = now()
    where organizer_id = v_pay.organizer_id and status in ('active', 'past_due');

    insert into public.organizer_subscriptions
      (organizer_id, plan_id, status, current_period_start, current_period_end)
    select v_pay.organizer_id, p.id, 'active', now(),
           now() + (p.billing_months || ' months')::interval
    from public.subscription_plans p where p.id = v_pay.plan_id;
  else
    update public.featured_promotions
    set status = 'active', platform_payment_id = p_payment_id,
        starts_at = now(), ends_at = now() + interval '30 days'
    where id = (v_pay.metadata->>'featured_promotion_id')::uuid;

    update public.events e
    set is_featured = true, featured_ends_at = now() + interval '30 days'
    where e.id = (
      select event_id from public.featured_promotions
      where id = (v_pay.metadata->>'featured_promotion_id')::uuid
    );
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'platform_payment_settled', 'platform_payment', p_payment_id,
    jsonb_build_object('kind', v_pay.kind, 'amount_xaf', v_pay.amount_xaf,
                       'reference', p_reference)
  );

  return jsonb_build_object('status', 'settled');
end;
$$;
grant execute on function public.admin_settle_platform_payment(uuid, text) to authenticated;

-- Organizer: cancel subscription at period end (never deletes data)
create or replace function public.cancel_subscription(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.organizer_subscriptions
  set cancel_at_period_end = true, updated_at = now()
  where id = p_subscription_id
    and organizer_id in (
      select id from public.organizers where owner_id = auth.uid()
    )
    and status = 'active';
  if not found then raise exception 'NOT_FOUND'; end if;
end;
$$;
grant execute on function public.cancel_subscription(uuid) to authenticated;

-- Admin: update plan pricing
create or replace function public.admin_update_plan(
  p_plan_id uuid,
  p_price_xaf integer,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_price_xaf < 0 then raise exception 'INVALID_INPUT'; end if;
  update public.subscription_plans
  set price_xaf = p_price_xaf,
      is_active = coalesce(p_is_active, is_active)
  where id = p_plan_id;
end;
$$;
grant execute on function public.admin_update_plan(uuid, integer, boolean) to authenticated;
