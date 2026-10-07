begin;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_catalog
as $mark_read$
declare
  me uuid := auth.uid();
  proposed_at timestamptz := clock_timestamp();
  stored_at timestamptz;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  update public.conversation_members
  set last_read_at = greatest(
    coalesce(last_read_at, '-infinity'::timestamptz),
    proposed_at
  )
  where conversation_id = target_conversation_id
    and profile_id = me
  returning last_read_at into stored_at;

  if stored_at is null then
    raise exception 'Conversation unavailable';
  end if;

  return stored_at;
end;
$mark_read$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

commit;
