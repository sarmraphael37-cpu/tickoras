-- ============================================================================
-- TICKORA Event Financial Management
-- Organizer expenses + profit tracking. Additive only.
-- ============================================================================

create table if not exists public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  category text not null check (category in (
    'venue', 'artists', 'marketing', 'catering', 'photography',
    'security', 'equipment', 'transportation', 'staff', 'miscellaneous'
  )),
  description text not null check (length(description) between 2 and 300),
  amount_xaf integer not null check (amount_xaf > 0 and amount_xaf <= 999999999),
  expense_date date not null default current_date,
  receipt_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_expenses_organizer_idx
  on public.event_expenses (organizer_id, expense_date desc);
create index if not exists event_expenses_event_idx
  on public.event_expenses (event_id) where event_id is not null;

drop trigger if exists set_updated_at_event_expenses on public.event_expenses;
create trigger set_updated_at_event_expenses
  before update on public.event_expenses
  for each row execute function public.set_updated_at();

alter table public.event_expenses enable row level security;

drop policy if exists "event_expenses_organizer_all" on public.event_expenses;
create policy "event_expenses_organizer_all" on public.event_expenses
  for all to authenticated
  using (
    organizer_id in (select id from public.organizers where owner_id = auth.uid())
    or public.is_admin()
  )
  with check (
    organizer_id in (select id from public.organizers where owner_id = auth.uid())
    or public.is_admin()
  );

grant select, insert, update, delete on public.event_expenses to authenticated;
