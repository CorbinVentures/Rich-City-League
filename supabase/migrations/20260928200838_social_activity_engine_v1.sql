begin;

-- RCL Network activity engine v1.
-- Keep the league as the authoritative source of truth while turning meaningful
-- official events into transparent, idempotent social content.

-- Game finals stay concise. A second GameDay post is reserved for a meaningful
-- standout performance so the feed gains basketball stories without duplicating
-- every line of the box score.
create or replace function public.announce_completed_game()
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
  top_player_id uuid;
  top_profile_id uuid;
  top_name text;
  top_points integer;
  top_rebounds integer;
  top_assists integer;
  post_body text;
  star_body text;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;

  select id into bot_id
  from public.profiles
  where is_system_account=true and system_account_key='rcl-gameday' and is_active=true
  limit 1;
  if bot_id is null then return new; end if;

  select name into home_name from public.teams where id=new.home_team_id;
  select name into away_name from public.teams where id=new.away_team_id;
  if home_name is null or away_name is null then return new; end if;

  winner_name := case
    when new.home_score > new.away_score then home_name
    when new.away_score > new.home_score then away_name
    else null
  end;

  post_body := '🏀 FINAL\n\n'||away_name||' '||new.away_score||' — '||home_name||' '||new.home_score;
  if winner_name is not null then
    post_body := post_body||'\n\n'||winner_name||' gets the win.';
  else
    post_body := post_body||'\n\nGame ends tied.';
  end if;
  post_body := post_body||'\n\nBox score + official stats: /games/'||new.id||'\n\n#RCLGameDay #RichCityLeague';

  insert into public.posts(author_id,body,media_urls,status,is_automated,automation_type,automation_source_id)
  values(bot_id,post_body,'[]'::jsonb,'published',true,'game_final',new.id)
  on conflict (automation_type,automation_source_id)
    where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set body=excluded.body;

  select pgs.player_id,
         p.profile_id,
         coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'RCL Player'),
         coalesce(pgs.points,0),coalesce(pgs.rebounds,0),coalesce(pgs.assists,0)
  into top_player_id,top_profile_id,top_name,top_points,top_rebounds,top_assists
  from public.player_game_stats pgs
  left join public.players p on p.id=pgs.player_id
  where pgs.game_id=new.id
  order by pgs.points desc,pgs.assists desc,pgs.rebounds desc,pgs.player_id
  limit 1;

  if top_player_id is not null and (
    coalesce(top_points,0) >= 18 or
    coalesce(top_rebounds,0) >= 10 or
    coalesce(top_assists,0) >= 7
  ) then
    star_body := '🔥 GAME STAR\n\n'||top_name||' made an impact: '||
      coalesce(top_points,0)||' PTS · '||coalesce(top_rebounds,0)||' REB · '||coalesce(top_assists,0)||' AST.'||
      '\n\nFrom '||away_name||' vs '||home_name||'. Full game: /games/'||new.id||
      '\n\n#RCLGameDay #RCLPlayers';

    insert into public.posts(author_id,body,media_urls,status,target_profile_id,is_automated,automation_type,automation_source_id)
    values(bot_id,star_body,'[]'::jsonb,'published',top_profile_id,true,'game_star',new.id)
    on conflict (automation_type,automation_source_id)
      where is_automated=true and automation_type is not null and automation_source_id is not null
    do update set body=excluded.body,target_profile_id=excluded.target_profile_id;
  end if;

  return new;
end
$$;

revoke execute on function public.announce_completed_game() from public,anon,authenticated;

-- REP already drives notifications and badges. Promote only major public moments
-- into the feed: status upgrades and large cumulative milestones. Routine level
-- changes stay private so the network is not flooded with low-signal automation.
create or replace function public.announce_rep_social_milestone()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  bot_id uuid;
  member_name text;
  member_is_system boolean:=false;
  total_rep integer;
  previous_rep integer;
  old_level integer;
  new_level integer;
  old_status text;
  new_status text;
  crossed_milestone integer:=null;
  candidate integer;
  post_body text;
  event_type text;
begin
  if new.amount <= 0 then return new; end if;

  select coalesce(is_system_account,false),coalesce(display_name,username,'RCL Member')
  into member_is_system,member_name
  from public.profiles where id=new.profile_id;
  if member_is_system then return new; end if;

  select id into bot_id
  from public.profiles
  where is_system_account=true and system_account_key='rcl-rep' and is_active=true
  limit 1;
  if bot_id is null then return new; end if;

  select coalesce(sum(amount),0) into total_rep
  from public.xp_transactions where profile_id=new.profile_id;
  previous_rep := greatest(total_rep-new.amount,0);

  old_level := public.level_for_xp(previous_rep);
  new_level := public.level_for_xp(total_rep);
  old_status := public.rep_status_for_level(old_level);
  new_status := public.rep_status_for_level(new_level);

  foreach candidate in array array[1000,2500,5000,10000,25000,50000,100000] loop
    if previous_rep < candidate and total_rep >= candidate then crossed_milestone := candidate; end if;
  end loop;

  if new_status is distinct from old_status then
    event_type := 'rep_status';
    post_body := '⚡ REP STATUS UP\n\n'||member_name||' reached '||new_status||' status at Level '||new_level||'.'||
      '\n\n'||total_rep||' REP and climbing. #RCLREP #RichCityLeague';
  elsif crossed_milestone is not null then
    event_type := 'rep_milestone';
    post_body := '⚡ REP MILESTONE\n\n'||member_name||' just crossed '||crossed_milestone||' REP.'||
      '\n\nReputation is built through real activity in the RCL Network. #RCLREP #RichCityLeague';
  else
    return new;
  end if;

  insert into public.posts(author_id,body,media_urls,status,target_profile_id,is_automated,automation_type,automation_source_id)
  values(bot_id,post_body,'[]'::jsonb,'published',new.profile_id,true,event_type,new.id)
  on conflict (automation_type,automation_source_id)
    where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set body=excluded.body,target_profile_id=excluded.target_profile_id;

  return new;
end
$$;

revoke execute on function public.announce_rep_social_milestone() from public,anon,authenticated;

drop trigger if exists announce_rep_social_milestone_after_insert on public.xp_transactions;
create trigger announce_rep_social_milestone_after_insert
after insert on public.xp_transactions
for each row execute function public.announce_rep_social_milestone();

commit;
