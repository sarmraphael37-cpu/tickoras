-- ============================================================================
-- TICKORA · 005 · Storage buckets and folder-scoped policies
--
-- event-media        public read; writes scoped to an organizer the caller owns
-- profile-avatars    public read; writes scoped to the caller's own folder
--
-- Paths:
--   event-media/{organizer_id}/{filename}
--   profile-avatars/{user_id}/{filename}
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'event-media',
    'event-media',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'profile-avatars',
    'profile-avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Public media read
-- ---------------------------------------------------------------------------
drop policy if exists "event_media_public_read" on storage.objects;
create policy "event_media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'event-media');

drop policy if exists "profile_avatars_public_read" on storage.objects;
create policy "profile_avatars_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-avatars');

-- ---------------------------------------------------------------------------
-- Event media: only the owning organizer (or an admin) may write
-- ---------------------------------------------------------------------------
drop policy if exists "event_media_owner_insert" on storage.objects;
create policy "event_media_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-media'
    and exists (
      select 1 from public.organizers o
      where o.owner_id = auth.uid()
        and o.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "event_media_owner_update" on storage.objects;
create policy "event_media_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-media'
    and (
      public.is_admin()
      or exists (
        select 1 from public.organizers o
        where o.owner_id = auth.uid()
          and o.id::text = (storage.foldername(name))[1]
      )
    )
  )
  with check (
    bucket_id = 'event-media'
    and (
      public.is_admin()
      or exists (
        select 1 from public.organizers o
        where o.owner_id = auth.uid()
          and o.id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "event_media_owner_delete" on storage.objects;
create policy "event_media_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-media'
    and (
      public.is_admin()
      or exists (
        select 1 from public.organizers o
        where o.owner_id = auth.uid()
          and o.id::text = (storage.foldername(name))[1]
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Profile avatars: only the owner (or an admin) may write
-- ---------------------------------------------------------------------------
drop policy if exists "profile_avatars_owner_insert" on storage.objects;
create policy "profile_avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_avatars_owner_update" on storage.objects;
create policy "profile_avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  with check (
    bucket_id = 'profile-avatars'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "profile_avatars_owner_delete" on storage.objects;
create policy "profile_avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
