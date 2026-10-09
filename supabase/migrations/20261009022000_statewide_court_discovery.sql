begin;

-- Statewide, paginated court discovery. Works with the existing active-only RLS.
create index if not exists basketball_locations_geo_approx_idx
  on public.basketball_locations(latitude, longitude)
  where is_active = true and latitude is not null and longitude is not null;

create index if not exists basketball_locations_area_name_idx
  on public.basketball_locations(area, name)
  where is_active = true;

create or replace function public.search_basketball_locations(
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
 from public.basketball_locations b
 cross join args a
 where b.is_active=true
 and (a.q='' or
   b.name ilike '%'||a.q||'%' or b.area ilike '%'||a.q||'%' or
   b.locality ilike '%'||a.q||'%' or b.address ilike '%'||a.q||'%')
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

revoke all on function public.search_basketball_locations(double precision,double precision,integer,text,integer,integer)
  from public,anon,authenticated;
grant execute on function public.search_basketball_locations(double precision,double precision,integer,text,integer,integer)
  to anon,authenticated;

commit;