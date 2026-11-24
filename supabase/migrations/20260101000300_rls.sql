-- ============================================================================
-- TICKORA · 004 · Row Level Security, privileges and read models
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizers enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.refunds enable row level security;
alter table public.tickets enable row level security;
alter table public.event_staff enable row level security;
alter table public.check_ins enable row level security;
alter table public.notifications enable row level security;
alter table public.organizer_payouts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "profiles_select_organizer_attendees" on public.profiles;
create policy "profiles_select_organizer_attendees" on public.profiles
  for select to authenticated using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      join public.organizers o on o.id = e.organizer_id
      where b.attendee_id = profiles.id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "profiles_select_event_staff_manager" on public.profiles;
create policy "profiles_select_event_staff_manager" on public.profiles
  for select to authenticated using (
    exists (
      select 1
      from public.event_staff s
      join public.events e on e.id = s.event_id
      join public.organizers o on o.id = e.organizer_id
      where s.user_id = profiles.id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Roles (authoritative source of authorization)
-- ---------------------------------------------------------------------------
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "user_roles_select_admin" on public.user_roles;
create policy "user_roles_select_admin" on public.user_roles
  for select to authenticated using (public.is_admin());

drop policy if exists "user_roles_manage_admin" on public.user_roles;
create policy "user_roles_manage_admin" on public.user_roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Organizers
-- ---------------------------------------------------------------------------
drop policy if exists "organizers_public_read" on public.organizers;
create policy "organizers_public_read" on public.organizers
  for select to anon, authenticated using (status = 'approved');

drop policy if exists "organizers_owner_read" on public.organizers;
create policy "organizers_owner_read" on public.organizers
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "organizers_admin_read" on public.organizers;
create policy "organizers_admin_read" on public.organizers
  for select to authenticated using (public.is_admin());

drop policy if exists "organizers_owner_insert" on public.organizers;
create policy "organizers_owner_insert" on public.organizers
  for insert to authenticated
  with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists "organizers_owner_update" on public.organizers;
create policy "organizers_owner_update" on public.organizers
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "organizers_admin_update" on public.organizers;
create policy "organizers_admin_update" on public.organizers
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (is_active = true);

drop policy if exists "categories_admin_read" on public.categories;
create policy "categories_admin_read" on public.categories
  for select to authenticated using (public.is_admin());

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete" on public.categories
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
  for select to anon, authenticated using (status = 'published');

drop policy if exists "events_owner_read" on public.events;
create policy "events_owner_read" on public.events
  for select to authenticated using (
    exists (
      select 1 from public.organizers o
      where o.id = events.organizer_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "events_staff_read" on public.events;
create policy "events_staff_read" on public.events
  for select to authenticated using (
    exists (
      select 1 from public.event_staff s
      where s.event_id = events.id and s.user_id = auth.uid()
    )
  );

drop policy if exists "events_admin_read" on public.events;
create policy "events_admin_read" on public.events
  for select to authenticated using (public.is_admin());

drop policy if exists "events_owner_insert" on public.events;
create policy "events_owner_insert" on public.events
  for insert to authenticated with check (
    exists (
      select 1 from public.organizers o
      where o.id = events.organizer_id
        and o.owner_id = auth.uid()
        and o.status in ('pending', 'approved')
    )
    and status = 'draft'
  );

drop policy if exists "events_owner_update" on public.events;
create policy "events_owner_update" on public.events
  for update to authenticated
  using (
    exists (
      select 1 from public.organizers o
      where o.id = events.organizer_id and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizers o
      where o.id = events.organizer_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "events_owner_delete" on public.events;
create policy "events_owner_delete" on public.events
  for delete to authenticated using (
    status in ('draft', 'rejected')
    and exists (
      select 1 from public.organizers o
      where o.id = events.organizer_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update" on public.events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events_admin_delete" on public.events;
create policy "events_admin_delete" on public.events
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Ticket types
-- ---------------------------------------------------------------------------
drop policy if exists "ticket_types_public_read" on public.ticket_types;
create policy "ticket_types_public_read" on public.ticket_types
  for select to anon, authenticated using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.status = 'published'
    )
  );

drop policy if exists "ticket_types_owner_read" on public.ticket_types;
create policy "ticket_types_owner_read" on public.ticket_types
  for select to authenticated using (public.can_manage_event(event_id));

drop policy if exists "ticket_types_owner_insert" on public.ticket_types;
create policy "ticket_types_owner_insert" on public.ticket_types
  for insert to authenticated with check (public.can_manage_event(event_id));

drop policy if exists "ticket_types_owner_update" on public.ticket_types;
create policy "ticket_types_owner_update" on public.ticket_types
  for update to authenticated using (public.can_manage_event(event_id))
  with check (public.can_manage_event(event_id));

drop policy if exists "ticket_types_owner_delete" on public.ticket_types;
create policy "ticket_types_owner_delete" on public.ticket_types
  for delete to authenticated using (public.can_manage_event(event_id));

-- ---------------------------------------------------------------------------
-- Bookings & items
-- ---------------------------------------------------------------------------
drop policy if exists "bookings_attendee_read" on public.bookings;
create policy "bookings_attendee_read" on public.bookings
  for select to authenticated using (attendee_id = auth.uid());

drop policy if exists "bookings_organizer_read" on public.bookings;
create policy "bookings_organizer_read" on public.bookings
  for select to authenticated using (
    exists (
      select 1
      from public.events e
      join public.organizers o on o.id = e.organizer_id
      where e.id = bookings.event_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "bookings_admin_read" on public.bookings;
create policy "bookings_admin_read" on public.bookings
  for select to authenticated using (public.is_admin());

drop policy if exists "booking_items_attendee_read" on public.booking_items;
create policy "booking_items_attendee_read" on public.booking_items
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_items.booking_id and b.attendee_id = auth.uid()
    )
  );

drop policy if exists "booking_items_organizer_read" on public.booking_items;
create policy "booking_items_organizer_read" on public.booking_items
  for select to authenticated using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      join public.organizers o on o.id = e.organizer_id
      where b.id = booking_items.booking_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "booking_items_admin_read" on public.booking_items;
create policy "booking_items_admin_read" on public.booking_items
  for select to authenticated using (public.is_admin());

drop policy if exists "inventory_reservations_attendee_read" on public.inventory_reservations;
create policy "inventory_reservations_attendee_read" on public.inventory_reservations
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = inventory_reservations.booking_id and b.attendee_id = auth.uid()
    )
  );

drop policy if exists "inventory_reservations_organizer_read" on public.inventory_reservations;
create policy "inventory_reservations_organizer_read" on public.inventory_reservations
  for select to authenticated using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      join public.organizers o on o.id = e.organizer_id
      where b.id = inventory_reservations.booking_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "inventory_reservations_admin_read" on public.inventory_reservations;
create policy "inventory_reservations_admin_read" on public.inventory_reservations
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Payments, webhooks and refunds
-- ---------------------------------------------------------------------------
drop policy if exists "payments_attendee_read" on public.payments;
create policy "payments_attendee_read" on public.payments
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = payments.booking_id and b.attendee_id = auth.uid()
    )
  );

drop policy if exists "payments_organizer_read" on public.payments;
create policy "payments_organizer_read" on public.payments
  for select to authenticated using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      join public.organizers o on o.id = e.organizer_id
      where b.id = payments.booking_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "payments_admin_read" on public.payments;
create policy "payments_admin_read" on public.payments
  for select to authenticated using (public.is_admin());

drop policy if exists "webhook_events_admin_read" on public.payment_webhook_events;
create policy "webhook_events_admin_read" on public.payment_webhook_events
  for select to authenticated using (public.is_admin());

drop policy if exists "refunds_requester_read" on public.refunds;
create policy "refunds_requester_read" on public.refunds
  for select to authenticated using (requested_by = auth.uid());

drop policy if exists "refunds_organizer_read" on public.refunds;
create policy "refunds_organizer_read" on public.refunds
  for select to authenticated using (
    exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      join public.organizers o on o.id = e.organizer_id
      where b.id = refunds.booking_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists "refunds_admin_read" on public.refunds;
create policy "refunds_admin_read" on public.refunds
  for select to authenticated using (public.is_admin());

drop policy if exists "refunds_attendee_insert" on public.refunds;
create policy "refunds_attendee_insert" on public.refunds
  for insert to authenticated with check (
    requested_by = auth.uid()
    and status = 'requested'
    and exists (
      select 1
      from public.bookings b
      join public.payments p on p.booking_id = b.id
      where b.id = refunds.booking_id
        and p.id = refunds.payment_id
        and b.attendee_id = auth.uid()
        and b.status = 'confirmed'
        and p.status = 'succeeded'
        and refunds.amount_xaf = b.total_xaf
    )
  );

-- ---------------------------------------------------------------------------
-- Tickets, staff and check-ins
-- ---------------------------------------------------------------------------
drop policy if exists "tickets_attendee_read" on public.tickets;
create policy "tickets_attendee_read" on public.tickets
  for select to authenticated using (attendee_id = auth.uid());

drop policy if exists "tickets_organizer_read" on public.tickets;
create policy "tickets_organizer_read" on public.tickets
  for select to authenticated using (public.can_manage_event(event_id));

drop policy if exists "tickets_scanner_read" on public.tickets;
create policy "tickets_scanner_read" on public.tickets
  for select to authenticated using (public.can_scan_event(event_id));

drop policy if exists "tickets_admin_read" on public.tickets;
create policy "tickets_admin_read" on public.tickets
  for select to authenticated using (public.is_admin());

drop policy if exists "event_staff_self_read" on public.event_staff;
create policy "event_staff_self_read" on public.event_staff
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "event_staff_manager_read" on public.event_staff;
create policy "event_staff_manager_read" on public.event_staff
  for select to authenticated using (public.can_manage_event(event_id));

drop policy if exists "event_staff_admin_read" on public.event_staff;
create policy "event_staff_admin_read" on public.event_staff
  for select to authenticated using (public.is_admin());

drop policy if exists "event_staff_manager_insert" on public.event_staff;
create policy "event_staff_manager_insert" on public.event_staff
  for insert to authenticated with check (public.can_manage_event(event_id));

drop policy if exists "event_staff_manager_update" on public.event_staff;
create policy "event_staff_manager_update" on public.event_staff
  for update to authenticated using (public.can_manage_event(event_id))
  with check (public.can_manage_event(event_id));

drop policy if exists "event_staff_manager_delete" on public.event_staff;
create policy "event_staff_manager_delete" on public.event_staff
  for delete to authenticated using (public.can_manage_event(event_id));

drop policy if exists "check_ins_scanner_read" on public.check_ins;
create policy "check_ins_scanner_read" on public.check_ins
  for select to authenticated using (public.can_scan_event(event_id));

drop policy if exists "check_ins_admin_read" on public.check_ins;
create policy "check_ins_admin_read" on public.check_ins
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_own_read" on public.notifications;
create policy "notifications_own_read" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_own_update" on public.notifications;
create policy "notifications_own_update" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_own_delete" on public.notifications;
create policy "notifications_own_delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Payouts, audit, settings, public inbox
-- ---------------------------------------------------------------------------
drop policy if exists "payouts_owner_read" on public.organizer_payouts;
create policy "payouts_owner_read" on public.organizer_payouts
  for select to authenticated using (public.is_organizer_owner(organizer_id));

drop policy if exists "payouts_admin_read" on public.organizer_payouts;
create policy "payouts_admin_read" on public.organizer_payouts
  for select to authenticated using (public.is_admin());

drop policy if exists "audit_admin_read" on public.audit_logs;
create policy "audit_admin_read" on public.audit_logs
  for select to authenticated using (public.is_admin());

drop policy if exists "settings_public_read" on public.platform_settings;
create policy "settings_public_read" on public.platform_settings
  for select to anon, authenticated using (true);

drop policy if exists "settings_admin_write" on public.platform_settings;
create policy "settings_admin_write" on public.platform_settings
  for insert to authenticated with check (public.is_admin());

drop policy if exists "settings_admin_update" on public.platform_settings;
create policy "settings_admin_update" on public.platform_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_admin_delete" on public.platform_settings;
create policy "settings_admin_delete" on public.platform_settings
  for delete to authenticated using (public.is_admin());

drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;
create policy "newsletter_public_insert" on public.newsletter_subscribers
  for insert to anon, authenticated with check (true);

drop policy if exists "newsletter_admin_read" on public.newsletter_subscribers;
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for select to authenticated using (public.is_admin());

drop policy if exists "contact_public_insert" on public.contact_messages;
create policy "contact_public_insert" on public.contact_messages
  for insert to anon, authenticated with check (true);

drop policy if exists "contact_admin_read" on public.contact_messages;
create policy "contact_admin_read" on public.contact_messages
  for select to authenticated using (public.is_admin());

drop policy if exists "contact_admin_update" on public.contact_messages;
create policy "contact_admin_update" on public.contact_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Privileges. RLS is the row boundary; GRANTs are the first boundary.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.categories, public.organizers, public.events,
  public.ticket_types, public.platform_settings to anon;
grant insert on public.newsletter_subscribers, public.contact_messages to anon;

grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.events to authenticated;
grant insert, update, delete on public.ticket_types to authenticated;
grant insert, update, delete on public.event_staff to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.platform_settings to authenticated;
grant insert, update on public.organizers to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert on public.refunds to authenticated;
grant insert on public.newsletter_subscribers, public.contact_messages to authenticated;
grant update, delete on public.notifications to authenticated;
grant update on public.contact_messages to authenticated;

-- QR tokens and hashes are never exposed through the Data API. Owners fetch the
-- token through get_my_ticket_qr(), which enforces ownership.
revoke select on public.tickets from authenticated;
grant select (
  id, booking_id, event_id, ticket_type_id, attendee_id, attendee_name,
  ticket_reference, status, checked_in_at, issued_at, created_at
) on public.tickets to authenticated;

-- ---------------------------------------------------------------------------
-- Function execution grants
-- ---------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function public.record_event_view(uuid) to anon, authenticated;
grant execute on function public.reserve_booking(uuid, jsonb, text, text, text, text) to authenticated;
grant execute on function public.create_payment_intent(uuid, public.payment_provider) to authenticated;
grant execute on function public.confirm_demo_payment(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.get_my_ticket_qr(uuid) to authenticated;
grant execute on function public.check_in_ticket(text, uuid, text) to authenticated;
grant execute on function public.expire_stale_bookings(integer) to authenticated, service_role;
grant execute on function public.organizer_available_balance(uuid) to authenticated;
grant execute on function public.request_payout(uuid, integer, text, text) to authenticated;
grant execute on function public.save_event_draft(jsonb, jsonb) to authenticated;
grant execute on function public.submit_event_for_approval(uuid) to authenticated;
grant execute on function public.add_event_staff_by_email(uuid, text, text) to authenticated;
grant execute on function public.admin_review_organizer(uuid, boolean, text) to authenticated;
grant execute on function public.admin_review_event(uuid, boolean, text) to authenticated;
grant execute on function public.admin_suspend_event(uuid, text) to authenticated;
grant execute on function public.admin_review_refund(uuid, boolean, text) to authenticated;
grant execute on function public.admin_review_payout(uuid, text, text) to authenticated;
grant execute on function public.process_verified_payment(uuid, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Read models for dashboards (RLS of base tables still applies)
-- ---------------------------------------------------------------------------
create or replace view public.event_sales_summary
with (security_invoker = true)
as
select
  e.id as event_id,
  e.organizer_id,
  e.title as event_title,
  coalesce((
    select count(*) from public.tickets t
    where t.event_id = e.id and t.status in ('valid', 'used')
  ), 0)::integer as tickets_sold,
  coalesce((
    select count(*) from public.bookings b
    where b.event_id = e.id and b.status = 'confirmed'
  ), 0)::integer as orders,
  coalesce((
    select sum(b.subtotal_xaf) from public.bookings b
    where b.event_id = e.id and b.status = 'confirmed'
  ), 0)::integer as gross_revenue,
  coalesce((
    select count(*) from public.check_ins c where c.event_id = e.id
  ), 0)::integer as checked_in
from public.events e;

create or replace view public.organizer_daily_sales
with (security_invoker = true)
as
select
  e.organizer_id,
  date_trunc('day', b.confirmed_at) as day,
  sum(b.subtotal_xaf)::integer as revenue_xaf,
  count(*)::integer as orders
from public.bookings b
join public.events e on e.id = b.event_id
where b.status = 'confirmed' and b.confirmed_at is not null
group by e.organizer_id, date_trunc('day', b.confirmed_at);

create or replace view public.platform_daily_revenue
with (security_invoker = true)
as
select
  date_trunc('day', b.confirmed_at) as day,
  sum(b.subtotal_xaf)::integer as organizer_revenue_xaf,
  sum(b.service_fee_xaf)::integer as platform_revenue_xaf,
  count(*)::integer as orders
from public.bookings b
where b.status = 'confirmed' and b.confirmed_at is not null
group by date_trunc('day', b.confirmed_at);

grant select on public.event_sales_summary, public.organizer_daily_sales,
  public.platform_daily_revenue to authenticated;
