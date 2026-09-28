begin;

create table if not exists public.fantasy_leagues (
  id uuid primary key default gen_random_uuid(),
  fantasy_season_id uuid not null references public.fantasy_seasons(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 60),
  visibility text not null default 'private' check (visibility in ('private')),
  join_code text not null unique check (length(join_code) between 6 and 12),
  max_teams integer not null default 10 check (max_teams between 2 and 20),
  status text not null default 'open' check (status in ('open','closed','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fantasy_league_members (
  fantasy_league_id uuid not null references public.fantasy_leagues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'manager' check (role in ('commissioner','manager')),
  joined_at timestamptz not null default now(),
  primary key (fantasy_league_id, profile_id)
);

create index if not exists fantasy_leagues_season_created_idx
  on public.fantasy_leagues(fantasy_season_id, created_at desc);
create index if not exists fantasy_league_members_profile_idx
  on public.fantasy_league_members(profile_id, fantasy_league_id);

create table if not exists public.fantasy_league_matchups (
  id uuid primary key default gen_random_uuid(),
  fantasy_league_id uuid not null references public.fantasy_leagues(id) on delete cascade,
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
  unique (fantasy_league_id, week_number, home_team_id, away_team_id),
  check (home_team_id <> away_team_id),
  check (ends_at > starts_at)
);

create index if not exists fantasy_league_matchups_league_week_idx
  on public.fantasy_league_matchups(fantasy_league_id, week_number, starts_at);

alter table public.fantasy_leagues enable row level security;
alter table public.fantasy_league_members enable row level security;
alter table public.fantasy_league_matchups enable row level security;

revoke all on public.fantasy_leagues from anon;
revoke all on public.fantasy_league_members from anon;
revoke all on public.fantasy_league_matchups from anon;
grant select on public.fantasy_leagues to authenticated;
grant select on public.fantasy_league_members to authenticated;
grant select on public.fantasy_league_matchups to authenticated;

create schema if not exists private;

create or replace function private.is_fantasy_league_member(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.fantasy_league_members m
    where m.fantasy_league_id = target_league_id
      and m.profile_id = (select auth.uid())
  );
$$;

revoke all on function private.is_fantasy_league_member(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_fantasy_league_member(uuid) to authenticated;

drop policy if exists "members read fantasy leagues" on public.fantasy_leagues;
create policy "members read fantasy leagues"
on public.fantasy_leagues for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_fantasy_league_member(id)
  or public.is_staff_or_admin()
);

drop policy if exists "league members read membership" on public.fantasy_league_members;
create policy "league members read membership"
on public.fantasy_league_members for select
to authenticated
using (
  profile_id = (select auth.uid())
  or private.is_fantasy_league_member(fantasy_league_id)
  or public.is_staff_or_admin()
);

drop policy if exists "league members read private matchups" on public.fantasy_league_matchups;
create policy "league members read private matchups"
on public.fantasy_league_matchups for select
to authenticated
using (
  private.is_fantasy_league_member(fantasy_league_id)
  or public.is_staff_or_admin()
);

create or replace function public.create_private_fantasy_league(
  target_name text,
  target_max_teams integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  active_fantasy_season uuid;
  created_league uuid;
  generated_code text;
begin
  if caller is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = caller and p.role = 'fan'::public.app_role and p.is_active = true
  ) then
    raise exception 'Only active fan profiles can create Fantasy leagues.' using errcode = '42501';
  end if;

  if length(trim(coalesce(target_name,''))) not between 2 and 60 then
    raise exception 'League name must be 2 to 60 characters.' using errcode = '22023';
  end if;

  if target_max_teams not between 2 and 20 then
    raise exception 'Private leagues support 2 to 20 teams.' using errcode = '22023';
  end if;

  select fs.id into active_fantasy_season
  from public.fantasy_seasons fs
  where fs.status = 'active'
  order by fs.created_at desc
  limit 1;

  if active_fantasy_season is null then
    raise exception 'No active Fantasy season is available.' using errcode = 'P0001';
  end if;

  loop
    generated_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    exit when not exists (select 1 from public.fantasy_leagues where join_code = generated_code);
  end loop;

  insert into public.fantasy_leagues(
    fantasy_season_id, owner_id, name, visibility, join_code, max_teams, status
  ) values (
    active_fantasy_season, caller, trim(target_name), 'private', generated_code, target_max_teams, 'open'
  ) returning id into created_league;

  insert into public.fantasy_league_members(fantasy_league_id, profile_id, role)
  values (created_league, caller, 'commissioner');

  return created_league;
end;
$$;

create or replace function public.join_private_fantasy_league(target_join_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target public.fantasy_leagues%rowtype;
  member_count integer;
begin
  if caller is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = caller and p.role = 'fan'::public.app_role and p.is_active = true
  ) then
    raise exception 'Only active fan profiles can join Fantasy leagues.' using errcode = '42501';
  end if;

  select * into target
  from public.fantasy_leagues l
  where upper(l.join_code) = upper(trim(coalesce(target_join_code,'')))
  limit 1;

  if target.id is null then
    raise exception 'Fantasy league code not found.' using errcode = 'P0002';
  end if;

  if target.status <> 'open' then
    raise exception 'This Fantasy league is not accepting new teams.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.fantasy_league_members m
    where m.fantasy_league_id = target.id and m.profile_id = caller
  ) then
    return target.id;
  end if;

  select count(*)::integer into member_count
  from public.fantasy_league_members m
  where m.fantasy_league_id = target.id;

  if member_count >= target.max_teams then
    raise exception 'This Fantasy league is full.' using errcode = 'P0001';
  end if;

  insert into public.fantasy_league_members(fantasy_league_id, profile_id, role)
  values (target.id, caller, 'manager');

  return target.id;
end;
$$;

revoke all on function public.create_private_fantasy_league(text, integer) from public, anon, authenticated;
revoke all on function public.join_private_fantasy_league(text) from public, anon, authenticated;
grant execute on function public.create_private_fantasy_league(text, integer) to authenticated;
grant execute on function public.join_private_fantasy_league(text) to authenticated;

create or replace function private.ensure_private_fantasy_matchups()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  league_row record;
  team_ids uuid[];
  team_count integer;
  week_count integer;
  target_week integer;
  i integer;
  left_index integer;
  right_index integer;
  season_start timestamptz;
begin
  for league_row in
    select l.id as league_id, l.fantasy_season_id, s.start_date, s.end_date
    from public.fantasy_leagues l
    join public.fantasy_seasons fs on fs.id = l.fantasy_season_id
    join public.seasons s on s.id = fs.season_id
    where fs.status = 'active' and l.status <> 'completed'
  loop
    select array_agg(ft.id order by m.joined_at, ft.created_at, ft.id)
      into team_ids
    from public.fantasy_league_members m
    join public.fantasy_teams ft
      on ft.manager_id = m.profile_id
     and ft.fantasy_season_id = league_row.fantasy_season_id
    where m.fantasy_league_id = league_row.league_id;

    team_count := coalesce(array_length(team_ids, 1), 0);
    if team_count < 2 then continue; end if;

    week_count := greatest(1, least(14,
      ceil((league_row.end_date::date - league_row.start_date::date + 1) / 7.0)::integer
    ));
    season_start := league_row.start_date::timestamptz;

    delete from public.fantasy_league_matchups fm
    where fm.fantasy_league_id = league_row.league_id
      and fm.status = 'scheduled'
      and fm.starts_at > now();

    if mod(team_count, 2) = 1 then
      team_ids := array_append(team_ids, null::uuid);
      team_count := team_count + 1;
    end if;

    for target_week in 1..week_count loop
      for i in 1..(team_count / 2) loop
        left_index := ((i - 1 + (target_week - 1)) % (team_count - 1)) + 1;
        right_index := team_count - ((i - 1 + (target_week - 1)) % (team_count - 1));
        if team_ids[left_index] is null or team_ids[right_index] is null then continue; end if;

        insert into public.fantasy_league_matchups(
          fantasy_league_id, fantasy_season_id, week_number, starts_at, ends_at,
          home_team_id, away_team_id
        ) values (
          league_row.league_id,
          league_row.fantasy_season_id,
          target_week,
          season_start + ((target_week - 1) * interval '7 days'),
          season_start + (target_week * interval '7 days'),
          least(team_ids[left_index], team_ids[right_index]),
          greatest(team_ids[left_index], team_ids[right_index])
        ) on conflict (fantasy_league_id, week_number, home_team_id, away_team_id) do nothing;
      end loop;
    end loop;
  end loop;
end;
$$;

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
    end,
    winner_team_id = case
      when now() >= fm.ends_at and fm.home_points > fm.away_points then fm.home_team_id
      when now() >= fm.ends_at and fm.away_points > fm.home_points then fm.away_team_id
      else null
    end;
end;
$$;

create or replace function private.refresh_private_fantasy_after_player_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_private_fantasy_matchups();
  return null;
end;
$$;

revoke all on function private.ensure_private_fantasy_matchups() from public, anon, authenticated;
revoke all on function private.refresh_private_fantasy_matchups() from public, anon, authenticated;
revoke all on function private.refresh_private_fantasy_after_player_stats() from public, anon, authenticated;

drop trigger if exists zz_refresh_private_fantasy_after_player_stats on public.player_game_stats;
create trigger zz_refresh_private_fantasy_after_player_stats
  after insert or update or delete on public.player_game_stats
  for each statement
  execute function private.refresh_private_fantasy_after_player_stats();

do $$
begin
  if exists (select 1 from cron.job where jobname = 'rcl-private-fantasy-refresh') then
    perform cron.unschedule('rcl-private-fantasy-refresh');
  end if;
end;
$$;

select cron.schedule('rcl-private-fantasy-refresh', '*/5 * * * *', 'select private.refresh_private_fantasy_matchups();');

commit;
