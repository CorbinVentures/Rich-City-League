-- Disable a deprecated LeagueApps importer that reactivated teams from
-- all historical registrations, regardless of program or season.
-- Historical team rows remain in the archive; the current competition API
-- handles upcoming programs and their active franchise teams.
create or replace function public.materialize_leagueapps_structure()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Historical LeagueApps structure sync is retired. Use current competition sync instead.'
    using errcode = '0A000';
end;
$$;
