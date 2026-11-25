-- ============================================================================
-- TICKORA Financial audit trail for expense mutations
-- ============================================================================

create or replace function public.audit_event_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'expense_created', 'event_expense', new.id,
      jsonb_build_object(
        'organizer_id', new.organizer_id,
        'event_id', new.event_id,
        'category', new.category,
        'amount_xaf', new.amount_xaf,
        'description', new.description
      )
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'expense_updated', 'event_expense', new.id,
      jsonb_build_object(
        'organizer_id', new.organizer_id,
        'old_amount_xaf', old.amount_xaf,
        'new_amount_xaf', new.amount_xaf,
        'category', new.category
      )
    );
    return new;
  else
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'expense_deleted', 'event_expense', old.id,
      jsonb_build_object(
        'organizer_id', old.organizer_id,
        'event_id', old.event_id,
        'category', old.category,
        'amount_xaf', old.amount_xaf,
        'description', old.description
      )
    );
    return old;
  end if;
end;
$$;

drop trigger if exists audit_event_expenses on public.event_expenses;
create trigger audit_event_expenses
  after insert or update or delete on public.event_expenses
  for each row execute function public.audit_event_expense();
