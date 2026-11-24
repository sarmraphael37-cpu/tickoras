-- ============================================================================
-- TICKORA · 003 · Trusted server-side functions
-- All privileged functions use SECURITY DEFINER with a fixed search_path.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Context helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_privileged_context()
returns boolean
language sql
stable
as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin');
$$;

create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1 from public.user_roles
      where user_id = p_user and role = 'admin'
    ),
    false
  );
$$;

create or replace function public.has_role(p_role public.app_role, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1 from public.user_roles
      where user_id = p_user and role = p_role
    ),
    false
  );
$$;

create or replace function public.is_organizer_owner(p_organizer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1 from public.organizers
      where id = p_organizer_id and owner_id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.current_organizer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.organizers where owner_id = auth.uid() limit 1;
$$;

create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or exists (
      select 1
      from public.events e
      join public.organizers o on o.id = e.organizer_id
      where e.id = p_event_id and o.owner_id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.can_scan_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or exists (
      select 1
      from public.events e
      join public.organizers o on o.id = e.organizer_id
      where e.id = p_event_id and o.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.event_staff s
      where s.event_id = p_event_id and s.user_id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.platform_setting_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select nullif(value #>> '{}', '')::numeric from public.platform_settings where key = p_key),
    p_default
  );
$$;

create or replace function public.platform_setting_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
       when jsonb_typeof(value) = 'boolean' then value::boolean
       when value #>> '{}' in ('true', '1', 'yes') then true
       when value #>> '{}' in ('false', '0', 'no') then false
       else p_default
     end
     from public.platform_settings where key = p_key),
    p_default
  );
$$;

create or replace function public.calculate_service_fee(p_subtotal integer)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_percent numeric;
  v_min numeric;
  v_fee integer;
begin
  if p_subtotal is null or p_subtotal <= 0 then
    return 0;
  end if;
  v_percent := public.platform_setting_numeric('service_fee_percent', 5);
  v_min := public.platform_setting_numeric('min_service_fee', 200);
  v_fee := ceil(p_subtotal * v_percent / 100.0)::integer;
  return greatest(v_fee, v_min::integer);
end;
$$;

-- ---------------------------------------------------------------------------
-- Account provisioning: never trusts account_type for admin access.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text;
  v_full_name text;
  v_phone text;
  v_org_name text;
  v_slug text;
  v_role public.app_role;
begin
  v_account_type := coalesce(new.raw_user_meta_data ->> 'account_type', 'attendee');
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1));
  v_phone := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  v_org_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');

  insert into public.profiles (id, full_name, email, phone)
  values (new.id, v_full_name, coalesce(new.email, ''), v_phone)
  on conflict (id) do nothing;

  -- Every account can attend events.
  insert into public.user_roles (user_id, role)
  values (new.id, 'attendee')
  on conflict (user_id, role) do nothing;

  if v_account_type = 'organizer' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'organizer')
    on conflict (user_id, role) do nothing;

    v_slug := trim(both '-' from regexp_replace(lower(coalesce(v_org_name, v_full_name, 'organizer')), '[^a-z0-9]+', '-', 'g'));
    if v_slug = '' then v_slug := 'organizer'; end if;
    v_slug := left(v_slug, 55) || '-' || substr(new.id::text, 1, 6);

    insert into public.organizers (owner_id, name, slug, email, phone, status)
    values (
      new.id,
      coalesce(v_org_name, v_full_name, 'New organizer'),
      v_slug,
      new.email,
      v_phone,
      'pending'
    )
    on conflict (owner_id) do nothing;
  end if;

  insert into public.notifications (user_id, type, title, body, href)
  values (
    new.id,
    'system',
    'Welcome to TICKORA',
    case when v_account_type = 'organizer'
      then 'Your organizer account is pending review. You can prepare event drafts in the meantime.'
      else 'Discover what is happening across Cameroon and keep your tickets in one place.'
    end,
    case when v_account_type = 'organizer' then '/organizer' else '/events' end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Protection triggers: owners cannot self-approve or escalate profiles.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_privileged_context() and not public.is_admin() then
    if new.is_suspended is distinct from old.is_suspended then
      raise exception 'NOT_AUTHORIZED: suspension can only be changed by an administrator';
    end if;
    if new.email is distinct from old.email then
      raise exception 'NOT_AUTHORIZED: email is managed by authentication';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.protect_organizer_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_privileged_context() and not public.is_admin() then
    if new.status is distinct from old.status
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by
       or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'NOT_AUTHORIZED: organizer approval is managed by TICKORA';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_organizer_approval on public.organizers;
create trigger protect_organizer_approval
  before update on public.organizers
  for each row execute function public.protect_organizer_approval();

create or replace function public.protect_event_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_privileged_context() and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.status <> 'draft' then
        raise exception 'NOT_AUTHORIZED: new events must start as drafts';
      end if;
    else
      if new.status is distinct from old.status
         or new.approved_at is distinct from old.approved_at
         or new.approved_by is distinct from old.approved_by
         or new.published_at is distinct from old.published_at
         or new.is_featured is distinct from old.is_featured
         or new.rejection_reason is distinct from old.rejection_reason then
        raise exception 'NOT_AUTHORIZED: publication is managed through approval';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_event_approval on public.events;
create trigger protect_event_approval
  before insert or update on public.events
  for each row execute function public.protect_event_approval();

-- ---------------------------------------------------------------------------
-- Reservation expiry (callable by app/cron; safe for authenticated users)
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_bookings(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_count integer := 0;
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 1000));
begin
  for v_booking in
    select id
    from public.bookings
    where status = 'pending_payment'
      and reservation_expires_at < now()
    order by reservation_expires_at
    limit v_limit
    for update skip locked
  loop
    with released as (
      update public.inventory_reservations
      set status = 'released', released_at = now()
      where booking_id = v_booking.id and status = 'active'
      returning ticket_type_id, quantity
    )
    update public.ticket_types tt
    set quantity_reserved = greatest(0, tt.quantity_reserved - r.qty)
    from (
      select ticket_type_id, sum(quantity)::integer as qty
      from released
      group by ticket_type_id
    ) r
    where tt.id = r.ticket_type_id;

    update public.bookings
    set status = 'expired'
    where id = v_booking.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Transactional booking reservation
-- ---------------------------------------------------------------------------
create or replace function public.reserve_booking(
  p_event_id uuid,
  p_items jsonb,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text default '',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_tt public.ticket_types%rowtype;
  v_existing public.bookings%rowtype;
  v_item record;
  v_subtotal integer := 0;
  v_fee integer := 0;
  v_total_qty integer := 0;
  v_booking_id uuid;
  v_reference text;
  v_expires timestamptz;
  v_existing_payment public.payments%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform public.expire_stale_bookings(200);

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select * into v_existing
    from public.bookings
    where attendee_id = v_uid
      and client_idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return jsonb_build_object(
        'booking_id', v_existing.id,
        'reference', v_existing.reference,
        'status', v_existing.status,
        'expires_at', v_existing.reservation_expires_at,
        'subtotal_xaf', v_existing.subtotal_xaf,
        'service_fee_xaf', v_existing.service_fee_xaf,
        'total_xaf', v_existing.total_xaf,
        'reused', true
      );
    end if;
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.status <> 'published' then
    raise exception 'EVENT_NOT_AVAILABLE';
  end if;
  if v_event.end_at <= now() then
    raise exception 'EVENT_NOT_AVAILABLE: this event has ended';
  end if;
  if not exists (
    select 1 from public.organizers
    where id = v_event.organizer_id and status = 'approved'
  ) then
    raise exception 'EVENT_NOT_AVAILABLE: organizer is not approved';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ITEMS: select at least one ticket';
  end if;

  -- Validate and price every line while holding row locks. Locks are taken in
  -- ticket-type id order to keep concurrent bookings deadlock-free.
  for v_item in
    select
      (x ->> 'ticket_type_id')::uuid as ticket_type_id,
      sum((x ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) x
    group by 1
    order by 1
  loop
    if v_item.ticket_type_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'INVALID_ITEMS: invalid ticket quantity';
    end if;

    select * into v_tt
    from public.ticket_types
    where id = v_item.ticket_type_id and event_id = p_event_id
    for update;

    if not found then
      raise exception 'INVALID_ITEMS: ticket type does not belong to this event';
    end if;
    if not v_tt.is_active then
      raise exception 'SALES_CLOSED: this ticket tier is not on sale';
    end if;
    if v_tt.sales_start_at is not null and v_tt.sales_start_at > now() then
      raise exception 'SALES_CLOSED: sales have not started';
    end if;
    if v_tt.sales_end_at is not null and v_tt.sales_end_at < now() then
      raise exception 'SALES_ENDED: sales have ended';
    end if;
    if v_item.quantity < v_tt.min_per_order or v_item.quantity > v_tt.max_per_order then
      raise exception 'QUANTITY_LIMIT: quantity must be between % and %',
        v_tt.min_per_order, v_tt.max_per_order;
    end if;

    if (v_tt.quantity_total - v_tt.quantity_sold - v_tt.quantity_reserved) < v_item.quantity then
      raise exception 'INSUFFICIENT_INVENTORY: % is sold out for that quantity', v_tt.name;
    end if;

    v_total_qty := v_total_qty + v_item.quantity;
    v_subtotal := v_subtotal + (v_tt.price_xaf * v_item.quantity);
  end loop;

  if v_total_qty > 20 then
    raise exception 'QUANTITY_LIMIT: a maximum of 20 tickets is allowed per booking';
  end if;

  v_fee := public.calculate_service_fee(v_subtotal);
  v_expires := now() + make_interval(
    mins => (public.platform_setting_numeric('reservation_minutes', 15))::integer
  );

  insert into public.bookings (
    attendee_id, event_id, status, subtotal_xaf, service_fee_xaf, total_xaf,
    contact_name, contact_email, contact_phone, reservation_expires_at,
    client_idempotency_key
  )
  values (
    v_uid, p_event_id, 'pending_payment', v_subtotal, v_fee, v_subtotal + v_fee,
    coalesce(nullif(trim(p_contact_name), ''), 'Attendee'),
    coalesce(nullif(trim(p_contact_email), ''), ''),
    nullif(trim(p_contact_phone), ''),
    v_expires,
    nullif(trim(p_idempotency_key), '')
  )
  returning id, reference into v_booking_id, v_reference;

  for v_item in
    select
      (x ->> 'ticket_type_id')::uuid as ticket_type_id,
      sum((x ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) x
    group by 1
    order by 1
  loop
    select * into v_tt from public.ticket_types where id = v_item.ticket_type_id;

    insert into public.booking_items (
      booking_id, ticket_type_id, quantity, unit_price_xaf, line_total_xaf
    )
    values (
      v_booking_id, v_tt.id, v_item.quantity, v_tt.price_xaf,
      v_tt.price_xaf * v_item.quantity
    );

    insert into public.inventory_reservations (
      booking_id, ticket_type_id, quantity, status, expires_at
    )
    values (v_booking_id, v_tt.id, v_item.quantity, 'active', v_expires);

    update public.ticket_types
    set quantity_reserved = quantity_reserved + v_item.quantity
    where id = v_tt.id;
  end loop;

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'reference', v_reference,
    'status', 'pending_payment',
    'expires_at', v_expires,
    'subtotal_xaf', v_subtotal,
    'service_fee_xaf', v_fee,
    'total_xaf', v_subtotal + v_fee,
    'reused', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment intents and trusted confirmation
-- ---------------------------------------------------------------------------
create or replace function public.create_payment_intent(
  p_booking_id uuid,
  p_provider public.payment_provider
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_reference text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found or v_booking.attendee_id <> v_uid then
    raise exception 'NOT_AUTHORIZED: booking not found';
  end if;
  if v_booking.status = 'confirmed' then
    raise exception 'PAYMENT_ALREADY_COMPLETE';
  end if;
  if v_booking.status <> 'pending_payment' then
    raise exception 'BOOKING_NOT_PAYABLE';
  end if;
  if v_booking.reservation_expires_at is null or v_booking.reservation_expires_at < now() then
    perform public.expire_stale_bookings(1);
    raise exception 'BOOKING_EXPIRED';
  end if;

  if p_provider <> 'demo' then
    raise exception 'PROVIDER_NOT_CONFIGURED: this provider is not available yet';
  end if;
  if not public.platform_setting_bool('demo_payments_enabled', true) then
    raise exception 'PROVIDER_NOT_CONFIGURED: demo payments are disabled';
  end if;

  select * into v_payment
  from public.payments
  where booking_id = p_booking_id
    and provider = p_provider
    and status in ('initiated', 'pending', 'requires_action')
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'payment_id', v_payment.id,
      'provider', v_payment.provider,
      'provider_reference', v_payment.provider_reference,
      'status', v_payment.status,
      'amount_xaf', v_payment.amount_xaf,
      'is_demo', v_payment.is_demo,
      'reused', true
    );
  end if;

  v_reference := 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.payments (
    booking_id, provider, status, amount_xaf, provider_reference,
    idempotency_key, is_demo, initiated_at
  )
  values (
    p_booking_id, p_provider, 'pending', v_booking.total_xaf, v_reference,
    p_booking_id::text || ':' || p_provider::text,
    p_provider = 'demo',
    now()
  )
  returning * into v_payment;

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'provider', v_payment.provider,
    'provider_reference', v_payment.provider_reference,
    'status', v_payment.status,
    'amount_xaf', v_payment.amount_xaf,
    'is_demo', v_payment.is_demo,
    'reused', false
  );
end;
$$;

create or replace function public._finalize_booking(p_booking_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings%rowtype;
  v_item record;
  v_tt public.ticket_types%rowtype;
  v_ticket_count integer := 0;
  v_existing_count integer := 0;
  v_i integer;
  v_event_title text;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'NOT_FOUND: booking';
  end if;

  if v_booking.status = 'confirmed' then
    select count(*) into v_existing_count from public.tickets where booking_id = p_booking_id;
    return v_existing_count;
  end if;

  if v_booking.status <> 'pending_payment' then
    raise exception 'BOOKING_NOT_PAYABLE';
  end if;
  if v_booking.reservation_expires_at is null or v_booking.reservation_expires_at < now() then
    raise exception 'BOOKING_EXPIRED';
  end if;

  select title into v_event_title from public.events where id = v_booking.event_id;

  for v_item in
    select * from public.booking_items where booking_id = p_booking_id order by ticket_type_id
  loop
    select * into v_tt from public.ticket_types where id = v_item.ticket_type_id for update;
    if not found then
      raise exception 'INVALID_STATE: ticket tier missing';
    end if;
    if v_tt.quantity_reserved < v_item.quantity then
      raise exception 'INVALID_STATE: reservation is inconsistent';
    end if;

    update public.ticket_types
    set quantity_reserved = quantity_reserved - v_item.quantity,
        quantity_sold = quantity_sold + v_item.quantity
    where id = v_tt.id;

    update public.inventory_reservations
    set status = 'consumed'
    where booking_id = p_booking_id
      and ticket_type_id = v_tt.id
      and status = 'active';

    for v_i in 1..v_item.quantity loop
      insert into public.tickets (
        booking_id, event_id, ticket_type_id, attendee_id, attendee_name
      )
      values (
        p_booking_id, v_booking.event_id, v_tt.id, v_booking.attendee_id,
        v_booking.contact_name
      );
      v_ticket_count := v_ticket_count + 1;
    end loop;
  end loop;

  update public.bookings
  set status = 'confirmed', confirmed_at = now()
  where id = p_booking_id;

  insert into public.notifications (user_id, type, title, body, href)
  values (
    v_booking.attendee_id,
    'booking',
    'You''re in — tickets confirmed',
    format('Your booking %s for %s is confirmed. Your tickets are ready.', v_booking.reference, v_event_title),
    '/attendee/tickets'
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_booking.attendee_id,
    'booking.confirmed',
    'booking',
    p_booking_id,
    jsonb_build_object('reference', v_booking.reference, 'tickets', v_ticket_count)
  );

  return v_ticket_count;
end;
$$;

create or replace function public.confirm_demo_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_tickets integer := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'NOT_AUTHORIZED: payment not found';
  end if;

  select * into v_booking from public.bookings where id = v_payment.booking_id for update;
  if not found or v_booking.attendee_id <> v_uid then
    raise exception 'NOT_AUTHORIZED: payment does not belong to you';
  end if;

  if v_payment.provider <> 'demo' or not v_payment.is_demo then
    raise exception 'NOT_AUTHORIZED: only demo payments can be confirmed here';
  end if;

  if v_payment.status = 'succeeded' then
    select count(*) into v_tickets from public.tickets where booking_id = v_booking.id;
    return jsonb_build_object(
      'success', true,
      'booking_id', v_booking.id,
      'reference', v_booking.reference,
      'tickets', v_tickets,
      'is_demo', true,
      'already_processed', true
    );
  end if;

  if v_payment.status not in ('initiated', 'pending', 'requires_action') then
    raise exception 'INVALID_STATE: this payment cannot be confirmed';
  end if;

  v_tickets := public._finalize_booking(v_booking.id);

  update public.payments
  set status = 'succeeded', verified_at = now(),
      metadata = metadata || jsonb_build_object('confirmation', 'demo_server_rpc')
  where id = p_payment_id;

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'reference', v_booking.reference,
    'tickets', v_tickets,
    'is_demo', true,
    'already_processed', false
  );
end;
$$;

-- Service-role only. A real webhook handler must verify signatures first.
create or replace function public.process_verified_payment(
  p_payment_id uuid,
  p_provider_reference text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_tickets integer := 0;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'NOT_FOUND: payment';
  end if;
  if v_payment.status = 'succeeded' then
    return jsonb_build_object('success', true, 'already_processed', true);
  end if;

  select * into v_booking from public.bookings where id = v_payment.booking_id for update;
  if v_booking.status = 'confirmed' then
    update public.payments
    set status = 'succeeded', verified_at = coalesce(verified_at, now())
    where id = p_payment_id;
    return jsonb_build_object('success', true, 'already_processed', true);
  end if;

  if v_booking.status <> 'pending_payment'
     or v_booking.reservation_expires_at is null
     or v_booking.reservation_expires_at < now() then
    update public.payments
    set status = 'requires_action',
        failure_reason = 'Payment arrived after the reservation expired. Manual review/refund required.',
        metadata = metadata || jsonb_build_object('provider_payload', p_payload)
    where id = p_payment_id;
    return jsonb_build_object('success', false, 'reason', 'BOOKING_EXPIRED');
  end if;

  v_tickets := public._finalize_booking(v_booking.id);

  update public.payments
  set status = 'succeeded',
      verified_at = now(),
      provider_reference = coalesce(p_provider_reference, provider_reference),
      metadata = metadata || jsonb_build_object('provider_payload', p_payload)
  where id = p_payment_id;

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'tickets', v_tickets
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancellation, QR retrieval and atomic check-in
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or (v_booking.attendee_id <> v_uid and not public.is_admin()) then
    raise exception 'NOT_AUTHORIZED: booking not found';
  end if;

  if v_booking.status = 'pending_payment' then
    with released as (
      update public.inventory_reservations
      set status = 'released', released_at = now()
      where booking_id = p_booking_id and status = 'active'
      returning ticket_type_id, quantity
    )
    update public.ticket_types tt
    set quantity_reserved = greatest(0, tt.quantity_reserved - r.qty)
    from (
      select ticket_type_id, sum(quantity)::integer as qty
      from released group by ticket_type_id
    ) r
    where tt.id = r.ticket_type_id;

    update public.bookings
    set status = 'cancelled', cancelled_at = now()
    where id = p_booking_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (v_uid, 'booking.cancelled', 'booking', p_booking_id,
      jsonb_build_object('reference', v_booking.reference));

    return jsonb_build_object('success', true, 'status', 'cancelled');
  end if;

  if v_booking.status = 'confirmed' then
    raise exception 'INVALID_STATE: confirmed bookings require a refund request';
  end if;

  raise exception 'INVALID_STATE: this booking can no longer be cancelled';
end;
$$;

create or replace function public.get_my_ticket_qr(p_ticket_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select qr_token into v_token
  from public.tickets
  where id = p_ticket_id
    and (attendee_id = v_uid or public.is_admin());

  if v_token is null then
    raise exception 'NOT_AUTHORIZED: ticket not found';
  end if;
  return v_token;
end;
$$;

create or replace function public.check_in_ticket(
  p_token text,
  p_event_id uuid default null,
  p_method text default 'qr'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
  v_staff_name text;
  v_check_in public.check_ins%rowtype;
  v_ticket_type text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('success', false, 'code', 'INVALID_TICKET',
      'message', 'This is not a valid TICKORA ticket.');
  end if;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select * into v_ticket
  from public.tickets
  where qr_token_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'code', 'INVALID_TICKET',
      'message', 'Ticket not found. Check that you are scanning a TICKORA QR code.');
  end if;

  if not public.can_scan_event(v_ticket.event_id) then
    raise exception 'CHECK_IN_NOT_AUTHORIZED: you are not assigned to this event';
  end if;

  if p_event_id is not null and p_event_id <> v_ticket.event_id then
    return jsonb_build_object('success', false, 'code', 'WRONG_EVENT',
      'message', 'This ticket belongs to a different event.');
  end if;

  select * into v_event from public.events where id = v_ticket.event_id;
  if v_event.status not in ('published', 'completed') then
    return jsonb_build_object('success', false, 'code', 'TICKET_NOT_VALID',
      'message', 'This event is not currently accepting check-ins.');
  end if;

  if v_ticket.status = 'used' then
    select * into v_check_in from public.check_ins where ticket_id = v_ticket.id;
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CHECKED_IN',
      'message', 'This ticket has already been used.',
      'checked_in_at', coalesce(v_check_in.scanned_at, v_ticket.checked_in_at),
      'event_title', v_event.title
    );
  end if;

  if v_ticket.status <> 'valid' then
    return jsonb_build_object('success', false, 'code', 'TICKET_NOT_VALID',
      'message', 'This ticket is no longer valid.',
      'event_title', v_event.title);
  end if;

  insert into public.check_ins (ticket_id, event_id, scanned_by, method)
  values (v_ticket.id, v_ticket.event_id, v_uid, case when p_method = 'manual' then 'manual' else 'qr' end)
  returning * into v_check_in;

  update public.tickets
  set status = 'used', checked_in_at = v_check_in.scanned_at
  where id = v_ticket.id;

  select name into v_ticket_type from public.ticket_types where id = v_ticket.ticket_type_id;
  select full_name into v_staff_name from public.profiles where id = v_uid;

  return jsonb_build_object(
    'success', true,
    'code', 'CHECKED_IN',
    'message', 'Check-in successful.',
    'ticket_reference', v_ticket.ticket_reference,
    'attendee_name', v_ticket.attendee_name,
    'ticket_type', v_ticket_type,
    'event_title', v_event.title,
    'checked_in_at', v_check_in.scanned_at,
    'scanned_by', coalesce(v_staff_name, 'Staff')
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'code', 'ALREADY_CHECKED_IN',
      'message', 'This ticket has already been used.');
end;
$$;

-- ---------------------------------------------------------------------------
-- Event draft saving and submission
-- ---------------------------------------------------------------------------
create or replace function public.make_event_slug(p_text text, p_ignore_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_i integer := 1;
begin
  v_base := trim(both '-' from regexp_replace(lower(coalesce(p_text, 'event')), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'event'; end if;
  v_base := left(v_base, 60);
  v_candidate := v_base;

  while exists (
    select 1 from public.events
    where slug = v_candidate and (p_ignore_id is null or id <> p_ignore_id)
  ) loop
    v_i := v_i + 1;
    v_candidate := v_base || '-' || v_i::text;
    if v_i > 50 then
      v_candidate := v_base || '-' || substr(gen_random_uuid()::text, 1, 6);
      exit;
    end if;
  end loop;

  return v_candidate;
end;
$$;

create or replace function public.save_event_draft(p_event jsonb, p_ticket_types jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event_id uuid;
  v_organizer_id uuid;
  v_existing public.events%rowtype;
  v_is_update boolean := false;
  v_title text;
  v_city text;
  v_start timestamptz;
  v_end timestamptz;
  v_tt jsonb;
  v_tt_row public.ticket_types%rowtype;
  v_tt_id uuid;
  v_tt_total integer;
  v_kept_ids uuid[] := '{}';
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  v_event_id := nullif(p_event ->> 'id', '')::uuid;
  v_organizer_id := nullif(p_event ->> 'organizer_id', '')::uuid;

  if v_event_id is not null then
    select * into v_existing from public.events where id = v_event_id for update;
    if not found then raise exception 'NOT_FOUND: event'; end if;
    if not public.is_organizer_owner(v_existing.organizer_id) and not public.is_admin() then
      raise exception 'NOT_AUTHORIZED';
    end if;
    if v_existing.status not in ('draft', 'rejected') then
      raise exception 'INVALID_STATE: only drafts or rejected events can be edited';
    end if;
    v_is_update := true;
    v_organizer_id := v_existing.organizer_id;
  end if;

  if v_organizer_id is null then
    raise exception 'NOT_AUTHORIZED: organizer is required';
  end if;
  if not public.is_organizer_owner(v_organizer_id) and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED: organizer does not belong to you';
  end if;
  if not exists (
    select 1 from public.organizers
    where id = v_organizer_id and status in ('pending', 'approved')
  ) then
    raise exception 'ORGANIZER_NOT_APPROVED: your organizer account cannot edit events';
  end if;

  v_title := trim(coalesce(p_event ->> 'title', v_existing.title, ''));
  if length(v_title) < 3 then
    raise exception 'INVALID_EVENT: add an event title';
  end if;

  v_city := coalesce(nullif(p_event ->> 'city', ''), v_existing.city);
  if v_city not in ('Buea', 'Douala', 'Yaoundé', 'Limbe') then
    raise exception 'INVALID_EVENT: choose a supported city';
  end if;

  v_start := coalesce((p_event ->> 'start_at')::timestamptz, v_existing.start_at);
  v_end := coalesce((p_event ->> 'end_at')::timestamptz, v_existing.end_at);
  if v_start is null or v_end is null or v_end <= v_start then
    raise exception 'INVALID_EVENT: end time must be after start time';
  end if;

  if v_is_update then
    update public.events set
      category_id = coalesce(nullif(p_event ->> 'category_id', '')::uuid, v_existing.category_id),
      title = v_title,
      slug = case
        when nullif(p_event ->> 'slug', '') is null then v_existing.slug
        else public.make_event_slug(p_event ->> 'slug', v_event_id)
      end,
      description = coalesce(p_event ->> 'description', v_existing.description),
      short_description = left(coalesce(p_event ->> 'short_description', v_existing.short_description), 300),
      cover_image_url = coalesce(nullif(p_event ->> 'cover_image_url', ''), v_existing.cover_image_url),
      banner_image_url = coalesce(nullif(p_event ->> 'banner_image_url', ''), v_existing.banner_image_url),
      venue_name = coalesce(nullif(trim(p_event ->> 'venue_name'), ''), v_existing.venue_name),
      address = coalesce(nullif(p_event ->> 'address', ''), v_existing.address),
      city = v_city,
      start_at = v_start,
      end_at = v_end,
      status = 'draft',
      rejection_reason = null,
      updated_at = now()
    where id = v_event_id;
  else
    insert into public.events (
      organizer_id, category_id, title, slug, description, short_description,
      cover_image_url, banner_image_url, venue_name, address, city,
      start_at, end_at, status, created_by
    )
    values (
      v_organizer_id,
      nullif(p_event ->> 'category_id', '')::uuid,
      v_title,
      public.make_event_slug(coalesce(nullif(p_event ->> 'slug', ''), v_title)),
      coalesce(p_event ->> 'description', ''),
      left(coalesce(p_event ->> 'short_description', ''), 300),
      nullif(p_event ->> 'cover_image_url', ''),
      nullif(p_event ->> 'banner_image_url', ''),
      coalesce(p_event ->> 'venue_name', ''),
      nullif(p_event ->> 'address', ''),
      v_city,
      v_start, v_end, 'draft', v_uid
    )
    returning id into v_event_id;
  end if;

  if p_ticket_types is not null and jsonb_typeof(p_ticket_types) = 'array' then
    for v_tt in select * from jsonb_array_elements(p_ticket_types) loop
      v_count := v_count + 1;
      if v_count > 20 then
        raise exception 'INVALID_EVENT: too many ticket tiers';
      end if;

      v_tt_total := coalesce((v_tt ->> 'quantity_total')::integer, 0);
      v_tt_id := nullif(v_tt ->> 'id', '')::uuid;

      if v_tt_id is not null then
        select * into v_tt_row
        from public.ticket_types
        where id = v_tt_id and event_id = v_event_id
        for update;
        if found then
          if v_tt_total < v_tt_row.quantity_sold + v_tt_row.quantity_reserved then
            raise exception 'INVALID_EVENT: quantity cannot be lower than tickets already sold or reserved';
          end if;
          update public.ticket_types set
            name = coalesce(nullif(trim(v_tt ->> 'name'), ''), v_tt_row.name),
            description = nullif(v_tt ->> 'description', ''),
            price_xaf = coalesce((v_tt ->> 'price_xaf')::integer, v_tt_row.price_xaf),
            quantity_total = v_tt_total,
            min_per_order = coalesce((v_tt ->> 'min_per_order')::integer, v_tt_row.min_per_order),
            max_per_order = coalesce((v_tt ->> 'max_per_order')::integer, v_tt_row.max_per_order),
            sales_start_at = nullif(v_tt ->> 'sales_start_at', '')::timestamptz,
            sales_end_at = nullif(v_tt ->> 'sales_end_at', '')::timestamptz,
            is_active = coalesce((v_tt ->> 'is_active')::boolean, v_tt_row.is_active),
            sort_order = coalesce((v_tt ->> 'sort_order')::integer, v_tt_row.sort_order)
          where id = v_tt_id;
          v_kept_ids := array_append(v_kept_ids, v_tt_id);
          continue;
        end if;
      end if;

      insert into public.ticket_types (
        event_id, name, description, price_xaf, quantity_total,
        min_per_order, max_per_order, sales_start_at, sales_end_at,
        is_active, sort_order
      )
      values (
        v_event_id,
        coalesce(nullif(trim(v_tt ->> 'name'), ''), 'Regular'),
        nullif(v_tt ->> 'description', ''),
        coalesce((v_tt ->> 'price_xaf')::integer, 0),
        greatest(v_tt_total, 1),
        coalesce((v_tt ->> 'min_per_order')::integer, 1),
        coalesce((v_tt ->> 'max_per_order')::integer, 8),
        nullif(v_tt ->> 'sales_start_at', '')::timestamptz,
        nullif(v_tt ->> 'sales_end_at', '')::timestamptz,
        coalesce((v_tt ->> 'is_active')::boolean, true),
        coalesce((v_tt ->> 'sort_order')::integer, v_count)
      )
      returning id into v_tt_id;
      v_kept_ids := array_append(v_kept_ids, v_tt_id);
    end loop;

    update public.ticket_types
    set is_active = false
    where event_id = v_event_id
      and not (id = any(v_kept_ids))
      and quantity_sold = 0;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_uid, 'event.saved', 'event', v_event_id,
    jsonb_build_object('title', v_title, 'status', 'draft'));

  return v_event_id;
end;
$$;

create or replace function public.submit_event_for_approval(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_organizer public.organizers%rowtype;
  v_active_tiers integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found or not public.is_organizer_owner(v_event.organizer_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_event.status not in ('draft', 'rejected') then
    raise exception 'INVALID_STATE: this event cannot be submitted';
  end if;

  select * into v_organizer from public.organizers where id = v_event.organizer_id;
  if v_organizer.status <> 'approved' then
    raise exception 'ORGANIZER_NOT_APPROVED: your organizer account must be approved before submitting events';
  end if;

  if v_event.start_at <= now() then
    raise exception 'INVALID_EVENT: the event must start in the future';
  end if;
  if length(trim(v_event.venue_name)) < 2 then
    raise exception 'INVALID_EVENT: add a venue';
  end if;

  select count(*) into v_active_tiers
  from public.ticket_types
  where event_id = p_event_id and is_active = true and quantity_total > quantity_sold + quantity_reserved;

  if v_active_tiers = 0 then
    raise exception 'INVALID_EVENT: add at least one ticket tier with available inventory';
  end if;

  update public.events
  set status = 'pending_approval',
      submitted_at = now(),
      rejection_reason = null
  where id = p_event_id;

  insert into public.notifications (user_id, type, title, body, href)
  select user_id, 'admin', 'Event awaiting approval', v_event.title, '/admin/approvals'
  from public.user_roles
  where role = 'admin';

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_uid, 'event.submitted', 'event', p_event_id,
    jsonb_build_object('title', v_event.title));

  return jsonb_build_object('success', true, 'status', 'pending_approval');
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff / scanners
-- ---------------------------------------------------------------------------
create or replace function public.add_event_staff_by_email(
  p_event_id uuid,
  p_email text,
  p_role text default 'scanner'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_event public.events%rowtype;
  v_role text := case when p_role = 'manager' then 'manager' else 'scanner' end;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_event(p_event_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then raise exception 'NOT_FOUND: event'; end if;

  select * into v_profile from public.profiles where lower(email) = lower(trim(p_email)) limit 1;
  if not found then
    raise exception 'USER_NOT_FOUND: no TICKORA account uses that email';
  end if;

  insert into public.event_staff (event_id, user_id, role, assigned_by)
  values (p_event_id, v_profile.id, v_role, v_uid)
  on conflict (event_id, user_id)
  do update set role = excluded.role, assigned_by = excluded.assigned_by;

  insert into public.user_roles (user_id, role)
  values (v_profile.id, 'scanner')
  on conflict (user_id, role) do nothing;

  insert into public.notifications (user_id, type, title, body, href)
  values (
    v_profile.id, 'staff', 'You are assigned to scan tickets',
    format('You have been assigned as %s for %s.', v_role, v_event.title),
    '/scanner'
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_uid, 'event.staff_added', 'event', p_event_id,
    jsonb_build_object('user_id', v_profile.id, 'role', v_role));

  return jsonb_build_object(
    'success', true,
    'user_id', v_profile.id,
    'name', v_profile.full_name,
    'role', v_role
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrator workflows
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_organizer(
  p_organizer_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_org public.organizers%rowtype;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED: administrator access required';
  end if;

  select * into v_org from public.organizers where id = p_organizer_id for update;
  if not found then raise exception 'NOT_FOUND: organizer'; end if;
  if v_org.owner_id = v_admin then
    raise exception 'NOT_AUTHORIZED: administrators cannot approve their own organizer account';
  end if;

  update public.organizers
  set status = case when p_approve then 'approved'::public.organizer_status else 'rejected'::public.organizer_status end,
      rejection_reason = case when p_approve then null else coalesce(p_reason, 'Application did not meet TICKORA requirements.') end,
      approved_at = case when p_approve then now() else null end,
      approved_by = case when p_approve then v_admin else null end
  where id = p_organizer_id
  returning * into v_org;

  insert into public.notifications (user_id, type, title, body, href)
  values (
    v_org.owner_id, 'organizer',
    case when p_approve then 'Organizer account approved' else 'Organizer application update' end,
    case when p_approve
      then 'Your organizer account is approved. You can submit events for review.'
      else format('Your organizer application was not approved. %s', coalesce(p_reason, ''))
    end,
    '/organizer'
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_admin, case when p_approve then 'organizer.approved' else 'organizer.rejected' end,
    'organizer', p_organizer_id, jsonb_build_object('reason', p_reason));

  return jsonb_build_object('success', true, 'status', v_org.status);
end;
$$;

create or replace function public.admin_review_event(
  p_event_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_event public.events%rowtype;
  v_owner uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED: administrator access required';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then raise exception 'NOT_FOUND: event'; end if;
  if v_event.status <> 'pending_approval' then
    raise exception 'INVALID_STATE: only events pending approval can be reviewed';
  end if;

  select owner_id into v_owner from public.organizers where id = v_event.organizer_id;
  if v_owner = v_admin then
    raise exception 'NOT_AUTHORIZED: you cannot approve your own event';
  end if;

  update public.events
  set status = case when p_approve then 'published'::public.event_status else 'rejected'::public.event_status end,
      rejection_reason = case when p_approve then null else coalesce(p_reason, 'Event did not meet TICKORA publishing standards.') end,
      published_at = case when p_approve then now() else null end,
      approved_at = case when p_approve then now() else null end,
      approved_by = case when p_approve then v_admin else null end
  where id = p_event_id
  returning * into v_event;

  insert into public.notifications (user_id, type, title, body, href)
  values (
    v_owner, 'event',
    case when p_approve then 'Event published' else 'Event needs changes' end,
    case when p_approve
      then format('%s is now live on TICKORA.', v_event.title)
      else format('%s was not approved. %s', v_event.title, coalesce(p_reason, ''))
    end,
    case when p_approve then '/organizer/events/' || p_event_id::text else '/organizer/events/' || p_event_id::text || '/edit' end
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_admin, case when p_approve then 'event.approved' else 'event.rejected' end,
    'event', p_event_id, jsonb_build_object('reason', p_reason));

  return jsonb_build_object('success', true, 'status', v_event.status);
end;
$$;

create or replace function public.admin_suspend_event(p_event_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_event public.events%rowtype;
  v_owner uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED: administrator access required';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'INVALID_STATE: provide a reason';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then raise exception 'NOT_FOUND: event'; end if;
  if v_event.status not in ('published', 'pending_approval') then
    raise exception 'INVALID_STATE: this event cannot be suspended';
  end if;

  update public.events
  set status = 'suspended', rejection_reason = p_reason
  where id = p_event_id;

  select owner_id into v_owner from public.organizers where id = v_event.organizer_id;

  insert into public.notifications (user_id, type, title, body, href)
  values (v_owner, 'event', 'Event suspended',
    format('%s has been suspended. Reason: %s', v_event.title, p_reason),
    '/organizer/events/' || p_event_id::text);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_admin, 'event.suspended', 'event', p_event_id, jsonb_build_object('reason', p_reason));

  return jsonb_build_object('success', true, 'status', 'suspended');
end;
$$;

create or replace function public.admin_review_refund(
  p_refund_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_refund public.refunds%rowtype;
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_item record;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED: administrator access required';
  end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then raise exception 'NOT_FOUND: refund'; end if;
  if v_refund.status <> 'requested' then
    raise exception 'INVALID_STATE: this refund has already been reviewed';
  end if;

  select * into v_payment from public.payments where id = v_refund.payment_id for update;
  select * into v_booking from public.bookings where id = v_refund.booking_id for update;

  if not p_approve then
    update public.refunds
    set status = 'rejected', reviewed_by = v_admin, admin_note = p_note
    where id = p_refund_id;

    insert into public.notifications (user_id, type, title, body, href)
    values (v_refund.requested_by, 'refund', 'Refund request declined',
      coalesce(p_note, 'Your refund request was reviewed and declined. Contact support if you need more detail.'),
      '/attendee/bookings/' || v_refund.booking_id::text);

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (v_admin, 'refund.rejected', 'refund', p_refund_id, jsonb_build_object('note', p_note));

    return jsonb_build_object('success', true, 'status', 'rejected');
  end if;

  if v_payment.is_demo then
    update public.tickets set status = 'refunded' where booking_id = v_booking.id and status in ('valid', 'used');
    for v_item in select * from public.booking_items where booking_id = v_booking.id loop
      update public.ticket_types
      set quantity_sold = greatest(0, quantity_sold - v_item.quantity)
      where id = v_item.ticket_type_id;
    end loop;

    update public.bookings set status = 'refunded', refunded_at = now() where id = v_booking.id;
    update public.payments set status = 'refunded', metadata = metadata || jsonb_build_object('refunded_at', now()) where id = v_payment.id;
    update public.refunds
    set status = 'processed', reviewed_by = v_admin, processed_at = now(), admin_note = p_note
    where id = p_refund_id;
  else
    -- Real money is never marked refunded without provider confirmation.
    update public.refunds
    set status = 'approved', reviewed_by = v_admin,
        admin_note = concat_ws(' ', p_note, 'Provider refund must be completed and reconciled before marking processed.')
    where id = p_refund_id;
  end if;

  insert into public.notifications (user_id, type, title, body, href)
  values (v_refund.requested_by, 'refund', 'Refund request approved',
    case when v_payment.is_demo
      then 'Your demo refund has been processed. No real money was involved.'
      else 'Your refund was approved and is being processed by the payment provider.'
    end,
    '/attendee/bookings/' || v_refund.booking_id::text);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_admin, 'refund.approved', 'refund', p_refund_id,
    jsonb_build_object('demo', v_payment.is_demo, 'provider', v_payment.provider));

  return jsonb_build_object(
    'success', true,
    'status', case when v_payment.is_demo then 'processed' else 'approved' end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Payouts
-- ---------------------------------------------------------------------------
create or replace function public.organizer_available_balance(p_organizer_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gross integer := 0;
  v_open_refunds integer := 0;
  v_committed integer := 0;
begin
  if not public.is_organizer_owner(p_organizer_id) and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select coalesce(sum(b.subtotal_xaf), 0) into v_gross
  from public.bookings b
  join public.events e on e.id = b.event_id
  where e.organizer_id = p_organizer_id and b.status = 'confirmed';

  select coalesce(sum(b.subtotal_xaf), 0) into v_open_refunds
  from public.refunds r
  join public.bookings b on b.id = r.booking_id
  join public.events e on e.id = b.event_id
  where e.organizer_id = p_organizer_id
    and r.status in ('requested', 'approved');

  select coalesce(sum(amount_xaf), 0) into v_committed
  from public.organizer_payouts
  where organizer_id = p_organizer_id
    and status in ('requested', 'approved', 'processing', 'paid');

  return greatest(0, v_gross - v_open_refunds - v_committed);
end;
$$;

create or replace function public.request_payout(
  p_organizer_id uuid,
  p_amount_xaf integer,
  p_method text,
  p_destination text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_payout_id uuid;
  v_available integer;
  v_minimum numeric;
  v_org public.organizers%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_organizer_owner(p_organizer_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_org from public.organizers where id = p_organizer_id;
  if v_org.status <> 'approved' then
    raise exception 'ORGANIZER_NOT_APPROVED';
  end if;
  if p_amount_xaf is null or p_amount_xaf <= 0 then
    raise exception 'INVALID_STATE: enter a valid amount';
  end if;
  if p_method not in ('mtn_momo', 'orange_money', 'bank_transfer') then
    raise exception 'INVALID_STATE: unsupported payout method';
  end if;

  v_minimum := public.platform_setting_numeric('payout_minimum', 10000);
  if p_amount_xaf < v_minimum then
    raise exception 'PAYOUT_BELOW_MINIMUM: minimum payout is % XAF', v_minimum::integer;
  end if;

  v_available := public.organizer_available_balance(p_organizer_id);
  if p_amount_xaf > v_available then
    raise exception 'PAYOUT_EXCEEDS_BALANCE: available balance is % XAF', v_available;
  end if;

  insert into public.organizer_payouts (
    organizer_id, amount_xaf, status, method, destination, requested_by
  )
  values (p_organizer_id, p_amount_xaf, 'requested', p_method, trim(p_destination), v_uid)
  returning id into v_payout_id;

  insert into public.notifications (user_id, type, title, body, href)
  select user_id, 'admin', 'Payout requested',
    format('%s requested a payout of %s XAF.', v_org.name, p_amount_xaf),
    '/admin/payouts'
  from public.user_roles where role = 'admin';

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_uid, 'payout.requested', 'payout', v_payout_id,
    jsonb_build_object('amount', p_amount_xaf, 'method', p_method));

  return v_payout_id;
end;
$$;

create or replace function public.admin_review_payout(
  p_payout_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_payout public.organizer_payouts%rowtype;
  v_owner uuid;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED: administrator access required';
  end if;
  if p_status not in ('approved', 'processing', 'paid', 'rejected') then
    raise exception 'INVALID_STATE: unsupported payout status';
  end if;

  select * into v_payout from public.organizer_payouts where id = p_payout_id for update;
  if not found then raise exception 'NOT_FOUND: payout'; end if;
  if v_payout.status in ('paid', 'rejected') then
    raise exception 'INVALID_STATE: this payout is already final';
  end if;

  update public.organizer_payouts
  set status = p_status::public.payout_status,
      reviewed_by = v_admin,
      admin_note = p_note,
      processed_at = case when p_status = 'paid' then now() else processed_at end
  where id = p_payout_id;

  select owner_id into v_owner from public.organizers where id = v_payout.organizer_id;

  insert into public.notifications (user_id, type, title, body, href)
  values (v_owner, 'payout', 'Payout status updated',
    format('Your payout of %s XAF is now %s.', v_payout.amount_xaf, p_status),
    '/organizer/payouts');

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_admin, 'payout.' || p_status, 'payout', p_payout_id,
    jsonb_build_object('note', p_note, 'amount', v_payout.amount_xaf));

  return jsonb_build_object('success', true, 'status', p_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- Public analytics
-- ---------------------------------------------------------------------------
create or replace function public.record_event_view(p_event_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.events
  set views_count = views_count + 1
  where id = p_event_id and status = 'published';
$$;
