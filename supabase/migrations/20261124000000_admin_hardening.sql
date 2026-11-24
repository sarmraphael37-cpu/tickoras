-- ============================================================================
-- TICKORA · 006 · Administrator hardening
--
-- 1. admin_log_action        audited writes for admin operations that do not go
--                            through a dedicated review RPC (roles, suspension,
--                            categories, settings, messages, organizer status).
-- 2. admin_settle_refund     records a verified provider/manual refund for an
--                            approved refund request and performs the same
--                            inventory/payment bookkeeping as a demo refund.
-- 3. categories.image_url    optional category artwork.
-- 4. category-media bucket   admin-only uploads for category artwork.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Audit helper for administrative writes
-- ---------------------------------------------------------------------------
create or replace function public.admin_log_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED: administrator access required';
  end if;
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'INVALID_STATE: action is required';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.admin_log_action(text, text, uuid, jsonb) from public, anon;
grant execute on function public.admin_log_action(text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Settle an approved refund after the provider/manual transfer is verified
-- ---------------------------------------------------------------------------
create or replace function public.admin_settle_refund(
  p_refund_id uuid,
  p_reference text default null,
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
  if v_refund.status <> 'approved' then
    raise exception 'INVALID_STATE: only approved refunds can be settled';
  end if;

  select * into v_payment from public.payments where id = v_refund.payment_id for update;
  select * into v_booking from public.bookings where id = v_refund.booking_id for update;

  update public.tickets set status = 'refunded' where booking_id = v_booking.id and status in ('valid', 'used');
  for v_item in select * from public.booking_items where booking_id = v_booking.id loop
    update public.ticket_types
    set quantity_sold = greatest(0, quantity_sold - v_item.quantity)
    where id = v_item.ticket_type_id;
  end loop;

  update public.bookings set status = 'refunded', refunded_at = now() where id = v_booking.id;
  update public.payments
  set status = 'refunded',
      metadata = metadata || jsonb_build_object(
        'refunded_at', now(),
        'refund_reference', nullif(trim(coalesce(p_reference, '')), '')
      )
  where id = v_payment.id;

  update public.refunds
  set status = 'processed',
      reviewed_by = v_admin,
      processed_at = now(),
      provider_reference = nullif(trim(coalesce(p_reference, '')), ''),
      admin_note = concat_ws(' ', p_note, 'Settled after provider/manual refund verification.')
  where id = p_refund_id;

  insert into public.notifications (user_id, type, title, body, href)
  values (v_refund.requested_by, 'refund', 'Refund completed',
    'Your refund has been completed and the funds returned.',
    '/attendee/bookings/' || v_refund.booking_id::text);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_admin, 'refund.settled', 'refund', p_refund_id,
    jsonb_build_object(
      'reference', p_reference,
      'note', p_note,
      'provider', v_payment.provider,
      'amount_xaf', v_refund.amount_xaf
    ));

  return jsonb_build_object('success', true, 'status', 'processed');
end;
$$;

revoke all on function public.admin_settle_refund(uuid, text, text) from public, anon;
grant execute on function public.admin_settle_refund(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Category artwork
-- ---------------------------------------------------------------------------
alter table public.categories
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-media',
  'category-media',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "category_media_public_read" on storage.objects;
create policy "category_media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'category-media');

drop policy if exists "category_media_admin_insert" on storage.objects;
create policy "category_media_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'category-media' and public.is_admin());

drop policy if exists "category_media_admin_update" on storage.objects;
create policy "category_media_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'category-media' and public.is_admin())
  with check (bucket_id = 'category-media' and public.is_admin());

drop policy if exists "category_media_admin_delete" on storage.objects;
create policy "category_media_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'category-media' and public.is_admin());
