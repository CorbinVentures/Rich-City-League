begin;

-- Production hardening for Social REP: cap post farming, centralize status
-- thresholds, deduplicate milestone notifications, and backfill earned badges.

create table if not exists public.social_rep_daily_limits (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null check (action_type in ('posts')),
  claim_date date not null default current_date,
  claims integer not null default 0 check (claims >= 0),
  primary key(profile_id,action_type,claim_date)
);
alter table public.social_rep_daily_limits enable row level security;
revoke all on public.social_rep_daily_limits from anon,authenticated;

create or replace function public.rep_status_for_level(target_level integer)
returns text language sql immutable parallel safe as $$
  select case
    when greatest(coalesce(target_level,1),1)>=25 then 'Icon'
    when greatest(coalesce(target_level,1),1)>=16 then 'Elite'
    when greatest(coalesce(target_level,1),1)>=10 then 'Influential'
    when greatest(coalesce(target_level,1),1)>=6 then 'Recognized'
    when greatest(coalesce(target_level,1),1)>=3 then 'Established'
    else 'Rookie'
  end
$$;
grant execute on function public.rep_status_for_level(integer) to anon,authenticated;

create or replace function public.award_social_rep()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; reward integer; reason_name text; source_name text; source_uuid uuid; target_uuid uuid; owner uuid; claim_rows integer:=0; daily_claims integer:=0;
begin
  if tg_table_name='posts' then
    actor:=new.author_id; reward:=20; reason_name:='quality_content'; source_name:='post'; source_uuid:=new.id; target_uuid:=new.id;
    if coalesce(new.status,'')<>'published' then return new; end if;
  elsif tg_table_name='comments' then
    actor:=new.author_id; reward:=5; reason_name:='meaningful_engagement'; source_name:='comment'; source_uuid:=new.id; target_uuid:=new.post_id;
    select author_id into owner from public.posts where id=new.post_id;
    if owner=actor then return new; end if;
  elsif tg_table_name='reactions' then
    actor:=new.user_id; reward:=2; reason_name:='meaningful_engagement'; source_name:='reaction'; source_uuid:=new.id; target_uuid:=new.post_id;
    select author_id into owner from public.posts where id=new.post_id;
    if owner=actor then return new; end if;
  elsif tg_table_name='follows' then
    actor:=new.follower_id; reward:=3; reason_name:='community_contribution'; source_name:='follow'; source_uuid:=new.following_id; target_uuid:=new.following_id;
    if actor=new.following_id then return new; end if;
  else return new; end if;

  if actor is null or target_uuid is null then return new; end if;

  insert into public.social_rep_claims(profile_id,action_type,target_id)
  values(actor,tg_table_name::text,target_uuid)
  on conflict do nothing;
  get diagnostics claim_rows = row_count;
  if claim_rows=0 then return new; end if;

  -- Reward at most five newly published posts per UTC day. The row lock makes
  -- the cap safe when several posts arrive concurrently.
  if tg_table_name='posts' then
    insert into public.social_rep_daily_limits(profile_id,action_type,claim_date,claims)
    values(actor,'posts',(now() at time zone 'utc')::date,0)
    on conflict do nothing;
    select claims into daily_claims from public.social_rep_daily_limits
      where profile_id=actor and action_type='posts' and claim_date=(now() at time zone 'utc')::date
      for update;
    if daily_claims>=5 then return new; end if;
    update public.social_rep_daily_limits set claims=claims+1
      where profile_id=actor and action_type='posts' and claim_date=(now() at time zone 'utc')::date;
  end if;

  insert into public.user_levels(profile_id) values(actor) on conflict do nothing;
  insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id)
  values(actor,reward,reason_name,source_name,source_uuid) on conflict do nothing;
  if found then
    update public.user_levels set xp=xp+reward,level=public.level_for_xp(xp+reward),updated_at=now() where profile_id=actor;
  end if;
  return new;
end $$;
revoke execute on function public.award_social_rep() from public,anon,authenticated;

create unique index if not exists notifications_rep_event_unique
on public.notifications(recipient_id,type,title,body)
where type in ('rep_status','rep_level','rep_milestone');

create or replace function public.notify_rep_milestone()
returns trigger language plpgsql security definer set search_path=public as $$
declare previous_xp integer; old_level integer; new_level integer; old_status text; new_status text; milestone integer;
begin
  select coalesce(sum(amount),0)-new.amount into previous_xp from public.xp_transactions where profile_id=new.profile_id;
  old_level:=public.level_for_xp(greatest(previous_xp,0));
  new_level:=public.level_for_xp(greatest(previous_xp+new.amount,0));
  old_status:=public.rep_status_for_level(old_level);
  new_status:=public.rep_status_for_level(new_level);

  if new_status<>old_status then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(new.profile_id,new.profile_id,'rep_status','New REP status','You reached '||new_status||' status at Level '||new_level||'.','/social/profile/'||new.profile_id)
    on conflict do nothing;
  elsif new_level>old_level then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(new.profile_id,new.profile_id,'rep_level','Level up','You reached Level '||new_level||'. Keep building your RCL reputation.','/social/profile/'||new.profile_id)
    on conflict do nothing;
  end if;

  foreach milestone in array array[1000,2500,5000,10000,25000,50000,100000] loop
    if previous_xp<milestone and previous_xp+new.amount>=milestone then
      insert into public.notifications(recipient_id,actor_id,type,title,body,link)
      values(new.profile_id,new.profile_id,'rep_milestone','REP milestone','You reached '||milestone||' REP.','/social/profile/'||new.profile_id)
      on conflict do nothing;
    end if;
  end loop;
  return new;
end $$;
revoke execute on function public.notify_rep_milestone() from public,anon,authenticated;

-- Existing members receive any REP badges they already earned before the
-- badge trigger existed.
insert into public.fan_badges(profile_id,badge_id)
select ul.profile_id,b.id
from public.user_levels ul
join public.badges b on b.is_active=true and b.requirement_type='rep_total'
where ul.xp>=b.requirement_value
on conflict (profile_id,badge_id) do nothing;

commit;
