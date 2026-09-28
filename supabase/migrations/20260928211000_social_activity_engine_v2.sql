begin;

-- RCL Network activity engine v2.
-- Turn a small set of authoritative basketball state transitions into social
-- objects while keeping the feed high-signal and idempotent.

-- Upgrade the existing run announcement with richer context, a direct Runs
-- link, and profile targeting so the host also sees the official activity on
-- their public basketball identity.
create or replace function public.announce_new_run()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  host_name text;
  bot_id uuid;
  starts_label text;
begin
  if new.status <> 'open' or new.starts_at <= now() then return new; end if;

  select id into bot_id
  from public.profiles
  where is_system_account=true and system_account_key='rcl-runs' and is_active=true
  limit 1;
  if bot_id is null then return new; end if;

  select coalesce(display_name,username,'RCL Member') into host_name
  from public.profiles where id=new.host_id;

  starts_label := to_char(new.starts_at at time zone 'America/New_York', 'Dy, Mon FMDD · FMHH12:MI AM');

  insert into public.posts(
    author_id,body,media_urls,status,target_profile_id,
    is_automated,automation_type,automation_source_id
  )
  values(
    bot_id,
    '🏀 NEW RCL RUN\n\n'||new.title||
    '\n'||upper(new.game_format)||' · '||replace(initcap(new.skill_level),'_',' ')||
    '\n'||new.court_name||' · '||new.location||
    '\n'||starts_label||' ET'||
    '\nHosted by '||coalesce(host_name,'RCL Member')||
    '\n\nJoin the run: /runs\n\n#RCLRuns #RichmondBasketball',
    '[]'::jsonb,'published',new.host_id,
    true,'run_created',new.id
  )
  on conflict (automation_type,automation_source_id)
    where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set
    body=excluded.body,
    target_profile_id=excluded.target_profile_id;

  return new;
end
$$;

revoke execute on function public.announce_new_run() from public,anon,authenticated;

-- Badge progression remains visible on every profile, but only Gold and Elite
-- unlocks become network-wide stories. This prevents routine progression from
-- overwhelming the feed as the member base grows.
create or replace function public.announce_badge_unlock()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  member_name text;
  badge_name text;
  badge_icon text;
  badge_tier text;
  badge_description text;
  bot_id uuid;
begin
  select name,coalesce(icon,'🏆'),lower(tier),description
  into badge_name,badge_icon,badge_tier,badge_description
  from public.badges
  where id=new.badge_id and is_active=true;

  if badge_name is null or badge_tier not in ('gold','elite') then return new; end if;

  select id into bot_id
  from public.profiles
  where is_system_account=true and system_account_key='rcl-rep' and is_active=true
  limit 1;
  if bot_id is null then return new; end if;

  select coalesce(display_name,username,'RCL Member') into member_name
  from public.profiles where id=new.profile_id;

  insert into public.posts(
    author_id,body,media_urls,status,target_profile_id,
    is_automated,automation_type,automation_source_id
  )
  values(
    bot_id,
    badge_icon||' '||upper(badge_tier)||' BADGE UNLOCKED\n\n'||
    coalesce(member_name,'RCL Member')||' earned '||badge_name||'.'||
    case when nullif(trim(badge_description),'') is not null then '\n'||badge_description else '' end||
    '\n\nView the achievement: /social/profile/'||new.profile_id||
    '\n\n#RCLBadges #RCLREP',
    '[]'::jsonb,'published',new.profile_id,
    true,'badge_unlock',new.id
  )
  on conflict (automation_type,automation_source_id)
    where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set
    body=excluded.body,
    target_profile_id=excluded.target_profile_id;

  return new;
end
$$;

revoke execute on function public.announce_badge_unlock() from public,anon,authenticated;

-- Draft Night can generate dozens of selections. Publish the first round as
-- individual identity moments, then publish one completion summary. Later-round
-- picks remain available on the Draft board without flooding the Network feed.
create or replace function public.announce_first_round_draft_pick()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  bot_id uuid;
  draft_name text;
  team_name text;
  player_name text;
  player_profile_id uuid;
begin
  if new.round_number <> 1 then return new; end if;

  select id into bot_id
  from public.profiles
  where is_system_account=true and system_account_key='rcl' and is_active=true
  limit 1;
  if bot_id is null then return new; end if;

  select name into draft_name from public.drafts where id=new.draft_id;
  select name into team_name from public.teams where id=new.team_id;
  select profile_id,
         coalesce(nullif(trim(concat_ws(' ',first_name,last_name)),''),'RCL Player')
  into player_profile_id,player_name
  from public.players where id=new.player_id;

  insert into public.posts(
    author_id,body,media_urls,status,target_profile_id,
    is_automated,automation_type,automation_source_id
  )
  values(
    bot_id,
    '🎙️ DRAFT NIGHT · PICK #'||new.pick_number||
    '\n\n'||coalesce(team_name,'RCL Team')||' selects '||coalesce(player_name,'RCL Player')||'.'||
    '\nRound 1 · '||coalesce(draft_name,'Rich City League Draft')||
    '\n\nFollow the board: /draft\n\n#RCLDraft #RichCityLeague',
    '[]'::jsonb,'published',player_profile_id,
    true,'draft_pick_round1',new.id
  )
  on conflict (automation_type,automation_source_id)
    where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set
    body=excluded.body,
    target_profile_id=excluded.target_profile_id;

  return new;
end
$$;

revoke execute on function public.announce_first_round_draft_pick() from public,anon,authenticated;

drop trigger if exists announce_first_round_draft_pick_after_insert on public.draft_picks;
create trigger announce_first_round_draft_pick_after_insert
after insert on public.draft_picks
for each row execute function public.announce_first_round_draft_pick();

create or replace function public.announce_draft_complete()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  bot_id uuid;
  pick_count integer;
begin
  if new.status <> 'COMPLETED' or old.status = 'COMPLETED' then return new; end if;

  select id into bot_id
  from public.profiles
  where is_system_account=true and system_account_key='rcl' and is_active=true
  limit 1;
  if bot_id is null then return new; end if;

  select count(*) into pick_count from public.draft_picks where draft_id=new.id;

  insert into public.posts(
    author_id,body,media_urls,status,
    is_automated,automation_type,automation_source_id
  )
  values(
    bot_id,
    '✅ DRAFT COMPLETE\n\n'||new.name||' is in the books.'||
    '\n'||pick_count||' players selected. The next chapter starts now.'||
    '\n\nSee the full board: /draft\n\n#RCLDraft #RichCityLeague',
    '[]'::jsonb,'published',
    true,'draft_complete',new.id
  )
  on conflict (automation_type,automation_source_id)
    where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set body=excluded.body;

  return new;
end
$$;

revoke execute on function public.announce_draft_complete() from public,anon,authenticated;

drop trigger if exists announce_draft_complete_after_update on public.drafts;
create trigger announce_draft_complete_after_update
after update of status on public.drafts
for each row execute function public.announce_draft_complete();

-- Fantasy results become social only when a matchup reaches an authoritative
-- final state. Scheduled/live score changes never create timeline noise.
create or replace function public.announce_fantasy_matchup_final()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  bot_id uuid;
  home_name text;
  away_name text;
  winner_name text;
  winner_manager_id uuid;
begin
  if new.status <> 'final' or old.status = 'final' then return new; end if;

  select id into bot_id
  from public.profiles
  where is_system_account=true and system_account_key='rcl-fantasy' and is_active=true
  limit 1;
  if bot_id is null then return new; end if;

  select name into home_name from public.fantasy_teams where id=new.home_team_id;
  select name into away_name from public.fantasy_teams where id=new.away_team_id;

  if new.winner_team_id is not null then
    select name,manager_id into winner_name,winner_manager_id
    from public.fantasy_teams where id=new.winner_team_id;
  end if;

  insert into public.posts(
    author_id,body,media_urls,status,target_profile_id,
    is_automated,automation_type,automation_source_id
  )
  values(
    bot_id,
    '🏆 RCL FANTASY FINAL · WEEK '||new.week_number||
    '\n\n'||coalesce(away_name,'Away')||' '||new.away_points||' — '||
    coalesce(home_name,'Home')||' '||new.home_points||
    case when winner_name is not null then '\n\n'||winner_name||' gets the win.' else '\n\nMatchup ends even.' end||
    '\n\nFantasy hub: /fantasy\n\n#RCLFantasy #RichCityLeague',
    '[]'::jsonb,'published',winner_manager_id,
    true,'fantasy_matchup_final',new.id
  )
  on conflict (automation_type,automation_source_id)
    where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set
    body=excluded.body,
    target_profile_id=excluded.target_profile_id;

  return new;
end
$$;

revoke execute on function public.announce_fantasy_matchup_final() from public,anon,authenticated;

drop trigger if exists announce_fantasy_matchup_final_after_update on public.fantasy_matchups;
create trigger announce_fantasy_matchup_final_after_update
after update of status on public.fantasy_matchups
for each row execute function public.announce_fantasy_matchup_final();

commit;
