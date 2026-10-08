create extension if not exists pg_cron;

create schema if not exists private;

create table if not exists public.fantasy_matchups (
  id uuid primary key default gen_random_uuid(),
  fantasy_season_id uuid not null references public.fantasy_seasons(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  home_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  away_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  home_points numeric(10,2) not null default 0 check (home_points >= 0),
  away_points numeric(10,2) not null default 0 check (away_points >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','live','final')),
  winner_team_id uuid references public.fantasy_teams(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (fantasy_season_id, week_number, home_team_id, away_team_id),
  check (home_team_id <> away_team_id),
  check (ends_at > starts_at)
);

create index if not exists fantasy_matchups_season_week_idx
  on public.fantasy_matchups (fantasy_season_id, week_number, starts_at);

alter table public.fantasy_matchups enable row level security;

drop policy if exists "public fantasy matchups" on public.fantasy_matchups;
create policy "public fantasy matchups"
  on public.fantasy_matchups for select to anon, authenticated using (true);

drop policy if exists "staff manage fantasy matchups" on public.fantasy_matchups;
create policy "staff manage fantasy matchups"
  on public.fantasy_matchups for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

grant select on public.fantasy_matchups to anon, authenticated;

create or replace function private.ensure_fantasy_matchups()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  season_row record;
  team_ids uuid[];
  team_count integer;
  week_count integer;
  week_number integer;
  i integer;
  left_index integer;
  right_index integer;
  season_start timestamptz;
begin
  for season_row in
    select fs.id, s.start_date, s.end_date
    from public.fantasy_seasons fs
    join public.seasons s on s.id = fs.season_id
    where fs.status = 'active'
  loop
    select array_agg(t.id order by t.created_at, t.id)
      into team_ids
    from public.fantasy_teams t
    where t.fantasy_season_id = season_row.id;

    team_count := coalesce(array_length(team_ids, 1), 0);
    if team_count < 2 then continue; end if;

    week_count := greatest(1, least(14,
      ceil((season_row.end_date::date - season_row.start_date::date + 1) / 7.0)::integer
    ));
    season_start := season_row.start_date::timestamptz;

    if mod(team_count, 2) = 1 then
      team_ids := array_append(team_ids, null::uuid);
      team_count := team_count + 1;
    end if;

    for week_number in 1..week_count loop
      for i in 1..(team_count / 2) loop
        left_index := ((i - 1 + (week_number - 1)) % (team_count - 1)) + 1;
        right_index := team_count - ((i - 1 + (week_number - 1)) % (team_count - 1));
        if team_ids[left_index] is null or team_ids[right_index] is null then continue; end if;

        insert into public.fantasy_matchups (
          fantasy_season_id, week_number, starts_at, ends_at, home_team_id, away_team_id
        )
        values (
          season_row.id,
          week_number,
          season_start + ((week_number - 1) * interval '7 days'),
          season_start + (week_number * interval '7 days'),
          least(team_ids[left_index], team_ids[right_index]),
          greatest(team_ids[left_index], team_ids[right_index])
        )
        on conflict (fantasy_season_id, week_number, home_team_id, away_team_id) do nothing;
      end loop;
    end loop;
  end loop;
end;
$$;

create or replace function private.refresh_fantasy_system()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform private.ensure_fantasy_matchups();

  delete from public.fantasy_scores fs
  using public.fantasy_teams ft, public.fantasy_seasons fseason
  where fs.fantasy_team_id = ft.id
    and ft.fantasy_season_id = fseason.id
    and fseason.status = 'active';

  insert into public.fantasy_scores (
    fantasy_team_id, player_id, game_id, fantasy_points, scoring_breakdown
  )
  select
    fr.fantasy_team_id,
    pgs.player_id,
    pgs.game_id,
    public.calculate_fantasy_points(
      pgs.points, pgs.rebounds, pgs.assists, pgs.steals, pgs.blocks, pgs.turnovers, fs.scoring_rules
    ),
    jsonb_build_object(
      'points', pgs.points, 'rebounds', pgs.rebounds, 'assists', pgs.assists,
      'steals', pgs.steals, 'blocks', pgs.blocks, 'turnovers', pgs.turnovers,
      'rules', fs.scoring_rules
    )
  from public.fantasy_rosters fr
  join public.fantasy_teams ft on ft.id = fr.fantasy_team_id
  join public.fantasy_seasons fs on fs.id = ft.fantasy_season_id and fs.status = 'active'
  join public.player_game_stats pgs on pgs.player_id = fr.player_id
  join public.games g on g.id = pgs.game_id and g.season_id = fs.season_id;

  update public.fantasy_matchups fm
  set
    home_points = coalesce((
      select sum(fscore.fantasy_points) from public.fantasy_scores fscore
      join public.games g on g.id = fscore.game_id
      where fscore.fantasy_team_id = fm.home_team_id
        and g.scheduled_at >= fm.starts_at and g.scheduled_at < fm.ends_at
    ), 0),
    away_points = coalesce((
      select sum(fscore.fantasy_points) from public.fantasy_scores fscore
      join public.games g on g.id = fscore.game_id
      where fscore.fantasy_team_id = fm.away_team_id
        and g.scheduled_at >= fm.starts_at and g.scheduled_at < fm.ends_at
    ), 0),
    status = case
      when now() < fm.starts_at then 'scheduled'
      when now() >= fm.ends_at then 'final'
      else 'live'
    end,
    winner_team_id = case
      when now() >= fm.ends_at and fm.home_points > fm.away_points then fm.home_team_id
      when now() >= fm.ends_at and fm.away_points > fm.home_points then fm.away_team_id
      else null
    end
  where fm.fantasy_season_id in (select id from public.fantasy_seasons where status = 'active');

  update public.fantasy_teams ft
  set
    total_points = coalesce((select sum(fs.fantasy_points) from public.fantasy_scores fs where fs.fantasy_team_id = ft.id), 0),
    wins = coalesce((
      select count(*) from public.fantasy_matchups fm
      where fm.fantasy_season_id = ft.fantasy_season_id and fm.status = 'final' and fm.winner_team_id = ft.id
    ), 0),
    losses = coalesce((
      select count(*) from public.fantasy_matchups fm
      where fm.fantasy_season_id = ft.fantasy_season_id and fm.status = 'final'
        and fm.winner_team_id is not null and fm.winner_team_id <> ft.id
        and (fm.home_team_id = ft.id or fm.away_team_id = ft.id)
    ), 0);
end;
$$;

create or replace function private.refresh_fantasy_after_player_stats()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_fantasy_system();
  return coalesce(new, old);
end;
$$;

revoke execute on function private.ensure_fantasy_matchups() from public, anon, authenticated;
revoke execute on function private.refresh_fantasy_system() from public, anon, authenticated;
revoke execute on function private.refresh_fantasy_after_player_stats() from public, anon, authenticated;

drop trigger if exists refresh_fantasy_after_player_stats on public.player_game_stats;
create trigger refresh_fantasy_after_player_stats
  after insert or update or delete on public.player_game_stats
  for each statement
  execute function private.refresh_fantasy_after_player_stats();

do $$
begin
  if exists (select 1 from cron.job where jobname = 'rcl-fantasy-refresh') then
    perform cron.unschedule('rcl-fantasy-refresh');
  end if;
end;
$$;

select cron.schedule('rcl-fantasy-refresh', '*/5 * * * *', 'select private.refresh_fantasy_system();');
