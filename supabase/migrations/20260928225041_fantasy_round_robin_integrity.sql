begin;

-- Use the standard circle rotation so every franchise appears exactly once per
-- round (except the single bye when the league has an odd number of teams).
-- The previous index arithmetic could repeat the same pairing in one week.
create or replace function private.ensure_fantasy_matchups()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  season_row record;
  team_ids uuid[];
  team_count integer;
  week_count integer;
  target_week integer;
  i integer;
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

    -- Future scheduled rows are safe to rebuild whenever membership changes.
    delete from public.fantasy_matchups fm
    where fm.fantasy_season_id = season_row.id
      and fm.status = 'scheduled'
      and fm.starts_at > now();

    if mod(team_count, 2) = 1 then
      team_ids := array_append(team_ids, null::uuid);
      team_count := team_count + 1;
    end if;

    for target_week in 1..week_count loop
      for i in 1..(team_count / 2) loop
        if team_ids[i] is null or team_ids[team_count - i + 1] is null then
          continue;
        end if;

        insert into public.fantasy_matchups (
          fantasy_season_id, week_number, starts_at, ends_at,
          home_team_id, away_team_id
        ) values (
          season_row.id,
          target_week,
          season_start + ((target_week - 1) * interval '7 days'),
          season_start + (target_week * interval '7 days'),
          least(team_ids[i], team_ids[team_count - i + 1]),
          greatest(team_ids[i], team_ids[team_count - i + 1])
        ) on conflict (fantasy_season_id, week_number, home_team_id, away_team_id) do nothing;
      end loop;

      -- Keep the first franchise fixed and rotate the remaining franchises.
      if team_count > 2 then
        team_ids := array[team_ids[1], team_ids[team_count]] || team_ids[2:team_count - 1];
      end if;
    end loop;
  end loop;
end;
$$;

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
        if team_ids[i] is null or team_ids[team_count - i + 1] is null then
          continue;
        end if;

        insert into public.fantasy_league_matchups (
          fantasy_league_id, fantasy_season_id, week_number, starts_at, ends_at,
          home_team_id, away_team_id
        ) values (
          league_row.league_id,
          league_row.fantasy_season_id,
          target_week,
          season_start + ((target_week - 1) * interval '7 days'),
          season_start + (target_week * interval '7 days'),
          least(team_ids[i], team_ids[team_count - i + 1]),
          greatest(team_ids[i], team_ids[team_count - i + 1])
        ) on conflict (fantasy_league_id, week_number, home_team_id, away_team_id) do nothing;
      end loop;

      if team_count > 2 then
        team_ids := array[team_ids[1], team_ids[team_count]] || team_ids[2:team_count - 1];
      end if;
    end loop;
  end loop;
end;
$$;

-- Serialize joins against the league row so simultaneous invite-code joins
-- cannot race past max_teams.
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
  for update;

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

revoke all on function private.ensure_fantasy_matchups() from public, anon, authenticated;
revoke all on function private.ensure_private_fantasy_matchups() from public, anon, authenticated;
revoke all on function public.join_private_fantasy_league(text) from public, anon, authenticated;
grant execute on function public.join_private_fantasy_league(text) to authenticated;

commit;
