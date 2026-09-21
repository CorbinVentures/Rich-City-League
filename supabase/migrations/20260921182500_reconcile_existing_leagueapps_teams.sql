-- Reconcile LeagueApps teams with existing RCL teams by league + name before external-ID upsert.
-- Prevents teams_league_id_name_key failures when an RCL team already exists from manual/seed data.
create or replace function public.materialize_leagueapps_structure()
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  target_league uuid; season_count integer:=0; team_count integer:=0; assignment_count integer:=0;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select id into target_league from public.leagues where is_active order by created_at limit 1;
  if target_league is null then raise exception 'Create an RCL league before syncing LeagueApps structure'; end if;

  with raw as (
    select nullif(coalesce(payload->>'programId',payload->>'programID'),'')::bigint program_id,
      nullif(trim(coalesce(payload->>'programName',payload->>'program','')),'') program_name,
      nullif(coalesce(payload->>'programStartDate',payload->>'startDate'),'')::bigint start_ms,
      nullif(coalesce(payload->>'programEndDate',payload->>'endDate'),'')::bigint end_ms
    from public.leagueapps_records where resource='registrations-2'
  ), programs as (
    select distinct on(program_id) program_id,program_name,start_ms,end_ms from raw
    where program_id is not null and program_name is not null and start_ms is not null and end_ms is not null order by program_id
  ), normalized as (
    select program_id,program_name,
      least((to_timestamp(start_ms/1000) at time zone 'UTC')::date,(to_timestamp(end_ms/1000) at time zone 'UTC')::date) start_date,
      greatest((to_timestamp(start_ms/1000) at time zone 'UTC')::date,(to_timestamp(end_ms/1000) at time zone 'UTC')::date) end_date
    from programs
  ), ins as (
    insert into public.seasons(league_id,name,slug,start_date,end_date,status,leagueapps_program_id)
    select target_league,program_name,'la-'||program_id||'-'||left(regexp_replace(lower(program_name),'[^a-z0-9]+','-','g'),40),
      start_date,end_date,'draft',program_id from normalized
    on conflict (leagueapps_program_id) where leagueapps_program_id is not null do update set
      name=excluded.name,start_date=excluded.start_date,end_date=excluded.end_date,updated_at=now()
    returning 1
  ) select count(*) into season_count from ins;

  with raw as (
    select distinct nullif(coalesce(payload->>'teamId',payload->>'teamID'),'')::bigint team_id,
      nullif(trim(coalesce(payload->>'teamName',payload->>'team','')),'') team_name
    from public.leagueapps_records where resource='registrations-2'
  )
  update public.teams t set leagueapps_team_id=r.team_id, updated_at=now()
  from raw r
  where r.team_id is not null and r.team_name is not null
    and t.league_id=target_league and lower(trim(t.name))=lower(trim(r.team_name))
    and t.leagueapps_team_id is null
    and not exists(select 1 from public.teams x where x.leagueapps_team_id=r.team_id);

  with raw as (
    select distinct nullif(coalesce(payload->>'teamId',payload->>'teamID'),'')::bigint team_id,
      nullif(trim(coalesce(payload->>'teamName',payload->>'team','')),'') team_name
    from public.leagueapps_records where resource='registrations-2'
  ), ins as (
    insert into public.teams(league_id,name,slug,is_active,leagueapps_team_id)
    select target_league,r.team_name,'la-team-'||r.team_id||'-'||left(regexp_replace(lower(r.team_name),'[^a-z0-9]+','-','g'),35),true,r.team_id
    from raw r
    where r.team_id is not null and r.team_name is not null
      and not exists(select 1 from public.teams t where t.league_id=target_league and lower(trim(t.name))=lower(trim(r.team_name)))
    on conflict (leagueapps_team_id) where leagueapps_team_id is not null do update set name=excluded.name,is_active=true,updated_at=now()
    returning 1
  ) select count(*) into team_count from ins;

  with raw as (
    select distinct nullif(coalesce(payload->>'programId',payload->>'programID'),'')::bigint program_id,
      nullif(coalesce(payload->>'teamId',payload->>'teamID'),'')::bigint team_id,
      nullif(trim(coalesce(payload->>'subProgramName',payload->>'divisionName',payload->>'groupName','')),'') division_name
    from public.leagueapps_records where resource='registrations-2'
  ), divs as (
    insert into public.divisions(season_id,name,age_group,gender,leagueapps_program_id)
    select distinct s.id,r.division_name,'Adult','Open',r.program_id
    from raw r join public.seasons s on s.leagueapps_program_id=r.program_id where r.division_name is not null
    on conflict (season_id,name) do nothing returning 1
  ), assignments as (
    insert into public.team_seasons(team_id,season_id,division_id)
    select distinct t.id,s.id,d.id from raw r
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
