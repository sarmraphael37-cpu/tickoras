-- ---------------------------------------------------------------------------
-- Function execution grants for RLS helper functions
--
-- RLS policies on public tables call these SECURITY DEFINER helpers. Postgres
-- still requires EXECUTE privilege on a function before a policy can call it,
-- even when the function is security definer. Without these grants, any
-- authenticated (or anon) query on a protected table can fail with:
--   permission denied for function is_admin
--
-- These helpers only read membership/ownership and cannot mutate data, so
-- granting EXECUTE to anon and authenticated is safe. Administrative actions
-- remain guarded by the function bodies and by RLS on the underlying tables.
-- ---------------------------------------------------------------------------

grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.has_role(public.app_role, uuid) to anon, authenticated;
grant execute on function public.is_organizer_owner(uuid) to anon, authenticated;
grant execute on function public.current_organizer_id() to anon, authenticated;
grant execute on function public.can_manage_event(uuid) to anon, authenticated;
grant execute on function public.can_scan_event(uuid) to anon, authenticated;
grant execute on function public.platform_setting_numeric(text, numeric) to anon, authenticated;
grant execute on function public.platform_setting_bool(text, boolean) to anon, authenticated;
