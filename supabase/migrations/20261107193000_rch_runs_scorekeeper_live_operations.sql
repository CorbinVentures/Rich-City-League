-- Let explicitly assigned scorekeepers run live game actions. Hosts and staff
-- retain setup authority; scorekeepers cannot start or reconfigure games.
begin;

create or replace function public.can_operate_run_game(p_run uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(public.can_manage_run(p_run),false)
    or exists(select 1 from public.rch_run_operators o
      where o.run_id=p_run and o.profile_id=(select auth.uid())
        and o.role in ('scorekeeper','cohost'))
$$;
revoke all on function public.can_operate_run_game(uuid) from public,anon;
grant execute on function public.can_operate_run_game(uuid) to authenticated;

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
  if not public.can_operate_run_game(g.run_id) then raise exception 'Only the host, RCH staff, or an assigned scorekeeper can operate the scoreboard'; end if;
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
  if not public.can_operate_run_game(g.run_id) then raise exception 'Only the host, RCH staff, or an assigned scorekeeper can finish a game'; end if;
  if g.status<>'live' then raise exception 'This game is no longer live'; end if;
  if g.home_score+g.away_score=0 then raise exception 'Record at least one basket before finishing'; end if;
  update public.run_games set status='completed',played_at=now() where id=g.id;
  return g.id;
end $$;

revoke all on function public.rch_record_run_game_action(uuid,text,uuid,uuid,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.rch_finish_run_game(uuid) from public,anon,authenticated;
grant execute on function public.rch_record_run_game_action(uuid,text,uuid,uuid,integer,text,uuid) to authenticated;
grant execute on function public.rch_finish_run_game(uuid) to authenticated;

commit;
