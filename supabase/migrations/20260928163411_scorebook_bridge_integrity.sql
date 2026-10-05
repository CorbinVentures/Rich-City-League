-- Deep integrity pass: public RLS helpers, LeagueApps admin reconciliation, and Game IQ scorebook.

-- Public read policies reference these SECURITY DEFINER boolean helpers. Anonymous
-- callers need EXECUTE permission to evaluate the policy expressions; auth.uid()
-- remains null for anonymous requests, so the helpers still return false.
grant execute on function public.is_admin() to anon;
grant execute on function public.is_staff_or_admin() to anon;
grant execute on function public.is_coach_of_team(uuid) to anon;
grant execute on function public.is_commissioner(uuid) to anon;

-- These reconciliation RPCs already enforce public.is_admin() internally. Restore
-- authenticated execution so the verified admin-only API route can complete them.
grant execute on function public.materialize_leagueapps_players() to authenticated;
grant execute on function public.materialize_leagueapps_structure() to authenticated;

create or replace function public.can_edit_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_game(target_game_id)
    and exists (
      select 1
      from public.games g
      where g.id = target_game_id
        and g.status <> 'completed'::public.game_status
        and g.scorebook_status not in ('final','locked')
    );
$$;
revoke execute on function public.can_edit_game(uuid) from public, anon;
grant execute on function public.can_edit_game(uuid) to authenticated;

-- Final/locked game event streams remain publicly readable but cannot be changed.
drop policy if exists "authorized coaches and staff manage game events" on public.game_events;
create policy "authorized coaches and staff manage game events"
  on public.game_events for all
  using ((select public.can_edit_game(game_id)))
  with check ((select public.can_edit_game(game_id)));

drop policy if exists "authorized coaches and staff manage game lineups" on public.game_lineups;
create policy "authorized coaches and staff manage game lineups"
  on public.game_lineups for all
  using ((select public.can_edit_game(game_id)))
  with check ((select public.can_edit_game(game_id)));

-- Rebuild lineup segments only at substitution boundaries. During a live period,
-- minutes stop at the latest recorded event instead of being projected to 0:00.
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
  previous_players uuid[];
  segment_start numeric;
  segment_end numeric;
  current_plus integer;
  current_for integer;
  current_against integer;
  current_possessions integer;
  segment_key text;
  latest_period integer;
  elapsed integer;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to manage this game';
  end if;

  select * into g from public.games where id = target_game_id;
  if not found then raise exception 'Game not found'; end if;

  select coalesce(max(period_number), 1)
    into latest_period
    from public.game_events
    where game_id = target_game_id and voided_at is null;

  delete from public.game_lineups where game_id = target_game_id;

  foreach team in array array[g.home_team_id, g.away_team_id] loop
    previous_players := array[]::uuid[];

    for period in 1..g.period_count loop
      current_players := array[]::uuid[];

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
          order by e.sequence_no
          limit 1
        ), '[]'::jsonb)
      ) with ordinality as t(x, ord);

      if coalesce(array_length(current_players, 1), 0) = 0
         and period > 1
         and period <= latest_period then
        current_players := previous_players;
      end if;

      -- Do not create future-period minutes before that period has any activity.
      if period > latest_period and not exists (
        select 1 from public.game_events e
        where e.game_id = target_game_id
          and e.period_number = period
          and e.team_id = team
          and e.event_type = 'period_start'
          and e.voided_at is null
      ) then
        continue;
      end if;

      segment_start := g.period_length_seconds;
      current_plus := 0;
      current_for := 0;
      current_against := 0;
      current_possessions := 0;
      segment_key := period::text || ':0:' || coalesce(array_to_string(current_players, ','), 'empty');

      for ev in
        select *
        from public.game_events
        where game_id = target_game_id
          and period_number = period
          and voided_at is null
        order by sequence_no
      loop
        if ev.event_type = 'substitution' and ev.team_id = team then
          elapsed := greatest(0, round(segment_start - ev.clock_seconds));
          if coalesce(array_length(current_players, 1), 0) > 0 and elapsed > 0 then
            insert into public.game_lineups(
              game_id, team_id, player_ids, period_number,
              started_clock_seconds, ended_clock_seconds,
              plus_minus, possessions, points_for, points_against,
              segment_key, seconds_played
            ) values (
              target_game_id, team, current_players, period,
              segment_start, ev.clock_seconds,
              current_plus, current_possessions, current_for, current_against,
              segment_key, elapsed
            )
            on conflict (game_id, team_id, segment_key) do update set
              player_ids = excluded.player_ids,
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
          continue;
        end if;

        if ev.event_type in ('shot_made','free_throw_made','score_adjustment') and ev.points <> 0 then
          if ev.team_id = team then
            current_for := current_for + ev.points;
            current_plus := current_plus + ev.points;
          elsif ev.team_id is not null then
            current_against := current_against + ev.points;
            current_plus := current_plus - ev.points;
          end if;
        end if;

        if ev.event_type in ('shot_made','shot_missed','turnover') then
          current_possessions := current_possessions + 1;
        end if;
      end loop;

      if g.status = 'completed'::public.game_status or g.scorebook_status in ('final','locked') or period < latest_period then
        segment_end := 0;
      else
        select coalesce((
          select e.clock_seconds
          from public.game_events e
          where e.game_id = target_game_id
            and e.period_number = period
            and e.voided_at is null
          order by e.sequence_no desc
          limit 1
        ), g.period_length_seconds)
        into segment_end;
      end if;

      elapsed := greatest(0, round(segment_start - segment_end));
      if coalesce(array_length(current_players, 1), 0) > 0 and elapsed > 0 then
        insert into public.game_lineups(
          game_id, team_id, player_ids, period_number,
          started_clock_seconds, ended_clock_seconds,
          plus_minus, possessions, points_for, points_against,
          segment_key, seconds_played
        ) values (
          target_game_id, team, current_players, period,
          segment_start, segment_end,
          current_plus, current_possessions, current_for, current_against,
          segment_key, elapsed
        )
        on conflict (game_id, team_id, segment_key) do update set
          player_ids = excluded.player_ids,
          ended_clock_seconds = excluded.ended_clock_seconds,
          plus_minus = excluded.plus_minus,
          possessions = excluded.possessions,
          points_for = excluded.points_for,
          points_against = excluded.points_against,
          seconds_played = excluded.seconds_played;
      end if;

      previous_players := current_players;
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
  result public.game_events;
  g public.games%rowtype;
  valid_players integer;
begin
  select * into g from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if not public.can_edit_game(target_game_id) then
    raise exception 'This scorebook is final or locked and cannot be edited';
  end if;
  if target_team_id not in (g.home_team_id, g.away_team_id) then
    raise exception 'Team is not part of this game';
  end if;
  if target_period < 1 or target_period > g.period_count then
    raise exception 'Period is outside this game format';
  end if;
  if coalesce(array_length(target_player_ids, 1), 0) <> 5
     or (select count(distinct value) from unnest(target_player_ids) value) <> 5 then
    raise exception 'A basketball lineup must contain five different players';
  end if;

  select count(distinct r.player_id)
    into valid_players
  from public.rosters r
  join public.team_seasons ts on ts.id = r.team_season_id
  where ts.season_id = g.season_id
    and ts.team_id = target_team_id
    and r.left_at is null
    and r.player_id = any(target_player_ids);
  if valid_players <> 5 then
    raise exception 'Every starter must be on this team roster for the game season';
  end if;

  select * into result
  from public.game_events
  where game_id = target_game_id
    and team_id = target_team_id
    and period_number = target_period
    and event_type = 'period_start'
    and voided_at is null
  order by sequence_no
  limit 1
  for update;

  if found then
    update public.game_events
    set clock_seconds = g.period_length_seconds,
        metadata = jsonb_build_object('starting_lineup', to_jsonb(target_player_ids))
    where id = result.id
    returning * into result;
  else
    insert into public.game_events(
      game_id, period_number, clock_seconds, sequence_no,
      event_type, team_id, metadata, created_by
    )
    select target_game_id, target_period, g.period_length_seconds,
      coalesce(max(sequence_no), 0) + 1,
      'period_start', target_team_id,
      jsonb_build_object('starting_lineup', to_jsonb(target_player_ids)), auth.uid()
    from public.game_events
    where game_id = target_game_id
    returning * into result;
  end if;

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
  result public.game_events;
  g public.games%rowtype;
  current_players uuid[];
  valid_players integer;
begin
  select * into g from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if not public.can_edit_game(target_game_id) then
    raise exception 'This scorebook is final or locked and cannot be edited';
  end if;
  if target_team_id not in (g.home_team_id, g.away_team_id) then
    raise exception 'Team is not part of this game';
  end if;
  if target_period < 1 or target_period > g.period_count then
    raise exception 'Period is outside this game format';
  end if;
  if target_clock_seconds < 0 or target_clock_seconds > g.period_length_seconds then
    raise exception 'Clock is outside the current period';
  end if;
  if target_player_out = target_player_in then
    raise exception 'Substitution players must be different';
  end if;

  select count(distinct r.player_id)
    into valid_players
  from public.rosters r
  join public.team_seasons ts on ts.id = r.team_season_id
  where ts.season_id = g.season_id
    and ts.team_id = target_team_id
    and r.left_at is null
    and r.player_id in (target_player_out, target_player_in);
  if valid_players <> 2 then
    raise exception 'Both substitution players must be on this team roster';
  end if;

  perform public.rebuild_game_lineups(target_game_id);
  select gl.player_ids into current_players
  from public.game_lineups gl
  where gl.game_id = target_game_id
    and gl.team_id = target_team_id
    and gl.period_number = target_period
  order by gl.started_clock_seconds asc, gl.created_at desc
  limit 1;

  if coalesce(array_length(current_players, 1), 0) <> 5 then
    raise exception 'Set the starting five before recording substitutions';
  end if;
  if not (target_player_out = any(current_players)) then
    raise exception 'Player OUT is not currently on the floor';
  end if;
  if target_player_in = any(current_players) then
    raise exception 'Player IN is already on the floor';
  end if;

  insert into public.game_events(
    game_id, period_number, clock_seconds, sequence_no, event_type, team_id,
    player_in_id, player_out_id, metadata, created_by
  )
  select target_game_id, target_period, target_clock_seconds,
    coalesce(max(sequence_no), 0) + 1,
    'substitution', target_team_id, target_player_in, target_player_out,
    jsonb_build_object('player_in', target_player_in, 'player_out', target_player_out), auth.uid()
  from public.game_events
  where game_id = target_game_id
  returning * into result;

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
  next_sequence integer;
  result public.game_events;
  g public.games%rowtype;
begin
  select * into g from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if not public.can_edit_game(target_game_id) then
    raise exception 'This scorebook is final or locked and cannot be edited';
  end if;
  if p_period_number < 1 or p_period_number > g.period_count then
    raise exception 'Period is outside this game format';
  end if;
  if p_clock_seconds < 0 or p_clock_seconds > g.period_length_seconds then
    raise exception 'Clock is outside the current period';
  end if;
  if p_team_id is not null and p_team_id not in (g.home_team_id, g.away_team_id) then
    raise exception 'Team is not part of this game';
  end if;

  if p_player_id is not null and not exists (
    select 1
    from public.rosters r
    join public.team_seasons ts on ts.id = r.team_season_id
    where r.player_id = p_player_id
      and r.left_at is null
      and ts.season_id = g.season_id
      and ts.team_id = p_team_id
  ) then
    raise exception 'Selected player is not on this team roster for the game season';
  end if;

  if p_secondary_player_id is not null and not exists (
    select 1
    from public.rosters r
    join public.team_seasons ts on ts.id = r.team_season_id
    where r.player_id = p_secondary_player_id
      and r.left_at is null
      and ts.season_id = g.season_id
      and ts.team_id = p_team_id
  ) then
    raise exception 'Secondary player is not on this team roster for the game season';
  end if;

  if p_event_type in ('shot_made','shot_missed') and p_shot_value not in (2,3) then
    raise exception 'Field-goal events require a 2PT or 3PT shot value';
  end if;
  if p_event_type = 'shot_made' and coalesce(p_points, 0) <> p_shot_value then
    raise exception 'Made field-goal points must match the shot value';
  end if;
  if p_event_type = 'shot_missed' and coalesce(p_points, 0) <> 0 then
    raise exception 'Missed field goals cannot add points';
  end if;
  if p_event_type = 'free_throw_made' and coalesce(p_points, 0) <> 1 then
    raise exception 'Made free throws must add one point';
  end if;
  if p_event_type = 'free_throw_missed' and coalesce(p_points, 0) <> 0 then
    raise exception 'Missed free throws cannot add points';
  end if;

  select coalesce(max(sequence_no), 0) + 1
    into next_sequence
  from public.game_events
  where game_id = target_game_id;

  insert into public.game_events(
    game_id, period_number, clock_seconds, sequence_no, event_type, team_id, player_id,
    secondary_player_id, player_in_id, player_out_id, points, shot_value, shot_result,
    shot_x, shot_y, shot_zone, foul_type, turnover_type, metadata, created_by
  ) values (
    target_game_id, p_period_number, p_clock_seconds, next_sequence, p_event_type, p_team_id, p_player_id,
    p_secondary_player_id, p_player_in_id, p_player_out_id, coalesce(p_points, 0), p_shot_value, p_shot_result,
    p_shot_x, p_shot_y, p_shot_zone, p_foul_type, p_turnover_type, coalesce(p_metadata, '{}'::jsonb), auth.uid()
  )
  returning * into result;

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
declare result public.game_events;
begin
  select * into result from public.game_events where id = target_event_id for update;
  if not found then raise exception 'Event not found'; end if;
  if not public.can_edit_game(result.game_id) then
    raise exception 'This scorebook is final or locked and cannot be edited';
  end if;
  if result.voided_at is not null then return result; end if;

  update public.game_events
  set voided_at = now()
  where id = target_event_id
  returning * into result;

  perform public.rebuild_game_stats(result.game_id);
  perform public.rebuild_game_lineups(result.game_id);
  return result;
end;
$$;
revoke execute on function public.void_game_event(uuid) from public, anon;
grant execute on function public.void_game_event(uuid) to authenticated;

-- Standings use each team's season/division assignment, not a game's single
-- division_id. This keeps cross-division games valid while ranking each team
-- inside its own division and preserves zero-game teams.
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
    where season_id = target_season_id and status = 'completed'::public.game_status
  ),
  team_results as (
    select hts.division_id, g.home_team_id as team_id,
      (g.home_score > g.away_score)::int wins,
      (g.home_score < g.away_score)::int losses,
      (g.home_score = g.away_score)::int ties,
      g.home_score points_for, g.away_score points_against
    from completed_games g
    join public.team_seasons hts
      on hts.season_id = target_season_id and hts.team_id = g.home_team_id
    union all
    select ats.division_id, g.away_team_id,
      (g.away_score > g.home_score)::int,
      (g.away_score < g.home_score)::int,
      (g.away_score = g.home_score)::int,
      g.away_score, g.home_score
    from completed_games g
    join public.team_seasons ats
      on ats.season_id = target_season_id and ats.team_id = g.away_team_id
  ),
  totals as (
    select division_id, team_id,
      sum(wins)::integer wins,
      sum(losses)::integer losses,
      sum(ties)::integer ties,
      sum(points_for)::integer points_for,
      sum(points_against)::integer points_against
    from team_results
    group by division_id, team_id
  ),
  base as (
    select ts.division_id, ts.team_id,
      coalesce(t.wins, 0)::integer wins,
      coalesce(t.losses, 0)::integer losses,
      coalesce(t.ties, 0)::integer ties,
      coalesce(t.points_for, 0)::integer points_for,
      coalesce(t.points_against, 0)::integer points_against
    from public.team_seasons ts
    left join totals t
      on t.team_id = ts.team_id
     and t.division_id is not distinct from ts.division_id
    where ts.season_id = target_season_id
  ),
  ranked as (
    select *,
      row_number() over (
        partition by division_id
        order by wins desc, losses asc, (points_for - points_against) desc, points_for desc, team_id
      )::integer as rank
    from base
  )
  insert into public.standings(
    season_id, division_id, team_id, wins, losses, ties,
    points_for, points_against, rank, updated_at
  )
  select target_season_id, division_id, team_id, wins, losses, ties,
    points_for, points_against, rank, now()
  from ranked;
end;
$$;
revoke execute on function public.rebuild_season_standings(uuid) from public, anon, authenticated;

create or replace function public.finalize_game_scorebook(target_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare result public.games;
begin
  perform 1 from public.games where id = target_game_id for update;
  if not found then raise exception 'Game not found'; end if;
  if not public.can_edit_game(target_game_id) then
    raise exception 'This scorebook is already final or locked';
  end if;

  update public.games
  set status = 'completed'::public.game_status,
      scorebook_status = 'final',
      updated_at = now()
  where id = target_game_id
  returning * into result;

  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);
  perform public.rebuild_season_standings(result.season_id);

  select * into result from public.games where id = target_game_id;
  return result;
end;
$$;
revoke execute on function public.finalize_game_scorebook(uuid) from public, anon;
grant execute on function public.finalize_game_scorebook(uuid) to authenticated;
