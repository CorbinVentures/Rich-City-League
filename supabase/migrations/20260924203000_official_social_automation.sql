begin;

-- Official RCL automation foundation.
-- These are transparent system identities, not fake members. Automated posts
-- are labeled in metadata and never receive REP from social engagement.

alter table public.profiles
  add column if not exists is_system_account boolean not null default false,
  add column if not exists system_account_key text;

create unique index if not exists profiles_system_account_key_unique
  on public.profiles(system_account_key)
  where system_account_key is not null;

alter table public.posts
  add column if not exists is_automated boolean not null default false,
  add column if not exists automation_type text,
  add column if not exists automation_source_id uuid;

create unique index if not exists posts_automation_event_unique
  on public.posts(automation_type, automation_source_id)
  where is_automated=true and automation_type is not null and automation_source_id is not null;

-- Automated/system content must never farm REP.
create or replace function public.award_social_rep()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; reward integer; reason_name text; source_name text; source_uuid uuid; target_uuid uuid; owner uuid; claim_rows integer:=0; daily_claims integer:=0; actor_is_system boolean:=false;
begin
  if tg_table_name='posts' then
    actor:=new.author_id; reward:=20; reason_name:='quality_content'; source_name:='post'; source_uuid:=new.id; target_uuid:=new.id;
    if coalesce(new.status,'')<>'published' or coalesce(new.is_automated,false) then return new; end if;
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
  select coalesce(is_system_account,false) into actor_is_system from public.profiles where id=actor;
  if actor_is_system then return new; end if;

  insert into public.social_rep_claims(profile_id,action_type,target_id)
  values(actor,tg_table_name::text,target_uuid)
  on conflict do nothing;
  get diagnostics claim_rows = row_count;
  if claim_rows=0 then return new; end if;

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

-- Staff can designate existing profiles as official automation identities.
create or replace function public.configure_system_account(
  target_profile uuid,
  account_key text,
  display_label text default null
)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_staff_or_admin() then raise exception 'Not authorized'; end if;
  if nullif(trim(account_key),'') is null then raise exception 'System account key is required'; end if;
  update public.profiles
  set is_system_account=true,
      system_account_key=lower(trim(account_key)),
      display_name=coalesce(nullif(trim(display_label),''),display_name),
      updated_at=now()
  where id=target_profile;
  if not found then raise exception 'Profile not found'; end if;
end $$;
grant execute on function public.configure_system_account(uuid,text,text) to authenticated;

-- Trusted event publisher. Only staff/admin can invoke it.
create or replace function public.publish_official_social_post(
  account_key text,
  post_body text,
  event_type text,
  source_uuid uuid
)
returns uuid language plpgsql security definer set search_path=public as $$
declare bot_id uuid; created_id uuid;
begin
  if not public.is_staff_or_admin() then raise exception 'Not authorized'; end if;
  if length(trim(coalesce(post_body,'')))<1 then raise exception 'Post body is required'; end if;
  select id into bot_id from public.profiles
    where is_system_account=true and system_account_key=lower(trim(account_key)) and is_active=true
    limit 1;
  if bot_id is null then raise exception 'System account not configured: %',account_key; end if;

  insert into public.posts(author_id,body,media_urls,status,is_automated,automation_type,automation_source_id)
  values(bot_id,trim(post_body),'{}'::text[],'published',true,event_type,source_uuid)
  on conflict (automation_type,automation_source_id) where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set body=excluded.body
  returning id into created_id;
  return created_id;
end $$;
grant execute on function public.publish_official_social_post(text,text,text,uuid) to authenticated;

-- Badge unlocks become an official RCL REP post once @RCLRep is configured.
create or replace function public.announce_badge_unlock()
returns trigger language plpgsql security definer set search_path=public as $$
declare member_name text; badge_name text; badge_icon text; bot_id uuid;
begin
  select id into bot_id from public.profiles where is_system_account=true and system_account_key='rcl-rep' and is_active=true limit 1;
  if bot_id is null then return new; end if;
  select coalesce(display_name,username,'RCL Member') into member_name from public.profiles where id=new.profile_id;
  select name,coalesce(icon,'🏆') into badge_name,badge_icon from public.badges where id=new.badge_id;
  if badge_name is null then return new; end if;

  insert into public.posts(author_id,body,media_urls,status,is_automated,automation_type,automation_source_id)
  values(bot_id,badge_icon||' BADGE UNLOCKED\n\n'||member_name||' just earned '||badge_name||'.\n\nBuild your REP. Earn your place. #RCLBadges #RCLREP',
         '{}'::text[],'published',true,'badge_unlock',new.id)
  on conflict (automation_type,automation_source_id) where is_automated=true and automation_type is not null and automation_source_id is not null
  do nothing;
  return new;
end $$;

drop trigger if exists announce_badge_unlock_after_insert on public.fan_badges;
create trigger announce_badge_unlock_after_insert
after insert on public.fan_badges for each row execute function public.announce_badge_unlock();
revoke execute on function public.announce_badge_unlock() from public,anon,authenticated;

-- New runs can be surfaced automatically by @RCLRuns.
create or replace function public.announce_new_run()
returns trigger language plpgsql security definer set search_path=public as $$
declare host_name text; bot_id uuid;
begin
  if new.status<>'open' or new.starts_at<=now() then return new; end if;
  select id into bot_id from public.profiles where is_system_account=true and system_account_key='rcl-runs' and is_active=true limit 1;
  if bot_id is null then return new; end if;
  select coalesce(display_name,username,'RCL Member') into host_name from public.profiles where id=new.host_id;
  insert into public.posts(author_id,body,media_urls,status,is_automated,automation_type,automation_source_id)
  values(bot_id,'🏀 NEW RCL RUN\n\n'||new.title||' • '||new.game_format||' • '||new.location||
         '\nHosted by '||host_name||'\n\nTap Runs to claim a spot. #RCLRuns #RichmondBasketball',
         '{}'::text[],'published',true,'run_created',new.id)
  on conflict (automation_type,automation_source_id) where is_automated=true and automation_type is not null and automation_source_id is not null
  do nothing;
  return new;
end $$;

drop trigger if exists announce_new_run_after_insert on public.runs;
create trigger announce_new_run_after_insert
after insert on public.runs for each row execute function public.announce_new_run();
revoke execute on function public.announce_new_run() from public,anon,authenticated;

commit;
