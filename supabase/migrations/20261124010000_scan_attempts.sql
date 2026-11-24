-- ============================================================================
-- TICKORA - 007 - Scanner attempt history
--
-- Every door scan (success, invalid, duplicate, wrong event) is recorded so
-- scanners and organizers can review check-in activity. The QR token itself is
-- never stored - only the resolved ticket reference and outcome code.
-- ============================================================================

create table if not exists public.scan_attempts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  ticket_id uuid references public.tickets (id) on delete set null,
  ticket_reference text,
  method text not null default 'qr' check (method in ('qr', 'manual')),
  outcome text not null check (outcome in ('success', 'invalid', 'duplicate')),
  code text,
  created_at timestamptz not null default now()
);

create index if not exists scan_attempts_event_idx
  on public.scan_attempts (event_id, created_at desc);
create index if not exists scan_attempts_actor_idx
  on public.scan_attempts (actor_id, created_at desc);
create index if not exists scan_attempts_outcome_idx
  on public.scan_attempts (event_id, outcome, created_at desc);

alter table public.scan_attempts enable row level security;

-- Staff may read attempts for events they are allowed to scan.
drop policy if exists "scan_attempts_scanner_read" on public.scan_attempts;
create policy "scan_attempts_scanner_read" on public.scan_attempts
  for select to authenticated
  using (
    public.is_admin()
    or (event_id is not null and public.can_scan_event(event_id))
  );

-- No direct writes: attempts are recorded exclusively through
-- record_scan_attempt (security definer), which enforces assignment checks.
revoke all on public.scan_attempts from anon, authenticated;
grant select on public.scan_attempts to authenticated;

-- ---------------------------------------------------------------------------
-- Record a scan attempt. Called by the server action after check_in_ticket
-- returns, so failed lookups (unknown token) can still be logged with nulls.
-- ---------------------------------------------------------------------------
create or replace function public.record_scan_attempt(
  p_event_id uuid,
  p_ticket_id uuid,
  p_ticket_reference text,
  p_method text,
  p_outcome text,
  p_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not (
    public.is_admin()
    or exists (select 1 from public.user_roles ur where ur.user_id = v_uid and ur.role in ('scanner', 'organizer'))
  ) then
    raise exception 'NOT_AUTHORIZED: scanner access required';
  end if;
  if p_event_id is not null and not public.can_scan_event(p_event_id) then
    raise exception 'NOT_AUTHORIZED: you are not assigned to this event';
  end if;
  if p_outcome not in ('success', 'invalid', 'duplicate') then
    raise exception 'INVALID_STATE: unsupported outcome';
  end if;

  insert into public.scan_attempts (
    actor_id, event_id, ticket_id, ticket_reference, method, outcome, code
  )
  values (
    v_uid,
    p_event_id,
    p_ticket_id,
    left(nullif(trim(coalesce(p_ticket_reference, '')), ''), 60),
    case when p_method = 'manual' then 'manual' else 'qr' end,
    p_outcome,
    left(nullif(trim(coalesce(p_code, '')), ''), 60)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_scan_attempt(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.record_scan_attempt(uuid, uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- check_in_ticket: identical logic, additionally returns the resolved
-- event/ticket identifiers so the caller can record the attempt. Identifiers
-- are safe to expose to authorized scanners; the QR token never is.
-- ---------------------------------------------------------------------------
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
      'message', 'This ticket belongs to a different event.',
      'event_id', v_ticket.event_id,
      'ticket_id', v_ticket.id,
      'ticket_reference', v_ticket.ticket_reference,
      'event_title', (select title from public.events where id = v_ticket.event_id));
  end if;

  select * into v_event from public.events where id = v_ticket.event_id;
  if v_event.status not in ('published', 'completed') then
    return jsonb_build_object('success', false, 'code', 'TICKET_NOT_VALID',
      'message', 'This event is not currently accepting check-ins.',
      'event_id', v_event.id,
      'ticket_id', v_ticket.id,
      'ticket_reference', v_ticket.ticket_reference,
      'event_title', v_event.title);
  end if;

  if v_ticket.status = 'used' then
    select * into v_check_in from public.check_ins where ticket_id = v_ticket.id;
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CHECKED_IN',
      'message', 'This ticket has already been used.',
      'checked_in_at', coalesce(v_check_in.scanned_at, v_ticket.checked_in_at),
      'event_id', v_event.id,
      'ticket_id', v_ticket.id,
      'ticket_reference', v_ticket.ticket_reference,
      'attendee_name', v_ticket.attendee_name,
      'event_title', v_event.title
    );
  end if;

  if v_ticket.status <> 'valid' then
    return jsonb_build_object('success', false, 'code', 'TICKET_NOT_VALID',
      'message', 'This ticket is no longer valid.',
      'event_id', v_event.id,
      'ticket_id', v_ticket.id,
      'ticket_reference', v_ticket.ticket_reference,
      'attendee_name', v_ticket.attendee_name,
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
    'event_id', v_event.id,
    'ticket_id', v_ticket.id,
    'checked_in_at', v_check_in.scanned_at,
    'scanned_by', coalesce(v_staff_name, 'Staff')
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'code', 'ALREADY_CHECKED_IN',
      'message', 'This ticket has already been used.',
      'event_id', v_ticket.event_id,
      'ticket_id', v_ticket.id,
      'ticket_reference', v_ticket.ticket_reference);
end;
$$;
