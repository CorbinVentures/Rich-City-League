-- RCL GAME IQ v1.3: keep zero-game teams visible in standings.
create or replace function public.rebuild_season_standings(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.standings where season_id = target_season_id;

  with completed_games as (
    select division_id, home_team_id, away_team_id, home_score, away_score
    from public.games
    where season_id = target_season_id and status = 'completed'
  ),
  team_results as (
    select division_id, home_team_id as team_id,
      (home_score > away_score)::int wins,
      (home_score < away_score)::int losses,
      (home_score = away_score)::int ties,
      home_score points_for, away_score points_against
    from completed_games
    union all
    select division_id, away_team_id,
      (away_score > home_score)::int,
      (away_score < home_score)::int,
      (away_score = home_score)::int,
      away_score, home_score
    from completed_games
  ),
  totals as (
    select division_id, team_id,
      sum(wins)::integer wins, sum(losses)::integer losses, sum(ties)::integer ties,
      sum(points_for)::integer points_for, sum(points_against)::integer points_against
    from team_results
    group by division_id, team_id
  ),
  base as (
    select ts.division_id, ts.team_id,
      coalesce(t.wins,0)::integer wins,
      coalesce(t.losses,0)::integer losses,
      coalesce(t.ties,0)::integer ties,
      coalesce(t.points_for,0)::integer points_for,
      coalesce(t.points_against,0)::integer points_against
    from public.team_seasons ts
    left join totals t on t.team_id=ts.team_id and t.division_id is not distinct from ts.division_id
    where ts.season_id=target_season_id
  ),
  ranked as (
    select *,
      row_number() over (
        partition by division_id
        order by wins desc, losses asc, (points_for-points_against) desc, points_for desc, team_id
      )::integer as rank
    from base
  )
  insert into public.standings(
    season_id, division_id, team_id, wins, losses, ties, points_for, points_against, rank, updated_at
  )
  select target_season_id, division_id, team_id, wins, losses, ties, points_for, points_against, rank, now()
  from ranked;
end;
$$;
revoke execute on function public.rebuild_season_standings(uuid) from public, anon, authenticated;
