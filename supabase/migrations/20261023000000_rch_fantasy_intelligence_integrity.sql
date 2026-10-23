-- RCH Fantasy Intelligence 2.0: immutable per-game lineups and authoritative scoring.
-- Never backfill historical ownership from today's roster. Cut over only for games
-- whose scheduled tip-off is after this migration is applied.

create schema if not exists private;

create table if not exists private.fantasy_integrity_cutover (
  singleton boolean primary key default true check (singleton),
  activated_at timestamptz not null default now()
);
insert into private.fantasy_integrity_cutover(singleton) values (true)
on conflict (singleton) do nothing;

create table if not exists private.fantasy_game_locks (
  fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  locked_at timestamptz not null default now(),
  primary key (fantasy_team_id, game_id)
);

create table if not exists private.fantasy_game_starters (
  fantasy_team_id uuid not null,
  game_id uuid not null,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (fantasy_team_id, game_id, player_id),
  foreign key (fantasy_team_id, game_id)
    references private.fantasy_game_locks(fantasy_team_id, game_id) on delete cascade
);
create index if not exists fantasy_game_starters_game_idx
  on private.fantasy_game_starters(game_id, player_id);

revoke all on private.fantasy_integrity_cutover, private.fantasy_game_locks, private.fantasy_game_starters
  from public, anon, authenticated;

-- A lock is recorded even for an empty lineup. Roster changes after tip-off
-- cannot reassign fantasy ownership for a game that already started.
create or replace function private.capture_fantasy_game_lineups(p_team_id uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  with fresh_locks as (
    insert into private.fantasy_game_locks (fantasy_team_id, game_id)
    select ft.id, g.id
    from public.fantasy_teams ft
    join public.fantasy_seasons fs
      on fs.id = ft.fantasy_season_id and fs.status = 'active'
    join public.games g on g.season_id = fs.season_id
    where g.scheduled_at > (
      select activated_at from private.fantasy_integrity_cutover where singleton
    )
      and g.scheduled_at <= now()
      and g.status::text not in ('cancelled', 'canceled', 'postponed')
      and ft.created_at <= g.scheduled_at
      and (p_team_id is null or ft.id = p_team_id)
    on conflict (fantasy_team_id, game_id) do nothing
    returning fantasy_team_id, game_id
  )
  insert into private.fantasy_game_starters (fantasy_team_id, game_id, player_id)
  select fl.fantasy_team_id, fl.game_id, fr.player_id
  from fresh_locks fl
  join public.games g on g.id = fl.game_id
  join public.fantasy_rosters fr
    on fr.fantasy_team_id = fl.fantasy_team_id
   and fr.roster_slot = 'starter'
   and fr.acquired_at <= g.scheduled_at
  on conflict do nothing;
end;
$$;

-- Integrity is enforced at the database layer even when users bypass the UI.
-- The fantasy team's row lock serializes concurrent edits to prevent cap races.
create or replace function private.enforce_fantasy_roster_rules()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  target_team uuid;
  position_name text;
  roster_count integer;
  starter_count integer;
begin
  target_team := case when tg_op = 'DELETE' then old.fantasy_team_id else new.fantasy_team_id end;
  if tg_op = 'UPDATE' and new.fantasy_team_id <> old.fantasy_team_id then
    raise exception 'Moving players between fantasy franchises is not permitted';
  end if;

  perform 1 from public.fantasy_teams where id = target_team for update;
  perform private.capture_fantasy_game_lineups(target_team);
  if tg_op = 'DELETE' then return old; end if;

  if tg_op = 'UPDATE' and new.player_id <> old.player_id then
    raise exception 'Replace a player by removing the old roster row and adding a new one';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into roster_count
    from public.fantasy_rosters where fantasy_team_id = target_team;
    if roster_count >= 8 then
      raise exception 'Fantasy rosters are limited to eight players';
    end if;
  end if;

  if new.roster_slot = 'starter' then
    select upper(trim(p.position)) into position_name
    from public.players p where p.id = new.player_id;
    if position_name is null or position_name not in ('PG', 'SG', 'SF', 'PF', 'C') then
      raise exception 'Starting players require an official PG, SG, SF, PF, or C position';
    end if;

    select count(*) into starter_count
    from public.fantasy_rosters fr
    where fr.fantasy_team_id = target_team
      and fr.roster_slot = 'starter'
      and fr.player_id <> new.player_id;

    if starter_count >= 5 then
      raise exception 'Fantasy lineups are limited to five starters';
    end if;

    if exists (
      select 1 from public.fantasy_rosters fr
      join public.players p on p.id = fr.player_id
      where fr.fantasy_team_id = target_team
        and fr.roster_slot = 'starter'
        and fr.player_id <> new.player_id
        and upper(trim(p.position)) = position_name
    ) then
      raise exception 'A fantasy lineup cannot have two starters at the same position';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists fantasy_roster_integrity on public.fantasy_rosters;
create trigger fantasy_roster_integrity
before insert or update or delete on public.fantasy_rosters
for each row execute function private.enforce_fantasy_roster_rules();

-- Re-score from official Scorebook rows and locked starter assignments.
-- Existing pre-cutover fantasy scores are preserved. Subsequent corrections
-- affect only games with a snapshot, never current ownership of past games.
create or replace function private.refresh_fantasy_system()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform private.ensure_fantasy_matchups();
  perform private.capture_fantasy_game_lineups();

  delete from public.fantasy_scores scores
  using private.fantasy_game_locks locks
  where scores.fantasy_team_id = locks.fantasy_team_id
    and scores.game_id = locks.game_id;

  insert into public.fantasy_scores (
    fantasy_team_id, player_id, game_id, fantasy_points, scoring_breakdown
  )
  select
    starter.fantasy_team_id, pgs.player_id, pgs.game_id,
    greatest(0, public.calculate_fantasy_points(
      pgs.points, pgs.rebounds, pgs.assists, pgs.steals, pgs.blocks, pgs.turnovers, fs.scoring_rules
    )),
    jsonb_build_object(
      'points', pgs.points, 'rebounds', pgs.rebounds, 'assists', pgs.assists,
      'steals', pgs.steals, 'blocks', pgs.blocks, 'turnovers', pgs.turnovers,
      'rules', fs.scoring_rules, 'lineup_locked', true
    )
  from private.fantasy_game_starters starter
  join public.fantasy_teams ft on ft.id = starter.fantasy_team_id
  join public.fantasy_seasons fs
    on fs.id = ft.fantasy_season_id and fs.status = 'active'
  join public.games g on g.id = starter.game_id and g.season_id = fs.season_id
  join public.player_game_stats pgs
    on pgs.game_id = g.id and pgs.player_id = starter.player_id
  where g.status::text not in ('cancelled', 'canceled', 'postponed')
  on conflict (fantasy_team_id, player_id, game_id)
    do update set fantasy_points = excluded.fantasy_points,
                  scoring_breakdown = excluded.scoring_breakdown;

  -- Compute score totals and winners from the same fresh values: using the
  -- target row's old home_points/away_points would select the wrong winner.
  with recalculated as (
    select fm.id,
      coalesce((
        select sum(sc.fantasy_points)
        from public.fantasy_scores sc
        join public.games g on g.id = sc.game_id
        where sc.fantasy_team_id = fm.home_team_id
          and g.scheduled_at >= fm.starts_at and g.scheduled_at < fm.ends_at
      ),0) as new_home,
      coalesce((
        select sum(sc.fantasy_points)
        from public.fantasy_scores sc
        join public.games g on g.id = sc.game_id
        where sc.fantasy_team_id = fm.away_team_id
          and g.scheduled_at >= fm.starts_at and g.scheduled_at < fm.ends_at
      ),0) as new_away
    from public.fantasy_matchups fm
    join public.fantasy_seasons fs
      on fs.id = fm.fantasy_season_id and fs.status = 'active'
  )
  update public.fantasy_matchups fm
  set home_points = r.new_home,
      away_points = r.new_away,
      status = case
        when now() < fm.starts_at then 'scheduled'
        when now() >= fm.ends_at then 'final'
        else 'live'
      end,
      winner_team_id = case
        when now() < fm.ends_at then null
        when r.new_home > r.new_away then fm.home_team_id
        when r.new_away > r.new_home then fm.away_team_id
        else null
      end
  from recalculated r where fm.id = r.id;

  update public.fantasy_teams ft set
    total_points = coalesce((
      select sum(sc.fantasy_points) from public.fantasy_scores sc
      where sc.fantasy_team_id = ft.id
    ),0),
    wins = coalesce((
      select count(*) from public.fantasy_matchups fm
      where fm.fantasy_season_id = ft.fantasy_season_id
        and fm.status = 'final' and fm.winner_team_id = ft.id
    ),0),
    losses = coalesce((
      select count(*) from public.fantasy_matchups fm
      where fm.fantasy_season_id = ft.fantasy_season_id
        and fm.status = 'final' and fm.winner_team_id is not null
        and fm.winner_team_id <> ft.id
        and (fm.home_team_id = ft.id or fm.away_team_id = ft.id)
    ),0)
  where ft.fantasy_season_id in (
    select id from public.fantasy_seasons where status = 'active'
  );
end;
$$;

revoke all on function private.capture_fantasy_game_lineups(uuid) from public, anon, authenticated;
revoke all on function private.enforce_fantasy_roster_rules() from public, anon, authenticated;
revoke all on function private.refresh_fantasy_system() from public, anon, authenticated;
