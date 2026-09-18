-- RCL GAME IQ v2: lineup tracking, minutes and plus/minus derived from substitutions.
alter table public.game_lineups
  add column if not exists segment_key text,
  add column if not exists seconds_played integer not null default 0;

create unique index if not exists game_lineups_segment_key_idx
  on public.game_lineups(game_id, team_id, segment_key);

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
  prev_clock numeric;
  current_plus integer;
  current_for integer;
  current_against integer;
  segment_start numeric;
  segment_key text;
  home_score integer := 0;
  away_score integer := 0;
  prev_home integer := 0;
  prev_away integer := 0;
  elapsed integer;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to manage this game';
  end if;

  select * into g from public.games where id=target_game_id;
  if not found then raise exception 'Game not found'; end if;

  delete from public.game_lineups where game_id=target_game_id;

  foreach team in array array[g.home_team_id,g.away_team_id] loop
    for period in 1..g.period_count loop
      current_players := array[]::uuid[];
      select coalesce(
        array_agg(x::uuid order by ord),
        array[]::uuid[]
      )
      into current_players
      from jsonb_array_elements_text(
        coalesce((
          select e.metadata->'starting_lineup'
          from public.game_events e
          where e.game_id=target_game_id
            and e.period_number=period
            and e.team_id=team
            and e.event_type='period_start'
            and jsonb_typeof(e.metadata->'starting_lineup')='array'
          order by e.sequence_no
          limit 1
        ), '[]'::jsonb)
      ) with ordinality as t(x,ord);

      if coalesce(array_length(current_players,1),0) = 0 and period > 1 then
        select gl.player_ids into current_players
        from public.game_lineups gl
        where gl.game_id=target_game_id and gl.team_id=team and gl.period_number=period-1
        order by gl.id desc limit 1;
      end if;

      prev_clock := g.period_length_seconds;
      segment_start := prev_clock;
      current_plus := 0;
      current_for := 0;
      current_against := 0;
      segment_key := period::text || ':0:' || coalesce(array_to_string(current_players,','),'empty');

      for ev in
        select *
        from public.game_events
        where game_id=target_game_id
          and period_number=period
          and voided_at is null
          and team_id is not null
        order by sequence_no
      loop
        elapsed := greatest(0, round(prev_clock - ev.clock_seconds));
        if coalesce(array_length(current_players,1),0) > 0 and elapsed > 0 then
          insert into public.game_lineups(
            game_id,team_id,player_ids,period_number,started_clock_seconds,ended_clock_seconds,
            plus_minus,possessions,points_for,points_against,segment_key,seconds_played
          )
          values (
            target_game_id,team,current_players,period,segment_start,ev.clock_seconds,
            current_plus,current_for+current_against,current_for,current_against,segment_key,elapsed
          )
          on conflict (game_id,team_id,segment_key) do update set
            ended_clock_seconds=excluded.ended_clock_seconds,
            plus_minus=excluded.plus_minus,
            possessions=excluded.possessions,
            points_for=excluded.points_for,
            points_against=excluded.points_against,
            seconds_played=excluded.seconds_played;
        end if;

        if ev.event_type in ('shot_made','free_throw_made','score_adjustment') and ev.points <> 0 then
          if ev.team_id = team then
            current_for := current_for + ev.points;
            current_plus := current_plus + ev.points;
          else
            current_against := current_against + ev.points;
            current_plus := current_plus - ev.points;
          end if;
        end if;

        if ev.event_type in ('shot_made','shot_missed','free_throw_made','free_throw_missed','turnover') then
          current_for := current_for;
        end if;

        if ev.event_type='substitution' and ev.team_id=team then
          if ev.player_out_id is not null then
            current_players := array_remove(current_players,ev.player_out_id);
          end if;
          if ev.player_in_id is not null and not (ev.player_in_id = any(current_players)) then
            current_players := array_append(current_players,ev.player_in_id);
          end if;
          segment_start := ev.clock_seconds;
          current_plus := 0;
          current_for := 0;
          current_against := 0;
          segment_key := period::text || ':' || ev.sequence_no::text || ':' || coalesce(array_to_string(current_players,','),'empty');
        end if;

        prev_clock := ev.clock_seconds;
      end loop;

      elapsed := greatest(0, round(prev_clock));
      if coalesce(array_length(current_players,1),0) > 0 and elapsed > 0 then
        insert into public.game_lineups(
          game_id,team_id,player_ids,period_number,started_clock_seconds,ended_clock_seconds,
          plus_minus,possessions,points_for,points_against,segment_key,seconds_played
        )
        values (
          target_game_id,team,current_players,period,segment_start,0,
          current_plus,current_for+current_against,current_for,current_against,segment_key,elapsed
        )
        on conflict (game_id,team_id,segment_key) do update set
          ended_clock_seconds=excluded.ended_clock_seconds,
          plus_minus=excluded.plus_minus,
          possessions=excluded.possessions,
          points_for=excluded.points_for,
          points_against=excluded.points_against,
          seconds_played=excluded.seconds_played;
      end if;
    end loop;
  end loop;

  update public.player_game_stats p
  set minutes = round(coalesce((
    select sum(gl.seconds_played) / 60.0
    from public.game_lineups gl
    where gl.game_id=target_game_id
      and p.player_id = any(gl.player_ids)
  ),0),2)
  where p.game_id=target_game_id;

  update public.player_game_stats p
  set plus_minus = coalesce((
    select sum(gl.plus_minus)
    from public.game_lineups gl
    where gl.game_id=target_game_id
      and p.player_id = any(gl.player_ids)
  ),0)
  where p.game_id=target_game_id;
end;
$$;

revoke execute on function public.rebuild_game_lineups(uuid) from public,anon,authenticated;

create or replace function public.set_starting_lineup(
  target_game_id uuid,
  target_team_id uuid,
  target_period integer,
  target_player_ids uuid[]
)
returns public.game_events
language plpgsql
security definer
set search_path=''
as $$
declare result public.game_events;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to set the lineup';
  end if;
  if target_team_id not in (
    select home_team_id from public.games where id=target_game_id
    union select away_team_id from public.games where id=target_game_id
  ) then raise exception 'Team is not part of this game'; end if;
  if coalesce(array_length(target_player_ids,1),0) <> 5 then
    raise exception 'A basketball lineup must contain exactly five players';
  end if;

  insert into public.game_events(
    game_id,period_number,clock_seconds,sequence_no,event_type,team_id,metadata,created_by
  )
  select target_game_id,target_period,
    (select period_length_seconds from public.games where id=target_game_id),
    coalesce(max(sequence_no),0)+1,'period_start',target_team_id,
    jsonb_build_object('starting_lineup',to_jsonb(target_player_ids)),
    auth.uid()
  from public.game_events where game_id=target_game_id
  returning * into result;

  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);
  return result;
end;
$$;
revoke execute on function public.set_starting_lineup(uuid,uuid,integer,uuid[]) from public,anon;
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
set search_path=''
as $$
declare result public.game_events;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to record substitutions';
  end if;
  if target_player_out = target_player_in then raise exception 'Substitution players must be different'; end if;

  insert into public.game_events(
    game_id,period_number,clock_seconds,sequence_no,event_type,team_id,
    player_in_id,player_out_id,metadata,created_by
  )
  select target_game_id,target_period,target_clock_seconds,coalesce(max(sequence_no),0)+1,
    'substitution',target_team_id,target_player_in,target_player_out,
    jsonb_build_object('player_in',target_player_in,'player_out',target_player_out),auth.uid()
  from public.game_events where game_id=target_game_id
  returning * into result;

  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);
  return result;
end;
$$;
revoke execute on function public.record_substitution(uuid,uuid,integer,numeric,uuid,uuid) from public,anon;
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
language plpgsql security definer set search_path = ''
as $$
declare
  next_sequence integer;
  result public.game_events;
begin
  if not public.can_manage_game(target_game_id) then
    raise exception 'You are not authorized to score this game';
  end if;

  select coalesce(max(sequence_no),0)+1 into next_sequence from public.game_events where game_id=target_game_id;

  insert into public.game_events(
    game_id,period_number,clock_seconds,sequence_no,event_type,team_id,player_id,
    secondary_player_id,player_in_id,player_out_id,points,shot_value,shot_result,
    shot_x,shot_y,shot_zone,foul_type,turnover_type,metadata,created_by
  ) values (
    target_game_id,p_period_number,p_clock_seconds,next_sequence,p_event_type,p_team_id,p_player_id,
    p_secondary_player_id,p_player_in_id,p_player_out_id,coalesce(p_points,0),p_shot_value,p_shot_result,
    p_shot_x,p_shot_y,p_shot_zone,p_foul_type,p_turnover_type,coalesce(p_metadata,'{}'::jsonb),auth.uid()
  )
  returning * into result;

  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);
  return result;
end;
$$;

revoke execute on function public.record_game_event(uuid,integer,numeric,text,uuid,uuid,uuid,uuid,uuid,integer,integer,text,numeric,numeric,text,text,text,jsonb) from public,anon;
grant execute on function public.record_game_event(uuid,integer,numeric,text,uuid,uuid,uuid,uuid,uuid,integer,integer,text,text,text,text,text,jsonb) to authenticated;