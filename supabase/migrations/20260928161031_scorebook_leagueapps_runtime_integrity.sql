-- Scorebook, standings, public RLS, and LeagueApps runtime integrity hardening.
--
-- Goals:
-- 1. Restore anonymous EXECUTE on boolean authorization helpers that public RLS policies evaluate.
-- 2. Keep LeagueApps player materialization admin/service-only at the function level.
-- 3. Serialize scorebook writes, lock finalized games, validate game/roster boundaries,
--    rebuild lineups on undo, and make starting-lineup replacement deterministic.
-- 4. Rebuild minutes/plus-minus from complete lineup segments rather than per-event clock gaps.
-- 5. Rank standings by each team's season division, including teams with zero completed games.

-- Public SELECT policies call these SECURITY DEFINER boolean helpers. Anonymous users need
-- EXECUTE permission to evaluate the policy expression; the helpers expose no row data.
grant execute on function public.is_admin() to anon;
grant execute on function public.is_staff_or_admin() to anon;
grant execute on function public.is_coach_of_team(uuid) to anon;
grant execute on function public.is_commissioner(uuid) to anon;

-- LeagueApps registrations are materialized by an authenticated admin or by a server-only
-- service-role sync. Keep the authorization check inside the SECURITY DEFINER function.
create or replace function public.materialize_leagueapps_players()
returns table(inserted integer, updated integer, eligible integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_count integer;
  after_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select count(*) into before_count
  from public.players
  where leagueapps_user_id is not null;

  with ranked as (
    select distinct on ((payload->>'userId')::bigint)
      (payload->>'userId')::bigint user_id,
      nullif(payload->>'userProfileId','')::bigint profile_id,
      trim(payload->>'firstName') first_name,
      trim(payload->>'lastName') last_name,
      nullif(trim(payload->>'city'),'') city,
      case
        when nullif(payload->>'birthDate','') is not null
          then (to_timestamp((payload->>'birthDate')::bigint / 1000) at time zone 'UTC')::date
      end dob,
      coalesce(nullif(payload->>'lastUpdated','')::bigint, 0) last_updated
    from public.leagueapps_records
    where resource = 'registrations-2'
      and payload->>'sport' = 'Basketball'
      and payload->>'role' in ('PLAYER','FREEAGENT')
      and nullif(payload->>'userId','') is not null
      and nullif(trim(payload->>'firstName'),'') is not null
      and nullif(trim(payload->>'lastName'),'') is not null
    order by (payload->>'userId')::bigint,
      coalesce(nullif(payload->>'lastUpdated','')::bigint, 0) desc
  )
  insert into public.players(
    first_name,last_name,date_of_birth,hometown,is_active,
    leagueapps_user_id,leagueapps_profile_id,leagueapps_last_updated
  )
  select first_name,last_name,dob,city,true,user_id,profile_id,last_updated
  from ranked
  on conflict (leagueapps_user_id) where leagueapps_user_id is not null do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    date_of_birth = coalesce(excluded.date_of_birth, players.date_of_birth),
    hometown = coalesce(excluded.hometown, players.hometown),
    leagueapps_profile_id = coalesce(excluded.leagueapps_profile_id, players.leagueapps_profile_id),
    leagueapps_last_updated = excluded.leagueapps_last_updated,
    updated_at = now();

  select count(*) into after_count
  from public.players
  where leagueapps_user_id is not null;

  return query
  select greatest(after_count - before_count, 0), least(before_count, after_count), after_count;
end;
$$;
revoke all on function public.materialize_leagueapps_players() from public, anon;
grant execute on function public.materialize_leagueapps_players() to authenticated, service_role;

-- The structure materializer already performs an internal admin check. Restore authenticated
-- execution so the verified admin API path can invoke it; non-admin callers still fail inside.
revoke execute on function public.materialize_leagueapps_structure() from public, anon;
grant execute on function public.materialize_leagueapps_structure() to authenticated, service_role;

-- Rebuild complete lineup segments. The previous implementation overwrote seconds_played
-- on every event with only the most recent clock gap, causing incorrect minutes and plus/minus.
create or replace function public.rebuild_game_lineups(target_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
  team uuid;
  period integer;
  ev record;
  current_players uuid[];
  current_plus integer;
  current_for integer;
  current_against integer;
  current_possessions integer;
  segment_start numeric;
  segment_key text;
  elapsed integer;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to manage this game';
  end if;

  select * into g
  from public.games
  where id = target_game_id;
  if not found then raise exception 'Game not found'; end if;

  delete from public.game_lineups where game_id = target_game_id;

  foreach team in array array[g.home_team_id, g.away_team_id] loop
    for period in 1..g.period_count loop
      select coalesce(array_agg(x::uuid order by ord), array[]::uuid[])
      into current_players
      from jsonb_array_elements_text(
        coalesce((
          select e.metadata->'starting_lineup'
          from public.game_events e
          where e.game_id = target_game_id
            and e.period_number = period
            and e.team_id = team
            and e.event_type = 'period_start'
            and e.voided_at is null
            and jsonb_typeof(e.metadata->'starting_lineup') = 'array'
          order by e.sequence_no desc
          limit 1
        ), '[]'::jsonb)
      ) with ordinality as t(x, ord);

      -- If the next period has no explicit lineup, carry forward the previous period's
      -- final on-court group. Final segments always end at clock 0.
      if coalesce(array_length(current_players, 1), 0) = 0 and period > 1 then
        select gl.player_ids into current_players
        from public.game_lineups gl
        where gl.game_id = target_game_id
          and gl.team_id = team
          and gl.period_number = period - 1
        order by gl.ended_clock_seconds asc, gl.started_clock_seconds asc
        limit 1;
      end if;

      current_players := coalesce(current_players, array[]::uuid[]);
      segment_start := g.period_length_seconds;
      current_plus := 0;
      current_for := 0;
      current_against := 0;
      current_possessions := 0;
      segment_key := period::text || ':start:' || coalesce(array_to_string(current_players, ','), 'empty');

      for ev in
        select *
        from public.game_events
        where game_id = target_game_id
          and period_number = period
          and voided_at is null
        order by sequence_no
      loop
        if ev.event_type in ('shot_made','free_throw_made','score_adjustment')
          and ev.points <> 0 and ev.team_id is not null then
          if ev.team_id = team then
            current_for := current_for + ev.points;
            current_plus := current_plus + ev.points;
          else
            current_against := current_against + ev.points;
            current_plus := current_plus - ev.points;
          end if;
        end if;

        -- Coarse lineup-possession count: made/missed field goals and turnovers end a
        -- possession more reliably than counting every free throw as a separate trip.
        if ev.team_id = team and ev.event_type in ('shot_made','shot_missed','turnover') then
          current_possessions := current_possessions + 1;
        end if;

        if ev.event_type = 'substitution' and ev.team_id = team then
          elapsed := greatest(0, round(segment_start - ev.clock_seconds))::integer;
          if coalesce(array_length(current_players, 1), 0) > 0 and elapsed > 0 then
            insert into public.game_lineups(
              game_id,team_id,player_ids,period_number,started_clock_seconds,ended_clock_seconds,
              plus_minus,possessions,points_for,points_against,segment_key,seconds_played
            ) values (
              target_game_id,team,current_players,period,segment_start,ev.clock_seconds,
              current_plus,current_possessions,current_for,current_against,segment_key,elapsed
            )
            on conflict (game_id,team_id,segment_key) do update set
              ended_clock_seconds = excluded.ended_clock_seconds,
              plus_minus = excluded.plus_minus,
              possessions = excluded.possessions,
              points_for = excluded.points_for,
              points_against = excluded.points_against,
              seconds_played = excluded.seconds_played;
          end if;

          if ev.player_out_id is not null then
            current_players := array_remove(current_players, ev.player_out_id);
          end if;
          if ev.player_in_id is not null and not (ev.player_in_id = any(current_players)) then
            current_players := array_append(current_players, ev.player_in_id);
          end if;

          segment_start := ev.clock_seconds;
          current_plus := 0;
          current_for := 0;
          current_against := 0;
          current_possessions := 0;
          segment_key := period::text || ':' || ev.sequence_no::text || ':' || coalesce(array_to_string(current_players, ','), 'empty');
        end if;
      end loop;

      elapsed := greatest(0, round(segment_start))::integer;
      if coalesce(array_length(current_players, 1), 0) > 0 and elapsed > 0 then
        insert into public.game_lineups(
          game_id,team_id,player_ids,period_number,started_clock_seconds,ended_clock_seconds,
          plus_minus,possessions,points_for,points_against,segment_key,seconds_played
        ) values (
          target_game_id,team,current_players,period,segment_start,0,
          current_plus,current_possessions,current_for,current_against,segment_key,elapsed
        )
        on conflict (game_id,team_id,segment_key) do update set
          ended_clock_seconds = excluded.ended_clock_seconds,
          plus_minus = excluded.plus_minus,
          possessions = excluded.possessions,
          points_for = excluded.points_for,
          points_against = excluded.points_against,
          seconds_played = excluded.seconds_played;
      end if;
    end loop;
  end loop;

  update public.player_game_stats p
  set minutes = round(coalesce((
    select sum(gl.seconds_played) / 60.0
    from public.game_lineups gl
    where gl.game_id = target_game_id
      and p.player_id = any(gl.player_ids)
  ), 0), 2)
  where p.game_id = target_game_id;

  update public.player_game_stats p
  set plus_minus = coalesce((
    select sum(gl.plus_minus)
    from public.game_lineups gl
    where gl.game_id = target_game_id
      and p.player_id = any(gl.player_ids)
  ), 0)
  where p.game_id = target_game_id;
end;
$$;
revoke execute on function public.rebuild_game_lineups(uuid) from public, anon, authenticated;

-- Replace or create a starting five. A second save for the same period/team replaces the
-- previous period_start instead of being silently ignored by the lineup projection.
create or replace function public.set_starting_lineup(
  target_game_id uuid,
  target_team_id uuid,
  target_period integer,
  target_player_ids uuid[]
)
returns public.game_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
  result public.game_events;
  distinct_count integer;
  rostered_count integer;
  next_sequence integer;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to set the lineup';
  end if;

  select * into g from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if g.status not in ('scheduled','live') or g.scorebook_status in ('final','locked') then
    raise exception 'This scorebook is finalized or unavailable for editing';
  end if;
  if target_team_id not in (g.home_team_id, g.away_team_id) then
    raise exception 'Team is not part of this game';
  end if;
  if target_period < 1 or target_period > g.period_count then
    raise exception 'Period is outside this game configuration';
  end if;
  if coalesce(array_length(target_player_ids,1),0) <> 5 then
    raise exception 'A basketball lineup must contain exactly five players';
  end if;

  select count(distinct player_id) into distinct_count
  from unnest(target_player_ids) as player_id;
  if distinct_count <> 5 then
    raise exception 'Starting lineup must contain five different players';
  end if;

  select count(distinct r.player_id) into rostered_count
  from public.rosters r
  join public.team_seasons ts on ts.id = r.team_season_id
  where ts.season_id = g.season_id
    and ts.team_id = target_team_id
    and r.left_at is null
    and r.player_id = any(target_player_ids);
  if rostered_count <> 5 then
    raise exception 'Every starter must be on the active roster for this team and season';
  end if;

  update public.game_events
  set voided_at = now()
  where game_id = target_game_id
    and team_id = target_team_id
    and period_number = target_period
    and event_type = 'period_start'
    and voided_at is null;

  select coalesce(max(sequence_no),0) + 1 into next_sequence
  from public.game_events where game_id = target_game_id;

  insert into public.game_events(
    game_id,period_number,clock_seconds,sequence_no,event_type,team_id,metadata,created_by
  ) values (
    target_game_id,target_period,g.period_length_seconds,next_sequence,'period_start',target_team_id,
    jsonb_build_object('starting_lineup',to_jsonb(target_player_ids)),auth.uid()
  ) returning * into result;

  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);
  return result;
end;
$$;
revoke execute on function public.set_starting_lineup(uuid,uuid,integer,uuid[]) from public, anon;
grant execute on function public.set_starting_lineup(uuid,uuid,integer,uuid[]) to authenticated;

create or replace function public.record_substitution(
  target_game_id uuid,
  target_team_id uuid,
  target_period integer,
  target_clock_seconds numeric,
  target_player_out uuid,
  target_player_in uuid
)
returns public.game_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
  result public.game_events;
  rostered_count integer;
  next_sequence integer;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to record substitutions';
  end if;

  select * into g from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if g.status not in ('scheduled','live') or g.scorebook_status in ('final','locked') then
    raise exception 'This scorebook is finalized or unavailable for editing';
  end if;
  if target_team_id not in (g.home_team_id, g.away_team_id) then
    raise exception 'Team is not part of this game';
  end if;
  if target_period < 1 or target_period > g.period_count then
    raise exception 'Period is outside this game configuration';
  end if;
  if target_clock_seconds < 0 or target_clock_seconds > g.period_length_seconds then
    raise exception 'Clock value is outside this period';
  end if;
  if target_player_out = target_player_in then
    raise exception 'Substitution players must be different';
  end if;

  select count(distinct r.player_id) into rostered_count
  from public.rosters r
  join public.team_seasons ts on ts.id = r.team_season_id
  where ts.season_id = g.season_id
    and ts.team_id = target_team_id
    and r.left_at is null
    and r.player_id in (target_player_out, target_player_in);
  if rostered_count <> 2 then
    raise exception 'Both substitution players must be on the active roster for this team and season';
  end if;

  select coalesce(max(sequence_no),0) + 1 into next_sequence
  from public.game_events where game_id = target_game_id;

  insert into public.game_events(
    game_id,period_number,clock_seconds,sequence_no,event_type,team_id,
    player_in_id,player_out_id,metadata,created_by
  ) values (
    target_game_id,target_period,target_clock_seconds,next_sequence,'substitution',target_team_id,
    target_player_in,target_player_out,
    jsonb_build_object('player_in',target_player_in,'player_out',target_player_out),auth.uid()
  ) returning * into result;

  update public.games
  set status = case when status = 'scheduled' then 'live' else status end,
      scorebook_status = 'live', updated_at = now()
  where id = target_game_id;

  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);
  return result;
end;
$$;
revoke execute on function public.record_substitution(uuid,uuid,integer,numeric,uuid,uuid) from public, anon;
grant execute on function public.record_substitution(uuid,uuid,integer,numeric,uuid,uuid) to authenticated;

create or replace function public.record_game_event(
  target_game_id uuid,
  p_period_number integer,
  p_clock_seconds numeric,
  p_event_type text,
  p_team_id uuid default null,
  p_player_id uuid default null,
  p_secondary_player_id uuid default null,
  p_player_in_id uuid default null,
  p_player_out_id uuid default null,
  p_points integer default 0,
  p_shot_value integer default null,
  p_shot_result text default null,
  p_shot_x numeric default null,
  p_shot_y numeric default null,
  p_shot_zone text default null,
  p_foul_type text default null,
  p_turnover_type text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.game_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
  next_sequence integer;
  result public.game_events;
  primary_rostered boolean;
  secondary_rostered boolean;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to score this game';
  end if;

  -- Lock the game before assigning sequence_no so simultaneous scorer devices cannot
  -- choose the same sequence number.
  select * into g from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if g.status not in ('scheduled','live') or g.scorebook_status in ('final','locked') then
    raise exception 'This scorebook is finalized or unavailable for editing';
  end if;
  if p_period_number < 1 or p_period_number > g.period_count then
    raise exception 'Period is outside this game configuration';
  end if;
  if p_clock_seconds < 0 or p_clock_seconds > g.period_length_seconds then
    raise exception 'Clock value is outside this period';
  end if;
  if p_team_id is not null and p_team_id not in (g.home_team_id, g.away_team_id) then
    raise exception 'Team is not part of this game';
  end if;
  if (p_player_id is not null or p_secondary_player_id is not null) and p_team_id is null then
    raise exception 'Player events require a team';
  end if;

  if p_player_id is not null then
    select exists (
      select 1 from public.rosters r
      join public.team_seasons ts on ts.id = r.team_season_id
      where r.player_id = p_player_id
        and r.left_at is null
        and ts.season_id = g.season_id
        and ts.team_id = p_team_id
    ) into primary_rostered;
    if not primary_rostered then
      raise exception 'Selected player is not on the active roster for this team and season';
    end if;
  end if;

  if p_secondary_player_id is not null then
    select exists (
      select 1 from public.rosters r
      join public.team_seasons ts on ts.id = r.team_season_id
      where r.player_id = p_secondary_player_id
        and r.left_at is null
        and ts.season_id = g.season_id
        and ts.team_id = p_team_id
    ) into secondary_rostered;
    if not secondary_rostered then
      raise exception 'Secondary player is not on the active roster for this team and season';
    end if;
  end if;

  if (p_shot_x is null) <> (p_shot_y is null) then
    raise exception 'Shot coordinates must include both x and y';
  end if;
  if p_shot_x is not null and (p_shot_x < 0 or p_shot_x > 100 or p_shot_y < 0 or p_shot_y > 100) then
    raise exception 'Shot coordinates must be between 0 and 100';
  end if;

  if p_event_type = 'shot_made' and (p_shot_value not in (2,3) or p_points <> p_shot_value or p_shot_result is distinct from 'made') then
    raise exception 'Made field goals require matching 2/3 point value and made result';
  elsif p_event_type = 'shot_missed' and (p_shot_value not in (2,3) or p_points <> 0 or p_shot_result is distinct from 'missed') then
    raise exception 'Missed field goals require 2/3 point value, zero points, and missed result';
  elsif p_event_type = 'free_throw_made' and (p_points <> 1 or coalesce(p_shot_value,1) <> 1 or p_shot_result is distinct from 'made') then
    raise exception 'Made free throws require one point and made result';
  elsif p_event_type = 'free_throw_missed' and (p_points <> 0 or coalesce(p_shot_value,1) <> 1 or p_shot_result is distinct from 'missed') then
    raise exception 'Missed free throws require zero points and missed result';
  elsif p_event_type not in ('shot_made','shot_missed','free_throw_made','free_throw_missed','score_adjustment') and p_points <> 0 then
    raise exception 'This event type cannot add points';
  end if;

  select coalesce(max(sequence_no),0) + 1 into next_sequence
  from public.game_events where game_id = target_game_id;

  insert into public.game_events(
    game_id,period_number,clock_seconds,sequence_no,event_type,team_id,player_id,
    secondary_player_id,player_in_id,player_out_id,points,shot_value,shot_result,
    shot_x,shot_y,shot_zone,foul_type,turnover_type,metadata,created_by
  ) values (
    target_game_id,p_period_number,p_clock_seconds,next_sequence,p_event_type,p_team_id,p_player_id,
    p_secondary_player_id,p_player_in_id,p_player_out_id,coalesce(p_points,0),p_shot_value,p_shot_result,
    p_shot_x,p_shot_y,p_shot_zone,p_foul_type,p_turnover_type,coalesce(p_metadata,'{}'::jsonb),auth.uid()
  ) returning * into result;

  update public.games
  set status = case when status = 'scheduled' then 'live' else status end,
      scorebook_status = 'live', updated_at = now()
  where id = target_game_id;

  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);
  return result;
end;
$$;
revoke execute on function public.record_game_event(uuid,integer,numeric,text,uuid,uuid,uuid,uuid,uuid,integer,integer,text,numeric,numeric,text,text,text,jsonb) from public, anon;
grant execute on function public.record_game_event(uuid,integer,numeric,text,uuid,uuid,uuid,uuid,uuid,integer,integer,text,numeric,numeric,text,text,text,jsonb) to authenticated;

create or replace function public.void_game_event(target_event_id uuid)
returns public.game_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.game_events;
  g public.games%rowtype;
begin
  select * into result from public.game_events where id = target_event_id;
  if not found then raise exception 'Event not found'; end if;
  if not public.can_manage_game(result.game_id) then
    raise exception 'You are not authorized to edit this game';
  end if;

  select * into g from public.games where id = result.game_id for update;
  if g.status not in ('scheduled','live') or g.scorebook_status in ('final','locked') then
    raise exception 'This scorebook is finalized or unavailable for editing';
  end if;

  update public.game_events
  set voided_at = now()
  where id = target_event_id and voided_at is null
  returning * into result;

  perform public.rebuild_game_stats(result.game_id);
  perform public.rebuild_game_lineups(result.game_id);
  return result;
end;
$$;
revoke execute on function public.void_game_event(uuid) from public, anon;
grant execute on function public.void_game_event(uuid) to authenticated;

create or replace function public.set_game_scorebook_mode(target_game_id uuid, target_mode text)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to manage this game';
  end if;
  if target_mode not in ('quick','pro') then
    raise exception 'Scorebook mode must be quick or pro';
  end if;

  select * into g from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if g.status not in ('scheduled','live') or g.scorebook_status in ('final','locked') then
    raise exception 'This scorebook is finalized or unavailable for editing';
  end if;

  update public.games
  set scorebook_mode = target_mode, updated_at = now()
  where id = target_game_id
  returning * into g;
  return g;
end;
$$;
revoke execute on function public.set_game_scorebook_mode(uuid,text) from public, anon;
grant execute on function public.set_game_scorebook_mode(uuid,text) to authenticated;

-- Completed games are immutable to coaches. Staff/admin can deliberately reopen a final game
-- for correction; standings are immediately rebuilt to remove the no-longer-final result.
create or replace function public.reopen_game_scorebook(target_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Staff or admin access required to reopen a final scorebook';
  end if;

  select * into g from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;

  update public.games
  set status = 'live', scorebook_status = 'live', updated_at = now()
  where id = target_game_id
  returning * into g;

  perform public.rebuild_season_standings(g.season_id);
  return g;
end;
$$;
revoke execute on function public.reopen_game_scorebook(uuid) from public, anon;
grant execute on function public.reopen_game_scorebook(uuid) to authenticated;

create or replace function public.finalize_game_scorebook(target_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.games;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to finalize this game';
  end if;

  select * into result from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if result.status = 'completed' or result.scorebook_status in ('final','locked') then
    raise exception 'This scorebook is already finalized';
  end if;
  if result.status not in ('scheduled','live') then
    raise exception 'This game is not available for scoring';
  end if;

  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);

  update public.games
  set status = 'completed', scorebook_status = 'final', updated_at = now()
  where id = target_game_id
  returning * into result;

  perform public.rebuild_season_standings(result.season_id);
  return result;
end;
$$;
revoke execute on function public.finalize_game_scorebook(uuid) from public, anon;
grant execute on function public.finalize_game_scorebook(uuid) to authenticated;

-- Standings follow each team's team_seasons division, not games.division_id. This supports
-- cross-division games and keeps zero-game teams visible at 0-0.
create or replace function public.rebuild_season_standings(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.standings where season_id = target_season_id;

  with completed_games as (
    select home_team_id, away_team_id, home_score, away_score
    from public.games
    where season_id = target_season_id and status = 'completed'
  ),
  team_results as (
    select home_team_id as team_id,
      case when home_score > away_score then 1 else 0 end as wins,
      case when home_score < away_score then 1 else 0 end as losses,
      case when home_score = away_score then 1 else 0 end as ties,
      home_score as points_for,
      away_score as points_against
    from completed_games
    union all
    select away_team_id,
      case when away_score > home_score then 1 else 0 end,
      case when away_score < home_score then 1 else 0 end,
      case when away_score = home_score then 1 else 0 end,
      away_score,
      home_score
    from completed_games
  ),
  totals as (
    select ts.division_id, ts.team_id,
      coalesce(sum(tr.wins),0)::integer as wins,
      coalesce(sum(tr.losses),0)::integer as losses,
      coalesce(sum(tr.ties),0)::integer as ties,
      coalesce(sum(tr.points_for),0)::integer as points_for,
      coalesce(sum(tr.points_against),0)::integer as points_against
    from public.team_seasons ts
    left join team_results tr on tr.team_id = ts.team_id
    where ts.season_id = target_season_id
    group by ts.division_id, ts.team_id
  ),
  ranked as (
    select *, row_number() over (
      partition by division_id
      order by wins desc, losses asc, (points_for - points_against) desc, points_for desc, team_id
    )::integer as rank
    from totals
  )
  insert into public.standings(
    season_id,division_id,team_id,wins,losses,ties,points_for,points_against,rank,updated_at
  )
  select target_season_id,division_id,team_id,wins,losses,ties,points_for,points_against,rank,now()
  from ranked;
end;
$$;
revoke execute on function public.rebuild_season_standings(uuid) from public, anon, authenticated;
