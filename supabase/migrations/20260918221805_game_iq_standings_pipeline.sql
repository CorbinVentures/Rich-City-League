-- RCL GAME IQ v1.2: finalized games become the authoritative standings projection.
create or replace function public.rebuild_season_standings(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.standings where season_id = target_season_id;

  with completed_games as (
    select id, division_id, home_team_id, away_team_id, home_score, away_score
    from public.games
    where season_id = target_season_id and status = 'completed'
  ),
  team_results as (
    select division_id, home_team_id as team_id,
      case when home_score > away_score then 1 else 0 end as wins,
      case when home_score < away_score then 1 else 0 end as losses,
      case when home_score = away_score then 1 else 0 end as ties,
      home_score as points_for, away_score as points_against
    from completed_games
    union all
    select division_id, away_team_id,
      case when away_score > home_score then 1 else 0 end,
      case when away_score < home_score then 1 else 0 end,
      case when away_score = home_score then 1 else 0 end,
      away_score, home_score
    from completed_games
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
  ranked as (
    select *,
      row_number() over (
        partition by division_id
        order by wins desc, losses asc, (points_for-points_against) desc, points_for desc, team_id
      )::integer as rank
    from totals
  )
  insert into public.standings (
    season_id, division_id, team_id, wins, losses, ties, points_for, points_against, rank, updated_at
  )
  select target_season_id, division_id, team_id, wins, losses, ties, points_for, points_against, rank, now()
  from ranked;
end;
$$;

revoke execute on function public.rebuild_season_standings(uuid) from public, anon, authenticated;

create or replace function public.finalize_game_scorebook(target_game_id uuid)
returns public.games
language plpgsql
security definer set search_path = ''
as $$
declare result public.games;
begin
  if not public.can_manage_game(target_game_id) then raise exception 'You are not authorized to finalize this game'; end if;
  perform public.rebuild_game_stats(target_game_id);
  update public.games
  set status='completed', scorebook_status='final', updated_at=now()
  where id=target_game_id
  returning * into result;
  perform public.rebuild_season_standings(result.season_id);
  return result;
end;
$$;

revoke execute on function public.finalize_game_scorebook(uuid) from public, anon;
grant execute on function public.finalize_game_scorebook(uuid) to authenticated;
