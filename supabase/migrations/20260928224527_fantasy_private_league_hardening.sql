begin;

-- Private Fantasy membership and competition state are managed only through the
-- approved RPCs/automation. RLS remains defense in depth, but remove direct
-- client write grants so no accidental policy can widen this surface later.
revoke insert, update, delete on public.fantasy_leagues from authenticated;
revoke insert, update, delete on public.fantasy_league_members from authenticated;
revoke insert, update, delete on public.fantasy_league_matchups from authenticated;

-- Recalculate points/status first, then determine the winner from the newly
-- persisted totals. Keeping these as two statements avoids a one-refresh lag
-- because Postgres SET expressions otherwise read the pre-update row values.
create or replace function private.refresh_private_fantasy_matchups()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_private_fantasy_matchups();

  update public.fantasy_league_matchups fm
  set
    home_points = coalesce((
      select sum(fs.fantasy_points)
      from public.fantasy_scores fs
      join public.games g on g.id = fs.game_id
      where fs.fantasy_team_id = fm.home_team_id
        and g.scheduled_at >= fm.starts_at
        and g.scheduled_at < fm.ends_at
    ),0),
    away_points = coalesce((
      select sum(fs.fantasy_points)
      from public.fantasy_scores fs
      join public.games g on g.id = fs.game_id
      where fs.fantasy_team_id = fm.away_team_id
        and g.scheduled_at >= fm.starts_at
        and g.scheduled_at < fm.ends_at
    ),0),
    status = case
      when now() < fm.starts_at then 'scheduled'
      when now() >= fm.ends_at then 'final'
      else 'live'
    end;

  update public.fantasy_league_matchups fm
  set winner_team_id = case
    when fm.status <> 'final' then null
    when fm.home_points > fm.away_points then fm.home_team_id
    when fm.away_points > fm.home_points then fm.away_team_id
    else null
  end;
end;
$$;

revoke all on function private.refresh_private_fantasy_matchups() from public, anon, authenticated;

commit;
