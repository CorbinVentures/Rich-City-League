begin;

alter table public.run_games
  add column if not exists target_score integer not null default 11
    check (target_score between 1 and 250),
  add column if not exists scoring_profile text not null default 'one_two_three'
    check (scoring_profile in ('one_two_three','two_three')),
  add column if not exists started_at timestamptz,
  add column if not exists action_sequence bigint not null default 0 check (action_sequence>=0);

create table public.run_game_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.run_games(id) on delete restrict,
  run_id uuid not null references public.runs(id) on delete restrict,
  sequence_no bigint not null,
  action_type text not null check (action_type in ('score','stat','undo')),
  team_id uuid references public.run_teams(id) on delete restrict,
  player_id uuid references public.profiles(id) on delete restrict,
  score_value integer,
  stat_type text,
  undoes_action_id uuid unique references public.run_game_actions(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(game_id,sequence_no),
  constraint run_game_actions_shape check (
    (action_type='score' and team_id is not null and player_id is not null
      and score_value in (1,2,3) and stat_type is null and undoes_action_id is null)
    or (action_type='stat' and team_id is not null and player_id is not null
      and score_value is null and stat_type in ('rebound','assist','steal','block','turnover','defensive_stop','three_attempted')
      and undoes_action_id is null)
    or (action_type='undo' and team_id is null and player_id is null
      and score_value is null and stat_type is null and undoes_action_id is not null)
  )
);
create index run_game_actions_game_recent_idx on public.run_game_actions(game_id,created_at desc);
create index run_game_actions_player_idx on public.run_game_actions(game_id,player_id,action_type,stat_type);

alter table public.run_game_actions enable row level security;
revoke all on public.run_game_actions from public,anon,authenticated;
grant select on public.run_game_actions to authenticated;
create policy run_game_actions_visible_to_run_players on public.run_game_actions
  for select to authenticated using (
    coalesce(public.is_staff_or_admin(),false)
    or exists (select 1 from public.runs r where r.id=run_id and r.host_id=(select auth.uid()))
    or exists (select 1 from public.run_players p where p.run_id=run_game_actions.run_id and p.profile_id=(select auth.uid()))
    or exists (select 1 from public.rch_run_operators o where o.run_id=run_game_actions.run_id
      and o.profile_id=(select auth.uid()) and o.role in ('scorekeeper','cohost'))
  );

-- All in-game changes go through the audited RPCs below. This prevents clients
-- from silently editing the aggregate score outside the action timeline.
drop policy if exists "run hosts manage games" on public.run_games;
revoke insert,update,delete on public.run_games from authenticated;

create or replace function public.rch_start_run_game(
  p_run uuid,p_home_team uuid,p_away_team uuid,p_target_score integer default 11,
  p_scoring_profile text default 'one_two_three'
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r public.runs%rowtype; gid uuid;
begin
  if actor is null then raise exception 'Sign in to start a game'; end if;
  if not public.can_manage_run(p_run) then raise exception 'Only the run host or RCH staff can start a game'; end if;
  if p_home_team is null or p_away_team is null or p_home_team=p_away_team then
    raise exception 'Choose two different teams';
  end if;
  if p_target_score not between 1 and 250 then raise exception 'Choose a target score from 1 to 250'; end if;
  if p_scoring_profile not in ('one_two_three','two_three') then raise exception 'Choose a supported scoring profile'; end if;
  select * into r from public.runs where id=p_run for update;
  if not found or r.status not in ('open','full') then raise exception 'This Run is not available for a new game'; end if;
  if now()<r.starts_at-interval '2 hours' or now()>r.starts_at+interval '6 hours' then
    raise exception 'Game mode opens two hours before the Run and closes six hours after it starts';
  end if;
  if not exists(select 1 from public.run_teams t where t.id=p_home_team and t.run_id=p_run)
     or not exists(select 1 from public.run_teams t where t.id=p_away_team and t.run_id=p_run) then
    raise exception 'Both teams must belong to this Run';
  end if;
  if not exists(select 1 from public.run_team_members m where m.run_id=p_run and m.run_team_id=p_home_team)
     or not exists(select 1 from public.run_team_members m where m.run_id=p_run and m.run_team_id=p_away_team) then
    raise exception 'Assign at least one registered player to each team before starting';
  end if;
  if exists(select 1 from public.run_games g where g.run_id=p_run and g.status='live'
    and (g.home_run_team_id in (p_home_team,p_away_team) or g.away_run_team_id in (p_home_team,p_away_team))) then
    raise exception 'One of these teams already has a live game';
  end if;
  insert into public.run_games(run_id,home_run_team_id,away_run_team_id,status,created_by,target_score,scoring_profile,started_at)
  values(p_run,p_home_team,p_away_team,'live',actor,p_target_score,p_scoring_profile,now()) returning id into gid;
  return gid;
end $$;

create or replace function public.rch_record_run_game_action(
  p_game uuid,p_action text,p_team uuid default null,p_player uuid default null,
  p_score integer default null,p_stat text default null,p_undo uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); g public.run_games%rowtype; action_id uuid; v_seq bigint;
  prior public.run_game_actions%rowtype; current_last uuid; next_score integer;
begin
  if actor is null then raise exception 'Sign in before recording game action'; end if;
  select * into g from public.run_games where id=p_game for update;
  if not found then raise exception 'Game not found'; end if;
  if not public.can_manage_run(g.run_id) then raise exception 'Only the run host or RCH staff can operate the scoreboard'; end if;
  if g.status<>'live' then raise exception 'This game is not live'; end if;

  if p_action='score' then
    if p_team not in (g.home_run_team_id,g.away_run_team_id) or p_player is null or p_score not in (1,2,3) then
      raise exception 'Choose the scoring team, player, and a valid basket value';
    end if;
    if p_score=1 and g.scoring_profile='two_three' then raise exception 'This Run uses two- and three-point baskets'; end if;
    if not exists(select 1 from public.run_team_members m where m.run_id=g.run_id and m.run_team_id=p_team and m.profile_id=p_player) then
      raise exception 'Scoring player must be assigned to that team';
    end if;
    if p_team=g.home_run_team_id then next_score:=g.home_score+p_score;
      update public.run_games set home_score=next_score,action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
    else next_score:=g.away_score+p_score;
      update public.run_games set away_score=next_score,action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
    end if;
    insert into public.run_game_actions(game_id,run_id,sequence_no,action_type,team_id,player_id,score_value,created_by)
    values(g.id,g.run_id,v_seq,'score',p_team,p_player,p_score,actor) returning id into action_id;
    return action_id;
  elsif p_action='stat' then
    if p_team not in (g.home_run_team_id,g.away_run_team_id) or p_player is null
      or p_stat not in ('rebound','assist','steal','block','turnover','defensive_stop','three_attempted') then
      raise exception 'Choose a rostered player and a supported stat';
    end if;
    if not exists(select 1 from public.run_team_members m where m.run_id=g.run_id and m.run_team_id=p_team and m.profile_id=p_player) then
      raise exception 'Stat player must be assigned to that team';
    end if;
    update public.run_games set action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
    insert into public.run_game_actions(game_id,run_id,sequence_no,action_type,team_id,player_id,stat_type,created_by)
    values(g.id,g.run_id,v_seq,'stat',p_team,p_player,p_stat,actor) returning id into action_id;
    return action_id;
  elsif p_action='undo' then
    if p_undo is null then raise exception 'Choose the last action to undo'; end if;
    select * into prior from public.run_game_actions a
      where a.id=p_undo and a.game_id=g.id and a.action_type in ('score','stat') for update;
    if not found or exists(select 1 from public.run_game_actions u where u.undoes_action_id=p_undo) then
      raise exception 'This action can no longer be undone';
    end if;
    select a.id into current_last from public.run_game_actions a
      where a.game_id=g.id and a.action_type in ('score','stat')
        and not exists(select 1 from public.run_game_actions u where u.undoes_action_id=a.id)
      order by a.sequence_no desc limit 1;
    if current_last is distinct from p_undo then raise exception 'Undo the most recent game action first'; end if;
    if prior.action_type='score' then
      if prior.team_id=g.home_run_team_id then
        update public.run_games set home_score=greatest(0,home_score-prior.score_value),action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
      else update public.run_games set away_score=greatest(0,away_score-prior.score_value),action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
      end if;
    else
      update public.run_games set action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
    end if;
    insert into public.run_game_actions(game_id,run_id,sequence_no,action_type,undoes_action_id,created_by)
    values(g.id,g.run_id,v_seq,'undo',p_undo,actor) returning id into action_id;
    return action_id;
  end if;
  raise exception 'Choose score, stat, or undo';
end $$;

create or replace function public.rch_finish_run_game(p_game uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); g public.run_games%rowtype;
begin
  if actor is null then raise exception 'Sign in to finish a game'; end if;
  select * into g from public.run_games where id=p_game for update;
  if not found then raise exception 'Game not found'; end if;
  if not public.can_manage_run(g.run_id) then raise exception 'Only the run host or RCH staff can finish a game'; end if;
  if g.status<>'live' then raise exception 'This game is no longer live'; end if;
  if g.home_score+g.away_score=0 then raise exception 'Record at least one basket before finishing'; end if;
  update public.run_games set status='completed',played_at=now() where id=g.id;
  return g.id;
end $$;

create or replace function public.get_rch_verified_run_box_score_leaderboard(
  p_scope text default 'state',p_city text default 'Richmond',p_limit integer default 30
) returns table(
  profile_id uuid,player_name text,avatar_url text,city text,games bigint,
  ppg numeric,apg numeric,rpg numeric,wins bigint,rep integer,player_level integer
) language plpgsql stable security definer set search_path='' as $$
begin
  if p_scope not in ('state','city') then raise exception 'Choose city or statewide rankings'; end if;
  return query
    with verified_lines as (
      select s.profile_id,s.match_id,s.points,s.assists,s.rebounds,
        (m.home_score>m.away_score and s.profile_id=any(m.home_roster))
          or (m.away_score>m.home_score and s.profile_id=any(m.away_roster)) as won
      from public.rch_match_skill_box_scores s
      join public.run_ranked_matches m on m.id=s.match_id
      where s.review_status='verified' and m.status='verified'
    ), totals as (
      select v.profile_id,count(*)::bigint as games,
        round(avg(v.points)::numeric,1) as ppg,
        round(avg(v.assists)::numeric,1) as apg,
        round(avg(v.rebounds)::numeric,1) as rpg,
        count(*) filter(where v.won)::bigint as wins
      from verified_lines v group by v.profile_id
    ), visible_players as (
      select t.*,coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player') as player_name,
        p.avatar_url,
        case when exists(select 1 from public.basketball_locations l
          where lower(l.locality)=lower(trim(split_part(coalesce(p.location,''),',',1))))
          then left(trim(split_part(p.location,',',1)),45) else 'Virginia' end as city,
        coalesce(levels.xp,0) as rep,coalesce(levels.level,1) as player_level
      from totals t join public.profiles p on p.id=t.profile_id
      left join public.user_levels levels on levels.profile_id=t.profile_id
      where p.is_active=true and not coalesce(p.is_system_account,false)
        and coalesce(p.profile_visibility,'public')='public'
    )
    select v.profile_id,v.player_name::text,v.avatar_url::text,v.city::text,v.games,
      v.ppg,v.apg,v.rpg,v.wins,v.rep,v.player_level
    from visible_players v
    where p_scope<>'city' or lower(v.city)=lower(left(trim(coalesce(p_city,'')),45))
    order by v.wins desc,v.ppg desc,v.games desc,v.profile_id
    limit least(greatest(coalesce(p_limit,30),1),50);
end $$;

-- A Run may contain many finished games and stays open for the full event.
-- Match-level verification, not the parent Run's lifecycle, gates box scores.
create or replace function public.rch_submit_match_skill_stats(
 p_match uuid,p_player uuid,p_points integer,p_rebounds integer,p_assists integer,
 p_three_made integer,p_three_attempted integer,p_steals integer,
 p_blocks integer,p_turnovers integer,p_defensive_stops integer,p_source_note text
) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();m public.run_ranked_matches%rowtype;r public.runs%rowtype;
 v_side text;v_team_score integer;
begin
 if actor is null then raise exception 'Sign in as an authorized scorekeeper';end if;
 select * into m from public.run_ranked_matches where id=p_match for update;
 if not found or m.status<>'verified' or m.verified_at is null
 then raise exception 'An independently verified match is required';end if;
 select * into r from public.runs where id=m.run_id;
 if r.run_type<>'competitive' or r.status not in ('open','full','completed') or r.starts_at>now()
 then raise exception 'A started competitive Run and independently verified match are required';end if;
 if not (actor=r.host_id or coalesce(public.is_staff_or_admin(),false)
   or exists(select 1 from public.rch_run_operators o where o.run_id=r.id
       and o.profile_id=actor and o.role in ('scorekeeper','cohost')))
 then raise exception 'Only an authorized event scorekeeper may record a skill receipt';end if;
 if actor=p_player then raise exception 'A player cannot record their own mastery evidence';end if;
 select side into v_side from public.run_ranked_match_players
  where match_id=p_match and profile_id=p_player;
 if v_side is null or not exists(select 1 from public.run_checkins c
    where c.run_id=m.run_id and c.profile_id=p_player)
 then raise exception 'The player must be on the verified roster and checked in';end if;
 v_team_score:=case when v_side='home' then m.home_score else m.away_score end;
 if p_points is null or p_points<0 or p_points>v_team_score
    or p_rebounds is not null and p_rebounds not between 0 and 50
    or p_assists is not null and p_assists not between 0 and 50
    or p_three_made is not null and p_three_made not between 0 and 50
    or p_three_attempted is not null and p_three_attempted not between 0 and 80
    or p_three_made is not null and (p_three_attempted is null or p_three_made>p_three_attempted)
    or p_steals is not null and p_steals not between 0 and 30
    or p_blocks is not null and p_blocks not between 0 and 30
    or p_turnovers is not null and p_turnovers not between 0 and 40
    or p_defensive_stops is not null and p_defensive_stops not between 0 and 80
    or char_length(trim(coalesce(p_source_note,''))) not between 10 and 300
 then raise exception 'Invalid or incomplete match-specific statistical evidence';end if;
 if m.game_format='1v1' and coalesce(p_assists,0)>0
 then raise exception '1v1 cannot generate assists';end if;
 insert into public.rch_match_skill_box_scores
 (match_id,profile_id,points,rebounds,assists,three_made,three_attempted,steals,blocks,turnovers,defensive_stops,source_note,recorded_by)
 values(p_match,p_player,p_points,p_rebounds,p_assists,p_three_made,p_three_attempted,p_steals,p_blocks,p_turnovers,p_defensive_stops,trim(p_source_note),actor)
 on conflict(match_id,profile_id) do update set
 points=excluded.points,rebounds=excluded.rebounds,assists=excluded.assists,
 three_made=excluded.three_made,three_attempted=excluded.three_attempted,
 steals=excluded.steals,blocks=excluded.blocks,turnovers=excluded.turnovers,
 defensive_stops=excluded.defensive_stops,source_note=excluded.source_note,
 recorded_by=excluded.recorded_by,review_status='pending',reviewed_by=null,reviewed_at=null,updated_at=now()
 where public.rch_match_skill_box_scores.review_status in ('pending','rejected');
 if not found then raise exception 'Verified evidence is locked; use the audited correction process';end if;
end $$;

create or replace function public.rch_review_match_skill_stats(p_match uuid,p_player uuid,p_approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();s public.rch_match_skill_box_scores%rowtype;
 m public.run_ranked_matches%rowtype;r public.runs%rowtype;
 v_side text;v_team_score integer;v_approved_points integer;
begin
 if actor is null then raise exception 'Sign in to review evidence';end if;
 select * into m from public.run_ranked_matches where id=p_match for update;
 if not found then raise exception 'Official match not found';end if;
 select * into s from public.rch_match_skill_box_scores
  where match_id=p_match and profile_id=p_player for update;
 if not found or s.review_status<>'pending' then raise exception 'No pending score to review';end if;
 select * into r from public.runs where id=m.run_id;
 if actor=s.recorded_by or actor=s.profile_id then raise exception 'Evidence requires a different independent reviewer';end if;
 if not (actor=r.host_id or coalesce(public.is_staff_or_admin(),false)
   or exists(select 1 from public.rch_run_operators o where o.run_id=m.run_id
     and o.profile_id=actor and o.role in ('scorekeeper','cohost')))
 then raise exception 'Unauthorized match reviewer';end if;
 if m.status<>'verified' or m.verified_at is null or r.status not in ('open','full','completed')
 then raise exception 'Only a final verified match in an available Run qualifies';end if;
 if p_approve then
  select mp.side into v_side from public.run_ranked_match_players mp
   where mp.match_id=p_match and mp.profile_id=p_player;
  if v_side is null then raise exception 'Player is not on the official verified roster';end if;
  v_team_score:=case when v_side='home' then m.home_score else m.away_score end;
  select coalesce(sum(other.points),0)::integer into v_approved_points
  from public.rch_match_skill_box_scores other
  join public.run_ranked_match_players teammate on teammate.match_id=other.match_id and teammate.profile_id=other.profile_id
  where other.match_id=p_match and other.profile_id<>p_player
    and other.review_status='verified' and teammate.side=v_side;
  if v_approved_points+s.points>v_team_score then raise exception 'Approved teammate points exceed the final official score';end if;
  if m.game_format='1v1' and s.points<>v_team_score then raise exception '1v1 points must equal the independently verified game score';end if;
 end if;
 update public.rch_match_skill_box_scores set
  review_status=case when p_approve then 'verified' else 'rejected' end,
  reviewed_by=actor,reviewed_at=now(),updated_at=now()
 where match_id=p_match and profile_id=p_player;
end $$;

create or replace function public.get_rch_skill_mastery(p_profile uuid default null)
returns table (
 badge_code text,badge_name text,discipline text,description text,
 qualifying_games bigint,verified_games bigint,tier text,tier_index integer,
 next_target integer,progress_percent integer,qualifying_sessions bigint,
 next_sessions integer,rule_version integer
) language sql stable security definer set search_path='' as $$
with allowed as (
 select p.id from public.profiles p where p.id=coalesce(p_profile,(select auth.uid()))
 and p.is_active and not coalesce(p.is_system_account,false)
 and (p.id=(select auth.uid()) or coalesce(p.profile_visibility,'public') not in ('private','only_me'))
), evidence as (
 select s.*,m.run_id,m.game_format,m.home_score,m.away_score,mp.side,
 case when mp.side='home' then m.home_score else m.away_score end as team_score,
 case when mp.side='home' then m.home_score>m.away_score else m.away_score>m.home_score end as won
 from public.rch_match_skill_box_scores s
 join allowed a on a.id=s.profile_id
 join public.run_ranked_matches m on m.id=s.match_id
 join public.run_ranked_match_players mp on mp.match_id=m.id and mp.profile_id=s.profile_id
 join public.runs r on r.id=m.run_id
 where s.review_status='verified' and s.reviewed_by<>s.recorded_by and s.reviewed_by<>s.profile_id
 and s.reviewed_at is not null and m.status='verified' and m.verified_at is not null
 and r.run_type='competitive' and r.status in ('open','full','completed') and r.starts_at<=now()
 and exists(select 1 from public.run_checkins c where c.run_id=m.run_id and c.profile_id=s.profile_id)
), scored as (
 select e.*,
 (e.points>=case e.game_format when '1v1' then 7 when '2v2' then 7 when '3v3' then 7 when '4v4' then 9 when '5v5' then 10 else 251 end
 and (e.game_format='1v1' or e.points*100>=e.team_score*30)) as good_scoring,
 (e.rebounds is not null and e.rebounds>=case e.game_format when '1v1' then 5 when '2v2' then 5 when '3v3' then 6 when '4v4' then 7 when '5v5' then 8 else 51 end) as good_glass,
 (e.game_format<>'1v1' and e.assists is not null and e.assists>=case e.game_format when '2v2' then 3 when '3v3' then 4 when '4v4' then 5 when '5v5' then 6 else 51 end) as good_creation
 from evidence e
), qualifications as (
 select x.run_id,x.match_id,b.code,
 case b.code
 when 'certified_bucket' then x.good_scoring
 when 'winning_scorer' then x.good_scoring and x.won
 when 'glass_cleaner' then x.good_glass
 when 'floor_general' then x.good_creation
 when 'double_double' then (case when x.good_scoring then 1 else 0 end + case when x.good_glass then 1 else 0 end + case when x.good_creation then 1 else 0 end)>=2
 when 'sniper' then x.three_made>=2 and x.three_attempted>=4 and x.three_made*100>=x.three_attempted*40
 when 'ball_hawk' then x.steals>=2
 when 'rim_protector' then x.blocks>=2
 when 'two_way_threat' then x.good_scoring and (coalesce(x.steals,0)>=2 or coalesce(x.blocks,0)>=2 or coalesce(x.defensive_stops,0)>=3)
 else false end as qualified
 from scored x cross join public.rch_skill_badge_catalog b where b.active
), totals as (
 select b.code,b.title,b.discipline,b.description,b.rule_version,
 count(distinct q.match_id) filter(where q.qualified)::bigint as q,
 count(distinct q.run_id) filter(where q.qualified)::bigint as sessions,
 (select count(*) from evidence)::bigint as verified_count
 from public.rch_skill_badge_catalog b left join qualifications q on q.code=b.code
 where b.active group by b.code,b.title,b.discipline,b.description,b.rule_version
), tiers as (
 select t.*,case when q>=75 and sessions>=20 then 5 when q>=40 and sessions>=12 then 4
 when q>=20 and sessions>=8 then 3 when q>=8 and sessions>=4 then 2 when q>=3 and sessions>=2 then 1 else 0 end as current_tier
 from totals t
)
select t.code,t.title,t.discipline,t.description,t.q,t.verified_count,
 (array['locked','bronze','silver','gold','hall_of_fame','legend'])[t.current_tier+1]::text,
 t.current_tier::integer,(array[3,8,20,40,75,75])[t.current_tier+1]::integer,
 case when t.current_tier=5 then 100 else least(99,floor(100.0*t.q/(array[3,8,20,40,75,75])[t.current_tier+1])::integer) end,
 t.sessions,(array[2,4,8,12,20,20])[t.current_tier+1]::integer,t.rule_version
from tiers t where exists(select 1 from allowed) order by t.discipline,t.title
$$;

revoke all on function public.rch_start_run_game(uuid,uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.rch_record_run_game_action(uuid,text,uuid,uuid,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.rch_finish_run_game(uuid) from public,anon,authenticated;
revoke all on function public.get_rch_verified_run_box_score_leaderboard(text,text,integer) from public,anon,authenticated;
grant execute on function public.rch_start_run_game(uuid,uuid,uuid,integer,text) to authenticated;
grant execute on function public.rch_record_run_game_action(uuid,text,uuid,uuid,integer,text,uuid) to authenticated;
grant execute on function public.rch_finish_run_game(uuid) to authenticated;
grant execute on function public.get_rch_verified_run_box_score_leaderboard(text,text,integer) to anon,authenticated;
revoke all on function public.rch_submit_match_skill_stats(uuid,uuid,integer,integer,integer,integer,integer,integer,integer,integer,integer,text) from public,anon,authenticated;
revoke all on function public.rch_review_match_skill_stats(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.rch_submit_match_skill_stats(uuid,uuid,integer,integer,integer,integer,integer,integer,integer,integer,integer,text) to authenticated;
grant execute on function public.rch_review_match_skill_stats(uuid,uuid,boolean) to authenticated;
revoke all on function public.get_rch_skill_mastery(uuid) from public,anon,authenticated;
grant execute on function public.get_rch_skill_mastery(uuid) to anon,authenticated;
revoke all on function public.submit_competitive_run_stats(uuid,integer,integer,integer,boolean) from public,anon,authenticated;
revoke all on function public.review_competitive_run_stats(uuid,boolean) from public,anon,authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='run_game_actions') then
    execute 'alter publication supabase_realtime add table public.run_game_actions';
  end if;
end $$;

commit;
