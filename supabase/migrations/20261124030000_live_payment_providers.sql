-- Allow live payment providers to create pending payment intents.
-- Safety is unchanged: a pending payment can never confirm itself. Only the
-- service-role process_verified_payment RPC (called after provider-verified
-- status checks) can mark a payment succeeded and issue tickets.
-- The action layer and provider adapters still gate unconfigured providers.

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

  if p_provider = 'demo' and not public.platform_setting_bool('demo_payments_enabled', true) then
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

  -- Demo references keep the DEMO- prefix. Live providers get a bare UUID,
  -- which doubles as the provider transaction reference (e.g. MTN X-Reference-Id).
  v_reference := case
    when p_provider = 'demo'
      then 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
    else gen_random_uuid()::text
  end;

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
