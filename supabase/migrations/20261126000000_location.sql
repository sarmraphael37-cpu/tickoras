-- ============================================================================
-- TICKORA Location Intelligence
-- Additive: coordinates on events + service providers, location RPCs.
-- ============================================================================

alter table public.events
  add column if not exists latitude double precision
    check (latitude is null or (latitude >= -90 and latitude <= 90)),
  add column if not exists longitude double precision
    check (longitude is null or (longitude >= -180 and longitude <= 180));

alter table public.service_providers
  add column if not exists latitude double precision
    check (latitude is null or (latitude >= -90 and latitude <= 90)),
  add column if not exists longitude double precision
    check (longitude is null or (longitude >= -180 and longitude <= 180));

create index if not exists events_coordinates_idx
  on public.events (latitude, longitude)
  where latitude is not null and status = 'published';

-- Set/clear an event's coordinates. Owner or admin only; works on any status
-- so organizers can fix a published event's pin without unpublishing.
create or replace function public.set_event_location(
  p_event_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_latitude is null or p_longitude is null then
    if p_latitude is not null or p_longitude is not null then
      raise exception 'INVALID_INPUT: latitude and longitude must be set together';
    end if;
  elsif p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'INVALID_INPUT: coordinates out of range';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then raise exception 'NOT_FOUND: event'; end if;
  if not public.is_organizer_owner(v_event.organizer_id) and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.events
  set latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_event_id;
end;
$$;

grant execute on function public.set_event_location(uuid, double precision, double precision) to authenticated;
