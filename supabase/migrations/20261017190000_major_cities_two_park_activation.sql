begin;
-- Official city/parks directories list actual outdoor basketball courts.
-- These are public community pickup opportunities, NOT RCH permits,
-- reservations, endorsed city events or a promise of on-site referees.
-- Research date: 2026-10-17. Check park conditions, hours and group use.
insert into public.basketball_locations (
 slug,name,address,locality,area,region,venue_type,access_type,source_label,
 source_url,notes,last_verified_on,verification_status,is_active
)
select x.slug,x.name,x.address,x.city,x.city,'VA','outdoor','public',
 'Official municipal parks directory',x.url,
 'Municipal facility listing verified on 2026-10-17. '||x.notes||
 ' Suggested unreserved community pickup, not a permitted RCH event.',
 date '2026-10-17','official',true
from (values
 ('rch-weekend-alexandria-potomac-yard-park','Potomac Yard Park','2501 Potomac Ave','Alexandria','Basketball courts open until 10pm unless posted; check notices.','https://www.alexandriava.gov/parks/location/potomac-yard-park',1),
 ('rch-weekend-alexandria-helen-miller-bernard-hunter-park','Helen Miller-Bernard Hunter Park','224 N Fayette St','Alexandria','Outdoor lighted court; league activities may occupy it.','https://www.alexandriava.gov/parks/location/helen-miller-bernard-hunter-park',2),
 ('rch-weekend-bristol-breedlove-charles-park','Breedlove-Charles Park','711 Oakview Avenue','Bristol','Basketball courts listed by the City of Bristol.','https://www.bristolva.gov/facilities/facility/details/BreedloveCharles-Park-9',1),
 ('rch-weekend-bristol-mumpower-park','Mumpower Park','Mumpower Drive','Bristol','Basketball courts listed by the City of Bristol.','https://www.bristolva.gov/facilities/facility/details/Mumpower-Park-10',2),
 ('rch-weekend-charlottesville-belmont-park','Belmont Park','725 Stonehenge Avenue','Charlottesville','Public full basketball court; city allocations can take precedence.','https://charlottesville.gov/Facilities/Facility/Details/Belmont-Park-7',1),
 ('rch-weekend-charlottesville-benjamin-tonsler-park','Benjamin Tonsler Park','500 Cherry Avenue','Charlottesville','Public outdoor lighted basketball courts; city allocations can take precedence.','https://www.charlottesville.gov/Facilities/Facility/Details/Tonsler-Park-38',2),
 ('rch-weekend-danville-doyle-thomas-park','Doyle Thomas Park','827 Green Street','Danville','Also known as Green Street Park; public outdoor court.','https://danvilleva.gov/2025/Neighborhood-Parks',1),
 ('rch-weekend-danville-pumpkin-creek-park','Pumpkin Creek Park','315 Taylor Drive','Danville','Outdoor basketball courts; public city park.','https://danvilleva.gov/2025/Neighborhood-Parks',2),
 ('rch-weekend-fairfax-cardinal-park','Cardinal Park','9701 Cardinal Road','Fairfax','Public outdoor basketball court; dawn to dusk.','https://www.fairfaxva.gov/Fun-Facilities/Parks/Parks-Directory/Cardinal-Park-formerly-known-as-Ranger-Rd-Park',1),
 ('rch-weekend-fairfax-fairchester-woods-park','Fairchester Woods Park','10836 Warwick Avenue','Fairfax','HALF basketball court: 3v3 half-court play only; confirm court suitability before organized games.','https://www.fairfaxva.gov/Fun-Facilities/Parks/Parks-Directory',2),
 ('rch-weekend-fredericksburg-maury-park','Maury Park','901 Kenmore Avenue','Fredericksburg','Public lighted court. Park open 5am-10pm.','https://www.fredericksburgva.gov/1553/Maury-Park',1),
 ('rch-weekend-fredericksburg-w-l-harris-park','W.L. Harris Park','320 Tyler Street','Fredericksburg','Public lighted basketball court. Park open 6am-10pm.','https://www.fredericksburgva.gov/1557/WL-Harris-Park',2),
 ('rch-weekend-lynchburg-jefferson-park','Jefferson Park','405 York Street','Lynchburg','Outdoor community basketball courts; public park.','https://www.lynchburgparksandrec.com/our-parks/jefferson-park/',1),
 ('rch-weekend-lynchburg-miller-park','Miller Park','2100 Park Avenue','Lynchburg','City public basketball court; local programs can take precedence.','https://www.lynchburgparksandrec.com/our-parks/miller-park/',2),
 ('rch-weekend-norfolk-shoop-park','Shoop Park','2400 Shoop Avenue','Norfolk','Free public neighborhood park with outdoor basketball; sunrise to sunset.','https://norfolk.gov/Facilities/Facility/Details/Shoop-Park-189',1),
 ('rch-weekend-norfolk-lakewood-park','Lakewood Park','1612 Willow Wood Dr.','Norfolk','Public outdoor basketball court; verify availability.','https://norfolk.gov/facilities/facility/details/lakewood-park-37',2),
 ('rch-weekend-petersburg-farmer-street-park','Farmer Street Park','1200 Farmer Street','Petersburg','City park with outdoor basketball court.','https://www.petersburgva.gov/Facilities/Facility/Details/Farmer-Street-Park-28',1),
 ('rch-weekend-petersburg-legends-park','Legends Park','1616 Defense Rd','Petersburg','City park with basketball; verify the outdoor court and group-use rules.','https://www.petersburgva.gov/facilities/facility/details/Legends-Park-1',2),
 ('rch-weekend-roanoke-horton-park','Horton Park','2500 Salem Turnpike NW','Roanoke','City park with two basketball courts.','https://www.playroanoke.com/parks-facilities/horton-park/',1),
 ('rch-weekend-roanoke-washington-park','Washington Park','1610 Burrell St NW','Roanoke','City park with outdoor basketball courts; pool season is separate.','https://www.playroanoke.com/parks-facilities/washington-park/',2),
 ('rch-weekend-virginia-beach-city-view-park','City View Park','2073 Kempsville Rd','Virginia Beach','City park with basketball courts; sports fields have separate rental restrictions.','https://parks.virginiabeach.gov/outdoors/city-parks/city-view-park',1),
 ('rch-weekend-virginia-beach-little-island-park','Little Island Park','3820 Sandpiper Rd','Virginia Beach','City park basketball courts; seasonal parking charges may apply.','https://parks.virginiabeach.gov/outdoors/city-parks/little-island-park',2),
 ('rch-weekend-winchester-frederick-douglass-park','Frederick Douglass Park','598 N Kent Street','Winchester','Outdoor court; park dawn to dusk.','https://www.winchesterva.gov/Parks-Recreation/Neighborhood-Parks/Frederick-Douglass-Park',1),
 ('rch-weekend-winchester-weaver-park','Weaver Park','167 Bruce Dr','Winchester','Outdoor court; park dawn to dusk.','https://www.winchesterva.gov/Parks-Recreation/Neighborhood-Parks/Weaver-Park',2)
) as x(slug,name,address,city,notes,url,slot)
on conflict(slug) do nothing;

-- Existing Richmond and Newport News retain their four-park rotations.
-- Major markets missing four sites may begin with two verified parks,
-- alternating Sat/Sun at those same two parks each week.
insert into public.rch_weekend_circuit_courts(city,slot,court_slug)
select x.city,x.slot,x.slug
from (values
 ('rch-weekend-alexandria-potomac-yard-park','Potomac Yard Park','2501 Potomac Ave','Alexandria','Basketball courts open until 10pm unless posted; check notices.','https://www.alexandriava.gov/parks/location/potomac-yard-park',1),
 ('rch-weekend-alexandria-helen-miller-bernard-hunter-park','Helen Miller-Bernard Hunter Park','224 N Fayette St','Alexandria','Outdoor lighted court; league activities may occupy it.','https://www.alexandriava.gov/parks/location/helen-miller-bernard-hunter-park',2),
 ('rch-weekend-bristol-breedlove-charles-park','Breedlove-Charles Park','711 Oakview Avenue','Bristol','Basketball courts listed by the City of Bristol.','https://www.bristolva.gov/facilities/facility/details/BreedloveCharles-Park-9',1),
 ('rch-weekend-bristol-mumpower-park','Mumpower Park','Mumpower Drive','Bristol','Basketball courts listed by the City of Bristol.','https://www.bristolva.gov/facilities/facility/details/Mumpower-Park-10',2),
 ('rch-weekend-charlottesville-belmont-park','Belmont Park','725 Stonehenge Avenue','Charlottesville','Public full basketball court; city allocations can take precedence.','https://charlottesville.gov/Facilities/Facility/Details/Belmont-Park-7',1),
 ('rch-weekend-charlottesville-benjamin-tonsler-park','Benjamin Tonsler Park','500 Cherry Avenue','Charlottesville','Public outdoor lighted basketball courts; city allocations can take precedence.','https://www.charlottesville.gov/Facilities/Facility/Details/Tonsler-Park-38',2),
 ('rch-weekend-danville-doyle-thomas-park','Doyle Thomas Park','827 Green Street','Danville','Also known as Green Street Park; public outdoor court.','https://danvilleva.gov/2025/Neighborhood-Parks',1),
 ('rch-weekend-danville-pumpkin-creek-park','Pumpkin Creek Park','315 Taylor Drive','Danville','Outdoor basketball courts; public city park.','https://danvilleva.gov/2025/Neighborhood-Parks',2),
 ('rch-weekend-fairfax-cardinal-park','Cardinal Park','9701 Cardinal Road','Fairfax','Public outdoor basketball court; dawn to dusk.','https://www.fairfaxva.gov/Fun-Facilities/Parks/Parks-Directory/Cardinal-Park-formerly-known-as-Ranger-Rd-Park',1),
 ('rch-weekend-fairfax-fairchester-woods-park','Fairchester Woods Park','10836 Warwick Avenue','Fairfax','HALF basketball court: 3v3 half-court play only; confirm court suitability before organized games.','https://www.fairfaxva.gov/Fun-Facilities/Parks/Parks-Directory',2),
 ('rch-weekend-fredericksburg-maury-park','Maury Park','901 Kenmore Avenue','Fredericksburg','Public lighted court. Park open 5am-10pm.','https://www.fredericksburgva.gov/1553/Maury-Park',1),
 ('rch-weekend-fredericksburg-w-l-harris-park','W.L. Harris Park','320 Tyler Street','Fredericksburg','Public lighted basketball court. Park open 6am-10pm.','https://www.fredericksburgva.gov/1557/WL-Harris-Park',2),
 ('rch-weekend-lynchburg-jefferson-park','Jefferson Park','405 York Street','Lynchburg','Outdoor community basketball courts; public park.','https://www.lynchburgparksandrec.com/our-parks/jefferson-park/',1),
 ('rch-weekend-lynchburg-miller-park','Miller Park','2100 Park Avenue','Lynchburg','City public basketball court; local programs can take precedence.','https://www.lynchburgparksandrec.com/our-parks/miller-park/',2),
 ('rch-weekend-norfolk-shoop-park','Shoop Park','2400 Shoop Avenue','Norfolk','Free public neighborhood park with outdoor basketball; sunrise to sunset.','https://norfolk.gov/Facilities/Facility/Details/Shoop-Park-189',1),
 ('rch-weekend-norfolk-lakewood-park','Lakewood Park','1612 Willow Wood Dr.','Norfolk','Public outdoor basketball court; verify availability.','https://norfolk.gov/facilities/facility/details/lakewood-park-37',2),
 ('rch-weekend-petersburg-farmer-street-park','Farmer Street Park','1200 Farmer Street','Petersburg','City park with outdoor basketball court.','https://www.petersburgva.gov/Facilities/Facility/Details/Farmer-Street-Park-28',1),
 ('rch-weekend-petersburg-legends-park','Legends Park','1616 Defense Rd','Petersburg','City park with basketball; verify the outdoor court and group-use rules.','https://www.petersburgva.gov/facilities/facility/details/Legends-Park-1',2),
 ('rch-weekend-roanoke-horton-park','Horton Park','2500 Salem Turnpike NW','Roanoke','City park with two basketball courts.','https://www.playroanoke.com/parks-facilities/horton-park/',1),
 ('rch-weekend-roanoke-washington-park','Washington Park','1610 Burrell St NW','Roanoke','City park with outdoor basketball courts; pool season is separate.','https://www.playroanoke.com/parks-facilities/washington-park/',2),
 ('rch-weekend-virginia-beach-city-view-park','City View Park','2073 Kempsville Rd','Virginia Beach','City park with basketball courts; sports fields have separate rental restrictions.','https://parks.virginiabeach.gov/outdoors/city-parks/city-view-park',1),
 ('rch-weekend-virginia-beach-little-island-park','Little Island Park','3820 Sandpiper Rd','Virginia Beach','City park basketball courts; seasonal parking charges may apply.','https://parks.virginiabeach.gov/outdoors/city-parks/little-island-park',2),
 ('rch-weekend-winchester-frederick-douglass-park','Frederick Douglass Park','598 N Kent Street','Winchester','Outdoor court; park dawn to dusk.','https://www.winchesterva.gov/Parks-Recreation/Neighborhood-Parks/Frederick-Douglass-Park',1),
 ('rch-weekend-winchester-weaver-park','Weaver Park','167 Bruce Dr','Winchester','Outdoor court; park dawn to dusk.','https://www.winchesterva.gov/Parks-Recreation/Neighborhood-Parks/Weaver-Park',2)
) as x(slug,name,address,city,notes,url,slot)
join public.basketball_locations l on l.slug=x.slug
join public.rch_weekend_circuit_city_targets t on t.city_name=x.city and t.is_major
where l.is_active and l.access_type='public' and l.venue_type='outdoor'
 and l.verification_status in ('official','provider')
 and lower(trim(l.locality))=lower(trim(x.city))
 and l.name ~* '(park|playground)'
on conflict do nothing;

create or replace function public.rch_generate_weekend_circuit(p_weeks integer default 8)
returns integer language plpgsql security definer set search_path='' as $circuit$
declare
 v_saturday date;
 v_today date := (now() at time zone 'America/New_York')::date;
 v_city text; v_slot integer; v_day integer; v_offset integer; v_pool_size integer;
 v_court public.basketball_locations%rowtype;
 v_start timestamptz; v_admin uuid; v_id uuid; v_created integer:=0;
begin
 if p_weeks not between 1 and 12 then raise exception 'Weeks must be 1 to 12'; end if;
 perform pg_catalog.pg_advisory_xact_lock(748213,20261024);
 select p.id into v_admin from public.profiles p where p.role::text='admin'
   and p.is_active and not coalesce(p.is_system_account,false) order by p.id limit 1;
 if v_admin is null then return 0; end if;
 v_saturday:=v_today-(extract(isodow from v_today)::integer-1)+5;
 for v_offset in 0..p_weeks-1 loop
   for v_city,v_pool_size in
     select c.city,count(*)::integer
     from public.rch_weekend_circuit_courts c
     join public.basketball_locations l on l.slug=c.court_slug
     join public.rch_weekend_circuit_city_targets t on t.city_name=c.city
     where c.active and l.is_active and l.venue_type='outdoor'
       and lower(trim(l.locality))=lower(trim(c.city))
       and l.access_type='public' and l.verification_status in ('official','provider')
       and l.name ~* '(park|playground)'
     group by c.city,t.is_major
     having count(*) in (2,4)
       and count(distinct c.court_slug)=count(*)
       and count(distinct lower(trim(l.name)))=count(*)
       and (count(*)=4 or (t.is_major and count(*)=2))
       and count(*)=max(c.slot) and min(c.slot)=1
     order by c.city
   loop
     for v_day in 0..1 loop
       v_slot:=case when v_pool_size=2 then v_day+1
                     when (((v_saturday+v_offset*7)-date '2026-10-24')/7)%2=0
                     then v_day+1 else v_day+3 end;
       select l.* into v_court
       from public.rch_weekend_circuit_courts c
       join public.basketball_locations l on l.slug=c.court_slug
       where c.city=v_city and c.slot=v_slot and c.active;
       if v_court.slug is null then continue; end if;
       v_start:=((v_saturday+v_offset*7+v_day)
                 + case when v_day=0 then time '11:00' else time '15:00' end)
                 at time zone 'America/New_York';
       if v_start<=now() then continue; end if;
       -- One event per city per day, even during a 2-to-4 court upgrade.
       if exists(select 1 from public.rch_weekend_circuit_events e
         where e.city=v_city and e.weekend_start=v_saturday+v_offset*7
           and (e.starts_at at time zone 'America/New_York')::date
                 = (v_start at time zone 'America/New_York')::date)
       then continue; end if;
       insert into public.runs(
         host_id,title,description,run_type,skill_level,game_format,
         court_name,location,location_slug,starts_at,capacity,max_players,
         status,allow_fan_checkin
       ) values (
         v_admin,'RCH Weekend Double XP • '||v_court.name,
         'Recurring community drop-in at a public park. This is a suggested meetup, not a reserved court or a guaranteed RCH-staffed session. Check park hours and availability. Double Runs REP applies only to independently confirmed competitive game and reviewed stat rewards; ordinary check-ins, highlights and player-hosted Runs are 1x. 3v3 is the ranked format for this listing; casual pickup is welcome.',
         'competitive','all','3v3',
         v_court.name,v_court.name||', '||v_city||', VA',v_court.slug,v_start,18,18,
         'open',true
       ) returning id into v_id;
       insert into public.rch_weekend_circuit_events(
         run_id,city,weekend_start,slot,court_slug,starts_at
       ) values (v_id,v_city,v_saturday+v_offset*7,v_slot,v_court.slug,v_start);
       v_created:=v_created+1;
     end loop;
   end loop;
 end loop;
 return v_created;
end $circuit$;
-- Protect the RPC: the scheduler alone calls the security-definer generator.
revoke all on function public.rch_generate_weekend_circuit(integer) from public,anon,authenticated;

-- Distinct 2-site starter pools and 4-site rotating pools both qualify as ready.
create or replace view public.rch_weekend_circuit_coverage
with (security_invoker=true) as
select t.city_id,t.city_name,t.is_major,
 coalesce(d.verified_sites,0)::integer as verified_eligible_park_sites,
 coalesce(d.mapped_unverified,0)::integer as mapped_unverified_sites,
 coalesce(c.assigned_total,0)::integer as assigned_slots,
 coalesce(c.qualified_total,0)::integer as qualified_slots,
 coalesce(e.upcoming,0)::integer as upcoming_featured_runs,
 case
  when coalesce(c.qualified_total,0)>=case when t.is_major then 2 else 4 end
    and coalesce(e.upcoming,0)>0 then 'scheduled'
  when coalesce(c.qualified_total,0)>=case when t.is_major then 2 else 4 end
    then 'ready_to_generate'
  when coalesce(d.verified_sites,0)>=case when t.is_major then 2 else 4 end
    then 'needs_court_assignment'
  else 'needs_venue_verification'
 end as circuit_status
from public.rch_weekend_circuit_city_targets t
left join lateral (
 select count(distinct lower(trim(l.name))) filter(
   where l.verification_status in ('official','provider') and l.access_type='public'
     and l.venue_type='outdoor' and l.name ~* '(park|playground)'
 ) as verified_sites,
 count(distinct l.slug) filter(where l.verification_status='community') as mapped_unverified
 from public.basketball_locations l
 where l.is_active and lower(trim(l.locality))=lower(trim(t.city_name))
) d on true
left join lateral (
 select count(*) as assigned_total,
 count(distinct lower(trim(l.name))) filter(where cc.active and l.is_active
    and lower(trim(l.locality))=lower(trim(t.city_name))
    and l.access_type='public' and l.venue_type='outdoor'
    and l.verification_status in ('official','provider')
    and l.name ~* '(park|playground)') as qualified_total
 from public.rch_weekend_circuit_courts cc
 join public.basketball_locations l on l.slug=cc.court_slug
 where cc.city=t.city_name
) c on true
left join lateral (
 select count(*) as upcoming
 from public.rch_weekend_circuit_events ce
 join public.runs r on r.id=ce.run_id
 where ce.city=t.city_name and ce.starts_at>now()
  and r.status in ('open','full') and ce.bonus_enabled
) e on true;
revoke all on public.rch_weekend_circuit_coverage from public,anon,authenticated;
grant select on public.rch_weekend_circuit_coverage to anon,authenticated;
comment on view public.rch_weekend_circuit_coverage is
'Major Virginia markets activate with two distinct, officially mapped public outdoor basketball parks (slots 1 and 2); four-slot cities retain alternating rotations. Unstaffed open pickup is not a court reservation.';

-- Schedule once now as well as by the already-installed daily cron job.
select public.rch_generate_weekend_circuit(8);
commit;
