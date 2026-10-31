begin;

-- Home court is an identity choice across Virginia, not a sanctioned Cup venue.
-- Keep commonwealth_sites for the *separate* challenge and Cup fixture constraints.
alter table public.commonwealth_crews
  drop constraint if exists commonwealth_crews_season_id_home_court_slug_fkey;

-- This RPC is the only browser write path for founding a crew. Retain every
-- membership, age, and season guard; validate the location against active VA data.
create or replace function public.commonwealth_found_crew(
  p_name text, p_court_slug text, p_motto text default ''
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_season uuid; v_crew uuid; v_city text;
begin
  if v_user is null then raise exception 'Sign in to start a crew'; end if;
  if length(btrim(coalesce(p_name,''))) not between 3 and 36
    or length(coalesce(p_motto,''))>160 then
    raise exception 'Check crew name or motto length';
  end if;
  if not exists(
    select 1 from public.profiles p
    where p.id=v_user and p.is_active and not p.is_system_account
      and (p.date_of_birth is null or p.date_of_birth <= current_date-interval '16 years')
  ) then raise exception 'Active member account required'; end if;
  select s.id into v_season
    from public.commonwealth_seasons s
    where s.slug='richmond-founding-2026' and s.status in ('enrollment','active');
  if v_season is null then raise exception 'Founding season is not taking crews'; end if;
  select l.locality into v_city
    from public.basketball_locations l
    where l.slug=p_court_slug and l.is_active=true and l.region='VA'
      and length(btrim(l.locality)) between 2 and 80;
  if v_city is null then raise exception 'Choose an active Virginia court'; end if;
  if exists(
    select 1 from public.commonwealth_crew_members m
    where m.season_id=v_season and m.profile_id=v_user
  ) then raise exception 'You are already in a crew this season'; end if;

  insert into public.commonwealth_crews(
    season_id,captain_id,name,motto,city,home_court_slug
  ) values(v_season,v_user,btrim(p_name),btrim(coalesce(p_motto,'')),v_city,p_court_slug)
  returning id into v_crew;
  insert into public.commonwealth_crew_members(crew_id,season_id,profile_id,role)
    values(v_crew,v_season,v_user,'captain');
  return v_crew;
end $$;
revoke all on function public.commonwealth_found_crew(text,text,text)
  from public,anon,authenticated;
grant execute on function public.commonwealth_found_crew(text,text,text) to authenticated;

-- ZIP lookup reuses the existing paginated, active-only court directory.
-- Geolocation stays opt-in in the client; no coordinates are persisted to profile.
create or replace function public.search_basketball_locations(
  p_lat double precision default null,
  p_lon double precision default null,
  p_radius_miles integer default 15,
  p_search text default '',
  p_limit integer default 60,
  p_offset integer default 0
)
returns table(
  slug text, name text, address text, locality text, area text,
  latitude double precision, longitude double precision,
  venue_type text, verification_status text, access_type text,
  hours_text text, open_gym_text text, source_label text,
  source_url text, notes text, distance_miles double precision
)
language sql stable security invoker set search_path='' as $$
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
   b.locality ilike '%'||a.q||'%' or b.address ilike '%'||a.q||'%' or
   b.postal_code ilike '%'||a.q||'%')
 and (a.lat is null or
   (b.latitude between a.lat-a.r/69.0 and a.lat+a.r/69.0
     and b.longitude between a.lon-a.r/(69.0*greatest(0.25,cos(radians(a.lat))))
                     and a.lon+a.r/(69.0*greatest(0.25,cos(radians(a.lat))))))
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
revoke all on function public.search_basketball_locations(
  double precision,double precision,integer,text,integer,integer
) from public,anon,authenticated;
grant execute on function public.search_basketball_locations(
  double precision,double precision,integer,text,integer,integer
) to anon,authenticated;

comment on column public.commonwealth_crews.home_court_slug is
  'Member-selected home-court identity from the active Virginia court directory; not a venue reservation or a sanctioned Commonwealth Cup competition site.';
commit;
