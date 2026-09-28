-- Materialize LeagueApps team-assigned registrations into RCL rosters so the
-- scorebook and team surfaces stay in sync without duplicate staff entry.
create or replace function public.materialize_leagueapps_rosters()
returns table(upserted integer, moved integer, eligible integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  with raw as (
    select
      nullif(payload->>'programId', '')::bigint as program_id,
      nullif(payload->>'teamId', '')::bigint as leagueapps_team_id,
      nullif(payload->>'userId', '')::bigint as user_id,
      nullif(trim(payload->>'Jersey Number'), '') as jersey_number,
      coalesce(nullif(payload->>'registrationStatus', ''), '') as registration_status,
      coalesce(nullif(payload->>'lastUpdated', '')::bigint, 0) as last_updated,
      coalesce(nullif(payload->>'created', '')::bigint, 0) as created_ms
    from public.leagueapps_records
    where resource = 'registrations-2'
      and payload->>'sport' = 'Basketball'
      and payload->>'role' in ('PLAYER', 'FREEAGENT')
      and nullif(payload->>'programId', '') is not null
      and nullif(payload->>'userId', '') is not null
  ), latest as (
    select distinct on (program_id, user_id)
      program_id,
      leagueapps_team_id,
      user_id,
      jersey_number,
      registration_status,
      last_updated,
      created_ms
    from raw
    order by program_id, user_id, last_updated desc
  ), states as (
    select
      l.*,
      p.id as player_id,
      s.id as season_id,
      m.team_season_id as mapped_team_season_id
    from latest l
    join public.players p on p.leagueapps_user_id = l.user_id
    join public.seasons s on s.leagueapps_program_id = l.program_id
    left join public.leagueapps_team_mappings m
      on m.program_id = l.program_id
     and m.leagueapps_team_id = l.leagueapps_team_id
  ), desired as (
    select *
    from states
    where leagueapps_team_id is not null
      and mapped_team_season_id is not null
      and upper(registration_status) not in ('CANCELLED', 'CANCELED', 'REJECTED', 'DELETED', 'WITHDRAWN')
  )
  select count(*)::integer into eligible from desired;

  -- Close an active assignment only when LeagueApps explicitly removes/cancels
  -- the assignment, or when a resolved team assignment moved to another team.
  with raw as (
    select
      nullif(payload->>'programId', '')::bigint as program_id,
      nullif(payload->>'teamId', '')::bigint as leagueapps_team_id,
      nullif(payload->>'userId', '')::bigint as user_id,
      coalesce(nullif(payload->>'registrationStatus', ''), '') as registration_status,
      coalesce(nullif(payload->>'lastUpdated', '')::bigint, 0) as last_updated
    from public.leagueapps_records
    where resource = 'registrations-2'
      and payload->>'sport' = 'Basketball'
      and payload->>'role' in ('PLAYER', 'FREEAGENT')
      and nullif(payload->>'programId', '') is not null
      and nullif(payload->>'userId', '') is not null
  ), latest as (
    select distinct on (program_id, user_id)
      program_id,
      leagueapps_team_id,
      user_id,
      registration_status,
      last_updated
    from raw
    order by program_id, user_id, last_updated desc
  ), states as (
    select
      l.*,
      p.id as player_id,
      s.id as season_id,
      m.team_season_id as mapped_team_season_id
    from latest l
    join public.players p on p.leagueapps_user_id = l.user_id
    join public.seasons s on s.leagueapps_program_id = l.program_id
    left join public.leagueapps_team_mappings m
      on m.program_id = l.program_id
     and m.leagueapps_team_id = l.leagueapps_team_id
  )
  update public.rosters r
  set left_at = greatest(current_date, r.joined_at)
  from public.team_seasons existing_ts, states s
  where r.team_season_id = existing_ts.id
    and existing_ts.season_id = s.season_id
    and r.player_id = s.player_id
    and r.left_at is null
    and (
      upper(s.registration_status) in ('CANCELLED', 'CANCELED', 'REJECTED', 'DELETED', 'WITHDRAWN')
      or s.leagueapps_team_id is null
      or (s.mapped_team_season_id is not null and r.team_season_id <> s.mapped_team_season_id)
    );
  get diagnostics moved = row_count;

  with raw as (
    select
      nullif(payload->>'programId', '')::bigint as program_id,
      nullif(payload->>'teamId', '')::bigint as leagueapps_team_id,
      nullif(payload->>'userId', '')::bigint as user_id,
      nullif(trim(payload->>'Jersey Number'), '') as jersey_number,
      coalesce(nullif(payload->>'registrationStatus', ''), '') as registration_status,
      coalesce(nullif(payload->>'lastUpdated', '')::bigint, 0) as last_updated,
      coalesce(nullif(payload->>'created', '')::bigint, 0) as created_ms
    from public.leagueapps_records
    where resource = 'registrations-2'
      and payload->>'sport' = 'Basketball'
      and payload->>'role' in ('PLAYER', 'FREEAGENT')
      and nullif(payload->>'programId', '') is not null
      and nullif(payload->>'userId', '') is not null
  ), latest as (
    select distinct on (program_id, user_id)
      program_id,
      leagueapps_team_id,
      user_id,
      jersey_number,
      registration_status,
      last_updated,
      created_ms
    from raw
    order by program_id, user_id, last_updated desc
  ), desired as (
    select
      p.id as player_id,
      m.team_season_id,
      l.jersey_number,
      case
        when l.created_ms > 0
          then (to_timestamp(l.created_ms / 1000.0) at time zone 'UTC')::date
        else current_date
      end as joined_at
    from latest l
    join public.players p on p.leagueapps_user_id = l.user_id
    join public.seasons s on s.leagueapps_program_id = l.program_id
    join public.leagueapps_team_mappings m
      on m.program_id = l.program_id
     and m.leagueapps_team_id = l.leagueapps_team_id
    join public.team_seasons ts
      on ts.id = m.team_season_id
     and ts.season_id = s.id
    where l.leagueapps_team_id is not null
      and upper(l.registration_status) not in ('CANCELLED', 'CANCELED', 'REJECTED', 'DELETED', 'WITHDRAWN')
  )
  insert into public.rosters(team_season_id, player_id, jersey_number, joined_at, left_at)
  select team_season_id, player_id, jersey_number, joined_at, null
  from desired
  on conflict (team_season_id, player_id) do update set
    jersey_number = coalesce(excluded.jersey_number, public.rosters.jersey_number),
    joined_at = least(public.rosters.joined_at, excluded.joined_at),
    left_at = null;
  get diagnostics upserted = row_count;

  -- Keep the player card's jersey number aligned when LeagueApps supplied one.
  with raw as (
    select
      nullif(payload->>'programId', '')::bigint as program_id,
      nullif(payload->>'teamId', '')::bigint as leagueapps_team_id,
      nullif(payload->>'userId', '')::bigint as user_id,
      nullif(trim(payload->>'Jersey Number'), '') as jersey_number,
      coalesce(nullif(payload->>'registrationStatus', ''), '') as registration_status,
      coalesce(nullif(payload->>'lastUpdated', '')::bigint, 0) as last_updated
    from public.leagueapps_records
    where resource = 'registrations-2'
      and payload->>'sport' = 'Basketball'
      and payload->>'role' in ('PLAYER', 'FREEAGENT')
      and nullif(payload->>'programId', '') is not null
      and nullif(payload->>'userId', '') is not null
  ), latest as (
    select distinct on (program_id, user_id)
      program_id,
      leagueapps_team_id,
      user_id,
      jersey_number,
      registration_status,
      last_updated
    from raw
    order by program_id, user_id, last_updated desc
  )
  update public.players p
  set jersey_number = l.jersey_number,
      updated_at = now()
  from latest l
  join public.leagueapps_team_mappings m
    on m.program_id = l.program_id
   and m.leagueapps_team_id = l.leagueapps_team_id
  where p.leagueapps_user_id = l.user_id
    and l.jersey_number is not null
    and upper(l.registration_status) not in ('CANCELLED', 'CANCELED', 'REJECTED', 'DELETED', 'WITHDRAWN')
    and p.jersey_number is distinct from l.jersey_number;

  return next;
end;
$$;

revoke all on function public.materialize_leagueapps_rosters() from public, anon;
grant execute on function public.materialize_leagueapps_rosters() to authenticated, service_role;
