-- Allow the server-only service role to reconcile imported LeagueApps players while
-- preserving the existing admin check for browser-authenticated calls.
create or replace function public.materialize_leagueapps_players()
returns table(inserted integer, updated integer, eligible integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  before_count integer;
  after_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select count(*) into before_count
  from public.players
  where leagueapps_user_id is not null;

  with ranked as (
    select distinct on ((payload->>'userId')::bigint)
      (payload->>'userId')::bigint user_id,
      nullif(payload->>'userProfileId','')::bigint profile_id,
      trim(payload->>'firstName') first_name,
      trim(payload->>'lastName') last_name,
      nullif(trim(payload->>'city'),'') city,
      case
        when nullif(payload->>'birthDate','') is not null
          then (to_timestamp((payload->>'birthDate')::bigint / 1000) at time zone 'UTC')::date
      end dob,
      coalesce(nullif(payload->>'lastUpdated','')::bigint, 0) last_updated
    from public.leagueapps_records
    where resource = 'registrations-2'
      and payload->>'sport' = 'Basketball'
      and payload->>'role' in ('PLAYER','FREEAGENT')
      and nullif(payload->>'userId','') is not null
      and nullif(trim(payload->>'firstName'),'') is not null
      and nullif(trim(payload->>'lastName'),'') is not null
    order by (payload->>'userId')::bigint,
      coalesce(nullif(payload->>'lastUpdated','')::bigint, 0) desc
  )
  insert into public.players(
    first_name,last_name,date_of_birth,hometown,is_active,
    leagueapps_user_id,leagueapps_profile_id,leagueapps_last_updated
  )
  select first_name,last_name,dob,city,true,user_id,profile_id,last_updated
  from ranked
  on conflict (leagueapps_user_id) where leagueapps_user_id is not null do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    date_of_birth = coalesce(excluded.date_of_birth, players.date_of_birth),
    hometown = coalesce(excluded.hometown, players.hometown),
    leagueapps_profile_id = coalesce(excluded.leagueapps_profile_id, players.leagueapps_profile_id),
    leagueapps_last_updated = excluded.leagueapps_last_updated,
    updated_at = now();

  select count(*) into after_count
  from public.players
  where leagueapps_user_id is not null;

  return query
  select greatest(after_count - before_count, 0), least(before_count, after_count), after_count;
end;
$$;

revoke all on function public.materialize_leagueapps_players() from public, anon;
grant execute on function public.materialize_leagueapps_players() to authenticated, service_role;
