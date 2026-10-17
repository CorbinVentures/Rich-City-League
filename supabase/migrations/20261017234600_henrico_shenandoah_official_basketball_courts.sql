-- Basketball facilities documented on their official county Parks & Recreation pages.
-- Neither court center is inferred from the facility's postal address.
insert into public.basketball_locations
(slug,name,address,locality,area,region,venue_type,access_type,
 verification_status,source_label,source_url,last_verified_on,
 latitude,longitude,hours_text,notes,is_active)
values
('henrico-pr-hunton-community-park','Hunton Community Center & Park','11690 Old Washington Highway, Glen Allen, VA 23059','Glen Allen','Henrico','VA','outdoor','public','official','Henrico Recreation & Parks','https://henrico.gov/rec/places/hunton-2/',date '2026-10-17',null,null,'Park open hours should be confirmed with facility','County''s official Parks & Recreation basketball amenity is evidenced; exact playable-court coordinates are not independently verified. Park use and reservations may vary.',true),
('shenandoah-pr-county-park-maurertown','Shenandoah County Park','380 Park Lane, Maurertown, VA 22644','Shenandoah','Shenandoah','VA','outdoor','public','official','Shenandoah County Parks & Recreation','https://www.shenandoahcountyva.gov/Facilities/Facility/Details/County-Park-2',date '2026-10-17',null,null,'Park open hours should be confirmed with facility','County''s official Parks & Recreation basketball amenity is evidenced; exact playable-court coordinates are not independently verified. Park use and reservations may vary.',true)
on conflict(slug) do nothing;