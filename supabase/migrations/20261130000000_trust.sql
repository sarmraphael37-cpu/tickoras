-- ============================================================================
-- TICKORA Trust, Verification, Reviews & Complaints
-- ============================================================================

-- --------------------------------------------------------------------------
-- Verification applications (organizers + service providers)
-- --------------------------------------------------------------------------
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('organizer', 'service_provider')),
  subject_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  documents jsonb not null default '[]'::jsonb, -- [{label, url}]
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'info_requested', 'suspended')),
  admin_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists verification_requests_subject_idx
  on public.verification_requests (subject_type, subject_id);
create index if not exists verification_requests_status_idx
  on public.verification_requests (status) where status = 'pending';

drop trigger if exists set_updated_at_verification_requests on public.verification_requests;
create trigger set_updated_at_verification_requests
  before update on public.verification_requests
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- Public reviews for events & organizers (providers use service_reviews)
-- --------------------------------------------------------------------------
create table if not exists public.public_reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('event', 'organizer')),
  target_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 2000),
  status text not null default 'published'
    check (status in ('published', 'pending', 'reported', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
create index if not exists public_reviews_target_idx
  on public.public_reviews (target_type, target_id, status);

-- --------------------------------------------------------------------------
-- Complaints & disputes
-- --------------------------------------------------------------------------
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'CMP-' || to_char(now(), 'YYMM') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  user_id uuid not null references auth.users (id) on delete cascade,
  organizer_id uuid references public.organizers (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  service_booking_id uuid references public.service_bookings (id) on delete set null,
  subject text not null check (length(subject) between 3 and 160),
  description text not null check (length(description) between 10 and 4000),
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved', 'rejected')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  admin_note text,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists complaints_user_idx on public.complaints (user_id);
create index if not exists complaints_status_idx on public.complaints (status);
create index if not exists complaints_organizer_idx on public.complaints (organizer_id);

drop trigger if exists set_updated_at_complaints on public.complaints;
create trigger set_updated_at_complaints
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.verification_requests enable row level security;
alter table public.public_reviews enable row level security;
alter table public.complaints enable row level security;

-- Verification: submitter manages own requests; admins all; organizer sees
-- requests for own org's providers; provider owner sees own.
drop policy if exists "verification_owner" on public.verification_requests;
create policy "verification_owner" on public.verification_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      subject_type = 'service_provider'
      and subject_id in (
        select id from public.service_providers where user_id = auth.uid()
      )
    )
    or (
      subject_type = 'organizer'
      and subject_id in (
        select id from public.organizers where owner_id = auth.uid()
      )
    )
  );

drop policy if exists "verification_insert" on public.verification_requests;
create policy "verification_insert" on public.verification_requests
  for insert to authenticated
  with check (user_id = auth.uid());

-- Reviews: public reads published; owner reads own; writes via RPC.
drop policy if exists "reviews_public_read" on public.public_reviews;
create policy "reviews_public_read" on public.public_reviews
  for select to anon, authenticated using (status = 'published');

drop policy if exists "reviews_owner_read" on public.public_reviews;
create policy "reviews_owner_read" on public.public_reviews
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Complaints: owner manages own; organizer reads complaints about their org;
-- admin all.
drop policy if exists "complaints_owner" on public.complaints;
create policy "complaints_owner" on public.complaints
  for all to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or organizer_id in (
      select id from public.organizers where owner_id = auth.uid()
    )
  )
  with check (user_id = auth.uid());

grant select, insert on public.verification_requests to authenticated;
grant select, insert, update, delete on public.verification_requests to authenticated;
grant select on public.public_reviews to anon, authenticated;
grant select, insert on public.public_reviews to authenticated;
grant select, insert, update on public.complaints to authenticated;

-- ===========================================================================
-- RPCs
-- ===========================================================================

-- Admin: review a verification application
create or replace function public.review_verification(
  p_request_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.verification_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_status not in ('approved', 'rejected', 'info_requested', 'suspended') then
    raise exception 'INVALID_INPUT: bad status';
  end if;
  select * into v_req from public.verification_requests where id = p_request_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  update public.verification_requests
  set status = p_status, admin_note = p_note, reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  -- Mirror the outcome onto the subject's verified flag / organizer status
  if p_status = 'approved' then
    if v_req.subject_type = 'service_provider' then
      update public.service_providers set is_verified = true where id = v_req.subject_id;
    elsif v_req.subject_type = 'organizer' then
      -- Organizer verification approval marks the organizer verified via a
      -- dedicated flag on organizers (status stays 'approved' for operations).
      update public.organizers set is_verified = true where id = v_req.subject_id;
    end if;
  elsif p_status = 'suspended' then
    if v_req.subject_type = 'service_provider' then
      update public.service_providers set is_verified = false where id = v_req.subject_id;
    elsif v_req.subject_type = 'organizer' then
      update public.organizers set is_verified = false where id = v_req.subject_id;
    end if;
  end if;
end;
$$;
grant execute on function public.review_verification(uuid, text, text) to authenticated;

-- Submit a review. Event reviews require a confirmed booking for that event.
create or replace function public.submit_public_review(
  p_target_type text,
  p_target_id uuid,
  p_rating smallint,
  p_comment text default null,
  p_booking_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_review_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'INVALID_INPUT: rating 1-5'; end if;
  if p_target_type not in ('event', 'organizer') then
    raise exception 'INVALID_INPUT: bad target';
  end if;

  if p_target_type = 'event' then
    -- Must hold a confirmed booking for this event
    if not exists (
      select 1 from public.bookings
      where event_id = p_target_id and attendee_id = v_uid and status = 'confirmed'
    ) then
      raise exception 'NOT_ELIGIBLE: only attendees with a confirmed booking can review';
    end if;
  else
    -- Organizer target must exist
    if not exists (select 1 from public.organizers where id = p_target_id) then
      raise exception 'NOT_FOUND: organizer';
    end if;
    -- Must have a confirmed booking at one of their events
    if not exists (
      select 1 from public.bookings b
      join public.events e on e.id = b.event_id
      where e.organizer_id = p_target_id and b.attendee_id = v_uid
        and b.status = 'confirmed'
    ) then
      raise exception 'NOT_ELIGIBLE: only attendees with a confirmed booking can review';
    end if;
  end if;

  insert into public.public_reviews
    (target_type, target_id, user_id, booking_id, rating, comment)
  values
    (p_target_type, p_target_id, v_uid, p_booking_id, p_rating,
     nullif(left(coalesce(p_comment, ''), 2000), ''))
  on conflict (user_id, target_type, target_id) do update
    set rating = excluded.rating,
        comment = excluded.comment,
        status = 'published',
        updated_at = now()
  returning id into v_review_id;

  return v_review_id;
end;
$$;
grant execute on function public.submit_public_review(text, uuid, smallint, text, uuid)
  to authenticated;

-- Report a review → hides it pending admin review
create or replace function public.report_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.public_reviews
  set status = 'reported', updated_at = now()
  where id = p_review_id and status = 'published' and user_id <> auth.uid();
end;
$$;
grant execute on function public.report_review(uuid) to authenticated;

-- Admin: moderate a review
create or replace function public.moderate_review(
  p_review_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_status not in ('published', 'rejected') then
    raise exception 'INVALID_INPUT: bad status';
  end if;
  update public.public_reviews
  set status = p_status, updated_at = now()
  where id = p_review_id;
end;
$$;
grant execute on function public.moderate_review(uuid, text) to authenticated;

-- Admin: update complaint status
create or replace function public.update_complaint_status(
  p_complaint_id uuid,
  p_status text,
  p_note text default null,
  p_priority text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_status not in ('open', 'investigating', 'resolved', 'rejected') then
    raise exception 'INVALID_INPUT: bad status';
  end if;
  update public.complaints
  set status = p_status,
      admin_note = coalesce(p_note, admin_note),
      priority = coalesce(p_priority, priority),
      resolved_by = case when p_status in ('resolved', 'rejected') then auth.uid() else resolved_by end,
      resolved_at = case when p_status in ('resolved', 'rejected') then now() else resolved_at end,
      updated_at = now()
  where id = p_complaint_id;
end;
$$;
grant execute on function public.update_complaint_status(uuid, text, text, text)
  to authenticated;

-- Organizer/provider verified flag on organizers table
alter table public.organizers
  add column if not exists is_verified boolean not null default false;
