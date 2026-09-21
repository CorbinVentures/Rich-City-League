create or replace function public.start_direct_conversation(target_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare me uuid := auth.uid(); existing_id uuid; new_id uuid;
begin
  if me is null then raise exception 'Authentication required'; end if;
  if target_profile_id is null or target_profile_id = me then raise exception 'Invalid message recipient'; end if;
  if not exists (select 1 from public.profiles where id=target_profile_id and is_active=true) then raise exception 'Member not found'; end if;
  select c.id into existing_id from public.conversations c
  join public.conversation_members mine on mine.conversation_id=c.id and mine.profile_id=me
  join public.conversation_members theirs on theirs.conversation_id=c.id and theirs.profile_id=target_profile_id
  where c.conversation_type='direct' and (select count(*) from public.conversation_members cm where cm.conversation_id=c.id)=2
  order by c.created_at asc limit 1;
  if existing_id is not null then return existing_id; end if;
  insert into public.conversations(created_by,title,conversation_type) values(me,null,'direct') returning id into new_id;
  insert into public.conversation_members(conversation_id,profile_id) values(new_id,me),(new_id,target_profile_id);
  return new_id;
end; $$;
revoke all on function public.start_direct_conversation(uuid) from public;
grant execute on function public.start_direct_conversation(uuid) to authenticated;