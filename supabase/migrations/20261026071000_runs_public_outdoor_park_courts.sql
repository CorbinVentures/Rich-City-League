begin;

-- Canonical Runs court choices: municipal/county parks and recreation,
-- public-access outdoor basketball only. Do not delete any base data, historical
-- games, or mixed/indoor venues used by other platform sections.
create or replace view public.rch_runs_outdoor_courts
with (security_invoker=true) as
select b.*
from public.basketball_locations b
where b.is_active=true
  and b.region='VA'
  and b.venue_type='outdoor'
  and b.access_type='public'
  and b.verification_status in ('official','provider')
  and b.source_url like 'https://%'
  and b.source_label ~* '(parks?|recreation|prcf|municipal)'
  -- Newport News city asset inventory also contains school courts that
  -- have no confirmed community access and a hoop with no physical court.
  and not (
    b.source_label='City of Newport News Parks GIS'
    and (b.name ~* '^ES[-_]' or coalesce(b.notes,'') ~* 'no court|hoop structure only')
  );
revoke all on public.rch_runs_outdoor_courts from public,anon,authenticated;
grant select on public.rch_runs_outdoor_courts to anon,authenticated;

-- Autocomplete is the same eligible court set as the full Runs World map.
create or replace function public.search_run_venues(
  p_search text default '',
  p_limit integer default 25
)
returns setof public.basketball_locations
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select left(btrim(coalesce(p_search,'')),120) q,
           least(greatest(coalesce(p_limit,25),1),50) lim
  )
  select b.*
  from public.rch_runs_outdoor_courts b cross join params a
  where b.is_active = true
    and (
      a.q = ''
      or b.name ilike '%'||a.q||'%'
      or b.locality ilike '%'||a.q||'%'
      or b.area ilike '%'||a.q||'%'
      or b.address ilike '%'||a.q||'%'
    )
  order by
    case when a.q <> '' and lower(b.name) = lower(a.q) then 0 else 1 end,
    case when a.q <> '' and lower(b.name) like lower(a.q)||'%' then 0 else 1 end,
    case when b.verification_status in ('official','provider') then 0 else 1 end,
    case when b.access_type <> 'varies' then 0 else 1 end,
    case when a.q = '' and b.area in ('Richmond','Henrico','Chesterfield') then 0 else 1 end,
    b.name, b.slug
  limit (select lim from params);
$$;

revoke all on function public.search_run_venues(text,integer) from public,anon,authenticated;
grant execute on function public.search_run_venues(text,integer) to anon,authenticated;

-- Runs-only geographic search. Leave the general basketball discovery RPC
-- untouched for other products that may deliberately include other venues.
create or replace function public.search_rch_outdoor_park_courts(
  p_lat double precision default null,
  p_lon double precision default null,
  p_radius_miles integer default 15,
  p_search text default '',
  p_limit integer default 60,
  p_offset integer default 0
)
returns table(
  slug text,
  name text,
  address text,
  locality text,
  area text,
  latitude double precision,
  longitude double precision,
  venue_type text,
  verification_status text,
  access_type text,
  hours_text text,
  open_gym_text text,
  source_label text,
  source_url text,
  notes text,
  distance_miles double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
with args as (
  select
    case when p_lat between -90 and 90 and p_lon between -180 and 180 then p_lat else null end lat,
    case when p_lat between -90 and 90 and p_lon between -180 and 180 then p_lon else null end lon,
    least(greatest(coalesce(p_radius_miles,15),1),250)::double precision r,
    left(btrim(coalesce(p_search,'')),100) q,
    least(greatest(coalesce(p_limit,60),1),100) lim,
    least(greatest(coalesce(p_offset,0),0),100000) off
), options as (
 select b.*,
 case when a.lat is not null and b.latitude is not null and b.longitude is not null then
   3958.7613 * acos(least(1.0,greatest(-1.0,
    sin(radians(a.lat))*sin(radians(b.latitude))+
    cos(radians(a.lat))*cos(radians(b.latitude))*cos(radians(b.longitude-a.lon))
   )))
 else null end as distance
 from public.rch_runs_outdoor_courts b
 cross join args a
 where b.is_active=true
 and (a.q='' or
   b.name ilike '%'||a.q||'%' or b.area ilike '%'||a.q||'%' or
   b.locality ilike '%'||a.q||'%' or b.address ilike '%'||a.q||'%' or b.postal_code ilike '%'||a.q||'%')
 and (a.lat is null or
   (b.latitude between a.lat-a.r/69.0 and a.lat+a.r/69.0
    and b.longitude between a.lon-a.r/(69.0*greatest(0.25,cos(radians(a.lat)))) and a.lon+a.r/(69.0*greatest(0.25,cos(radians(a.lat))))))
)
select o.slug,o.name,o.address,o.locality,o.area,o.latitude,o.longitude,o.venue_type,
 o.verification_status,o.access_type,o.hours_text,o.open_gym_text,
 o.source_label,o.source_url,o.notes,o.distance::double precision
from options o cross join args a
where a.lat is null or (o.distance is not null and o.distance<=a.r)
order by
 case when a.lat is null then case when o.area in ('Richmond','Henrico','Chesterfield') then 0 else 1 end else 0 end,
 case when a.lat is not null then o.distance else null end asc nulls last,
 o.area asc,o.name asc,o.slug asc
limit (select lim from args) offset (select off from args);
$$;

revoke all on function public.search_rch_outdoor_park_courts(
  double precision,double precision,integer,text,integer,integer
) from public,anon,authenticated;
grant execute on function public.search_rch_outdoor_park_courts(
  double precision,double precision,integer,text,integer,integer
) to anon,authenticated;

-- Prevent new Runs from linking their court to an indoor/private/unverified
-- record even if someone bypasses the picker. Existing Run history is untouched.
create or replace function public.rch_guard_new_run_court()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.location_slug is not null and
    not exists(select 1 from public.rch_runs_outdoor_courts c where c.slug=new.location_slug)
  then
    raise exception 'Choose a verified public outdoor Parks & Recreation basketball court';
  end if;
  return new;
end $$;
revoke all on function public.rch_guard_new_run_court() from public,anon,authenticated;
drop trigger if exists rch_guard_new_run_court on public.runs;
create trigger rch_guard_new_run_court
  before insert or update of location_slug on public.runs
  for each row execute function public.rch_guard_new_run_court();

comment on view public.rch_runs_outdoor_courts is
 'RCH Runs exclusively lists publicly accessible outdoor municipal Parks and Recreation basketball courts; a source record does not imply availability or reservation.';
commit;
