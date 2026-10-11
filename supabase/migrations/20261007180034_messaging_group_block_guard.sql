begin;

create or replace function public.start_group_conversation(target_profile_ids uuid[], group_title text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $group$
declare
  me uuid := auth.uid();
  clean_ids uuid[];
  new_id uuid;
begin
  if me is null then raise exception 'Authentication required'; end if;

  select array_agg(distinct target.id)
  into clean_ids
  from unnest(coalesce(target_profile_ids, array[]::uuid[])) as target(id)
  where target.id is not null and target.id <> me;

  if clean_ids is null or cardinality(clean_ids) < 2 then
    raise exception 'Choose at least two other members for a group';
  end if;

  if exists (
    select 1
    from unnest(clean_ids) as target(id)
    left join public.profiles p on p.id = target.id and p.is_active = true
    where p.id is null
      or exists (
        select 1
        from public.blocks b
        where (b.blocker_id = me and b.blocked_id = target.id)
           or (b.blocker_id = target.id and b.blocked_id = me)
      )
  ) then
    raise exception 'One or more selected members are unavailable';
  end if;

  insert into public.conversations(created_by, title, conversation_type)
  values (
    me,
    nullif(left(trim(coalesce(group_title, '')), 80), ''),
    'group'
  )
  returning id into new_id;

  insert into public.conversation_members(conversation_id, profile_id, role)
  values (new_id, me, 'admin');

  insert into public.conversation_members(conversation_id, profile_id, role)
  select new_id, target.id, 'member'
  from unnest(clean_ids) as target(id);

  return new_id;
end;
$group$;

revoke all on function public.start_group_conversation(uuid[], text) from public, anon;
grant execute on function public.start_group_conversation(uuid[], text) to authenticated;

commit;
