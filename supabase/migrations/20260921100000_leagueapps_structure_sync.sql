-- Materialize LeagueApps competition structure from registration exports without duplicate entry.
-- LeagueApps remains source-of-truth; RCL records retain external IDs for repeatable syncs.
alter table public.seasons add column if not exists leagueapps_program_id bigint;
alter table public.divisions add column if not exists leagueapps_program_id bigint;
alter table public.teams add column if not exists leagueapps_team_id bigint;
alter table public.games add column if not exists leagueapps_game_id bigint;

create unique index if not exists seasons_leagueapps_program_uidx on public.seasons(leagueapps_program_id) where leagueapps_program_id is not null;
create unique index if not exists divisions_leagueapps_program_uidx on public.divisions(season_id,leagueapps_program_id) where leagueapps_program_id is not null;
create unique index if not exists teams_leagueapps_team_uidx on public.teams(leagueapps_team_id) where leagueapps_team_id is not null;
create unique index if not exists games_leagueapps_game_uidx on public.games(leagueapps_game_id) where leagueapps_game_id is not null;

create or replace function public.materialize_leagueapps_structure()
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  target_league uuid;
  season_count integer := 0;
  team_count integer := 0;
  assignment_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select id into target_league from public.leagues where is_active order by created_at limit 1;
  if target_league is null then raise exception 'Create an RCL league before syncing LeagueApps structure'; end if;

  with raw as (
    select payload,
      nullif(coalesce(payload->>'programId',payload->>'programID'),'')::bigint program_id,
      nullif(trim(coalesce(payload->>'programName',payload->>'program','')),'') program_name,
      nullif(coalesce(payload->>'teamId',payload->>'teamID'),'')::bigint team_id,
      nullif(trim(coalesce(payload->>'teamName',payload->>'team','')),'') team_name,
      nullif(trim(coalesce(payload->>'subProgramName',payload->>'divisionName',payload->>'groupName','')),'') division_name,
      nullif(coalesce(payload->>'programStartDate',payload->>'startDate'),'')::bigint start_ms,
      nullif(coalesce(payload->>'programEndDate',payload->>'endDate'),'')::bigint end_ms
    from public.leagueapps_records where resource='registrations-2'
  ), programs as (
    select distinct on(program_id) program_id,program_name,start_ms,end_ms
    from raw where program_id is not null and program_name is not null and start_ms is not null and end_ms is not null
    order by program_id
  ), ins as (
    insert into public.seasons(league_id,name,slug,start_date,end_date,status,leagueapps_program_id)
    select target_league,program_name,
      'la-'||program_id||'-'||left(regexp_replace(lower(program_name),'[^a-z0-9]+','-','g'),40),
      (to_timestamp(start_ms/1000) at time zone 'UTC')::date,
      (to_timestamp(end_ms/1000) at time zone 'UTC')::date,
      'draft',program_id
    from programs
    on conflict (leagueapps_program_id) where leagueapps_program_id is not null do update set
      name=excluded.name,start_date=excluded.start_date,end_date=excluded.end_date,updated_at=now()
    returning 1
  ) select count(*) into season_count from ins;

  with raw as (
    select distinct
      nullif(coalesce(payload->>'programId',payload->>'programID'),'')::bigint program_id,
      nullif(coalesce(payload->>'teamId',payload->>'teamID'),'')::bigint team_id,
      nullif(trim(coalesce(payload->>'teamName',payload->>'team','')),'') team_name,
      nullif(trim(coalesce(payload->>'subProgramName',payload->>'divisionName',payload->>'groupName','')),'') division_name
    from public.leagueapps_records where resource='registrations-2'
  ), ins_teams as (
    insert into public.teams(league_id,name,slug,is_active,leagueapps_team_id)
    select target_league,team_name,'la-team-'||team_id||'-'||left(regexp_replace(lower(team_name),'[^a-z0-9]+','-','g'),35),true,team_id
    from raw where team_id is not null and team_name is not null
    on conflict (leagueapps_team_id) where leagueapps_team_id is not null do update set name=excluded.name,is_active=true,updated_at=now()
    returning 1
  ) select count(*) into team_count from ins_teams;

  with raw as (
    select distinct
      nullif(coalesce(payload->>'programId',payload->>'programID'),'')::bigint program_id,
      nullif(coalesce(payload->>'teamId',payload->>'teamID'),'')::bigint team_id,
      nullif(trim(coalesce(payload->>'subProgramName',payload->>'divisionName',payload->>'groupName','')),'') division_name
    from public.leagueapps_records where resource='registrations-2'
  ), divs as (
    insert into public.divisions(season_id,name,age_group,gender,leagueapps_program_id)
    select s.id,r.division_name,'Adult','Open',r.program_id
    from raw r join public.seasons s on s.leagueapps_program_id=r.program_id
    where r.division_name is not null
    on conflict (season_id,name) do nothing
    returning 1
  ), assignments as (
    insert into public.team_seasons(team_id,season_id,division_id)
    select t.id,s.id,d.id
    from raw r
    join public.seasons s on s.leagueapps_program_id=r.program_id
    join public.teams t on t.leagueapps_team_id=r.team_id
    left join public.divisions d on d.season_id=s.id and d.name=r.division_name
    where r.team_id is not null
    on conflict (team_id,season_id) do update set division_id=coalesce(excluded.division_id,team_seasons.division_id)
    returning 1
  ) select count(*) into assignment_count from assignments;

  return jsonb_build_object('seasons',season_count,'teams',team_count,'teamSeasons',assignment_count);
end $$;
revoke all on function public.materialize_leagueapps_structure() from public;
grant execute on function public.materialize_leagueapps_structure() to authenticated;
