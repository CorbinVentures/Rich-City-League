begin;

-- REP integrity: one canonical progression model and server-owned social rewards.
create or replace function public.xp_for_level(target_level integer)
returns integer language sql immutable as $$
  select case when greatest(target_level,1)=1 then 0 else 100 * (greatest(target_level,1)-1) * (greatest(target_level,1)-1) end;
$$;

create or replace function public.rep_progress(total_xp integer)
returns table(level integer, level_start integer, next_level_xp integer, progress numeric)
language sql immutable as $$
  with l as (select public.level_for_xp(greatest(total_xp,0)) as current_level)
  select current_level,
         public.xp_for_level(current_level),
         public.xp_for_level(current_level+1),
         case when public.xp_for_level(current_level+1)=public.xp_for_level(current_level) then 100
              else round(100.0*(greatest(total_xp,0)-public.xp_for_level(current_level))/(public.xp_for_level(current_level+1)-public.xp_for_level(current_level)),2) end
  from l;
$$;

create or replace function public.award_social_rep()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; reward integer; reason_name text; source_name text; source_uuid uuid;
begin
  if tg_table_name='posts' then actor:=new.author_id; reward:=20; reason_name:='quality_content'; source_name:='post'; source_uuid:=new.id;
  elsif tg_table_name='comments' then actor:=new.author_id; reward:=5; reason_name:='meaningful_engagement'; source_name:='comment'; source_uuid:=new.id;
  elsif tg_table_name='reactions' then actor:=new.user_id; reward:=2; reason_name:='meaningful_engagement'; source_name:='reaction'; source_uuid:=new.id;
  elsif tg_table_name='follows' then actor:=new.follower_id; reward:=3; reason_name:='community_contribution'; source_name:='follow'; source_uuid:=new.id;
  else return new; end if;
  if actor is null or source_uuid is null then return new; end if;
  insert into public.user_levels(profile_id) values(actor) on conflict do nothing;
  insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id)
  values(actor,reward,reason_name,source_name,source_uuid) on conflict do nothing;
  if found then update public.user_levels set xp=xp+reward,level=public.level_for_xp(xp+reward),updated_at=now() where profile_id=actor; end if;
  return new;
end $$;

drop trigger if exists award_rep_post on public.posts;
create trigger award_rep_post after insert on public.posts for each row when (new.status='published') execute function public.award_social_rep();
drop trigger if exists award_rep_comment on public.comments;
create trigger award_rep_comment after insert on public.comments for each row execute function public.award_social_rep();
drop trigger if exists award_rep_reaction on public.reactions;
create trigger award_rep_reaction after insert on public.reactions for each row execute function public.award_social_rep();
drop trigger if exists award_rep_follow on public.follows;
create trigger award_rep_follow after insert on public.follows for each row when (new.follower_id<>new.following_id) execute function public.award_social_rep();

revoke execute on function public.award_social_rep() from public,anon,authenticated;
grant execute on function public.xp_for_level(integer) to anon,authenticated;
grant execute on function public.rep_progress(integer) to anon,authenticated;

commit;
