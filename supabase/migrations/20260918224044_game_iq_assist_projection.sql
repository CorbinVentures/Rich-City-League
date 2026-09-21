-- RCL GAME IQ v2.1: explicit assist events count directly in player projections.
create or replace function public.rebuild_game_stats(target_game_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  g public.games%rowtype;
  home_points integer;
  away_points integer;
begin
  if not public.can_manage_game(target_game_id) then raise exception 'You are not authorized to score this game'; end if;
  select * into g from public.games where id=target_game_id for update;
  if not found then raise exception 'Game not found'; end if;

  select
    coalesce(sum(case when e.team_id=g.home_team_id then e.points else 0 end),0),
    coalesce(sum(case when e.team_id=g.away_team_id then e.points else 0 end),0)
  into home_points,away_points
  from public.game_events e
  where e.game_id=target_game_id and e.voided_at is null
    and e.event_type in ('shot_made','free_throw_made','score_adjustment');

  update public.games set home_score=home_points,away_score=away_points,
    scorebook_status=case when status='completed' then 'final' else 'live' end,updated_at=now()
  where id=target_game_id;

  delete from public.player_game_stats where game_id=target_game_id;
  delete from public.team_game_stats where game_id=target_game_id;

  insert into public.player_game_stats (
    game_id,player_id,team_id,points,rebounds,assists,steals,blocks,turnovers,fouls,
    field_goals_made,field_goals_attempted,three_pointers_made,three_pointers_attempted,
    free_throws_made,free_throws_attempted
  )
  select target_game_id,p.id,coalesce(r.team_id,last_event.team_id),
    coalesce((select sum(e.points) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type in ('shot_made','free_throw_made')),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type in ('rebound_off','rebound_def')),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type='assist'),0)
      + coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.secondary_player_id=p.id and e.voided_at is null and e.event_type='shot_made' and coalesce((e.metadata->>'assist')::boolean,false)),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type='steal'),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type='block'),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type='turnover'),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type='foul'),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type='shot_made' and e.shot_value in (2,3)),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type in ('shot_made','shot_missed') and e.shot_value in (2,3)),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type='shot_made' and e.shot_value=3),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type in ('shot_made','shot_missed') and e.shot_value=3),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type='free_throw_made'),0),
    coalesce((select count(*) from public.game_events e where e.game_id=target_game_id and e.player_id=p.id and e.voided_at is null and e.event_type in ('free_throw_made','free_throw_missed')),0)
  from public.players p
  left join lateral (
    select ts.team_id from public.rosters r join public.team_seasons ts on ts.id=r.team_season_id
    where r.player_id=p.id and r.left_at is null and ts.season_id=g.season_id
      and ts.team_id in (g.home_team_id,g.away_team_id)
    order by r.created_at desc limit 1
  ) r on true
  left join lateral (
    select e2.team_id from public.game_events e2 where e2.game_id=target_game_id and e2.player_id=p.id
      and e2.team_id in (g.home_team_id,g.away_team_id) order by e2.sequence_no desc limit 1
  ) last_event on true
  where p.id in (
    select e.player_id from public.game_events e where e.game_id=target_game_id and e.player_id is not null and e.voided_at is null
    union
    select e.secondary_player_id from public.game_events e where e.game_id=target_game_id and e.secondary_player_id is not null and e.voided_at is null
    union
    select s.player_id from public.game_participation_status s where s.game_id=target_game_id
  ) and coalesce(r.team_id,last_event.team_id) is not null;

  insert into public.team_game_stats(game_id,team_id,points,rebounds,assists,turnovers,fouls)
  select target_game_id,t.team_id,
    coalesce(sum(case when e.team_id=t.team_id and e.event_type in ('shot_made','free_throw_made','score_adjustment') then e.points else 0 end),0),
    coalesce(sum(case when e.team_id=t.team_id and e.event_type in ('rebound_off','rebound_def') then 1 else 0 end),0),
    coalesce(sum(case when e.team_id=t.team_id and e.event_type='assist' then 1 else 0 end),0)
      + coalesce(sum(case when e.team_id=t.team_id and e.event_type='shot_made' and e.secondary_player_id is not null and coalesce((e.metadata->>'assist')::boolean,false) then 1 else 0 end),0),
    coalesce(sum(case when e.team_id=t.team_id and e.event_type='turnover' then 1 else 0 end),0),
    coalesce(sum(case when e.team_id=t.team_id and e.event_type='foul' then 1 else 0 end),0)
  from (values (g.home_team_id),(g.away_team_id)) t(team_id)
  left join public.game_events e on e.game_id=target_game_id and e.voided_at is null
  group by t.team_id;
end;
$$;
revoke execute on function public.rebuild_game_stats(uuid) from public,anon;
grant execute on function public.rebuild_game_stats(uuid) to authenticated;

create or replace function public.record_game_event(
  target_game_id uuid,p_period_number integer,p_clock_seconds numeric,p_event_type text,
  p_team_id uuid default null,p_player_id uuid default null,p_secondary_player_id uuid default null,
  p_player_in_id uuid default null,p_player_out_id uuid default null,p_points integer default 0,
  p_shot_value integer default null,p_shot_result text default null,p_shot_x numeric default null,
  p_shot_y numeric default null,p_shot_zone text default null,p_foul_type text default null,
  p_turnover_type text default null,p_metadata jsonb default '{}'::jsonb
)
returns public.game_events language plpgsql security definer set search_path=''
as $$
declare next_sequence integer; result public.game_events;
begin
  if not public.can_manage_game(target_game_id) then raise exception 'You are not authorized to score this game'; end if;
  select coalesce(max(sequence_no),0)+1 into next_sequence from public.game_events where game_id=target_game_id;
  insert into public.game_events(game_id,period_number,clock_seconds,sequence_no,event_type,team_id,player_id,
    secondary_player_id,player_in_id,player_out_id,points,shot_value,shot_result,shot_x,shot_y,shot_zone,
    foul_type,turnover_type,metadata,created_by)
  values(target_game_id,p_period_number,p_clock_seconds,next_sequence,p_event_type,p_team_id,p_player_id,
    p_secondary_player_id,p_player_in_id,p_player_out_id,coalesce(p_points,0),p_shot_value,p_shot_result,p_shot_x,
    p_shot_y,p_shot_zone,p_foul_type,p_turnover_type,coalesce(p_metadata,'{}'::jsonb),auth.uid())
  returning * into result;
  perform public.rebuild_game_stats(target_game_id);
  perform public.rebuild_game_lineups(target_game_id);
  return result;
end;
$$;
revoke execute on function public.record_game_event(uuid,integer,numeric,text,uuid,uuid,uuid,uuid,uuid,integer,integer,text,numeric,numeric,text,text,text,jsonb) from public,anon;
grant execute on function public.record_game_event(uuid,integer,numeric,text,uuid,uuid,uuid,uuid,uuid,integer,integer,text,numeric,numeric,text,text,text,jsonb) to authenticated;
