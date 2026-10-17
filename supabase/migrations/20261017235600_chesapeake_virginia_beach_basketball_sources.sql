-- Source-specific 2026 Virginia coastal city Parks & Recreation basketball amenities.
-- These venue records carry documented existence, not a GPS court center.
with source_rows(slug,name,address,locality,venue_type,access_type,source_label,source_url,notes) as(
 values
  ('chesapeake-pr-james-w-mcneil-park', 'James W. McNeil Park', '1060 Cascade Blvd, Chesapeake, VA 23324', 'Chesapeake', 'outdoor', 'public', 'City of Chesapeake Parks, Recreation & Tourism', 'https://www.cityofchesapeake.net/facilities/facility/details/James-W-McNeil-Park-47', 'Basketball court listed in official city park amenities. Check posted rules.'),
  ('chesapeake-pr-claire-r-askew-western-branch-park', 'Claire R. Askew Western Branch Park', '4437 Portsmouth Boulevard, Chesapeake, VA 23321', 'Chesapeake', 'outdoor', 'public', 'City of Chesapeake Parks, Recreation & Tourism', 'https://www.cityofchesapeake.net/Facilities/Facility/Details/Western-Branch-Park-103', 'Half-court basketball courts; city''s facility page explicitly says basketball is first-come public use.'),
  ('chesapeake-pr-chesapeake-city-park', 'Chesapeake City Park', '900 City Park Drive, Chesapeake, VA 23320', 'Chesapeake', 'outdoor', 'public', 'City of Chesapeake Parks, Recreation & Tourism', 'https://www.cityofchesapeake.net/facilities/facility/details/Chesapeake-City-Park-92', 'City facility lists basketball among park amenities. General park hours may differ from any events.'),
  ('chesapeake-pr-indian-river-park', 'Indian River Park', '1709 Rokeby Avenue, Chesapeake, VA 23320', 'Chesapeake', 'outdoor', 'public', 'City of Chesapeake Parks, Recreation & Tourism', 'https://www.cityofchesapeake.net/facilities/facility/details/Indian-River-Park-98', 'Basketball courts are specifically listed in the NORTH SIDE at 1709 Rokeby Avenue; preserve this distinction from the south-side entrance.'),
  ('chesapeake-pr-crestwood-park-park-side', 'Crestwood Park (Park Side)', '1240 Great Bridge Blvd, Chesapeake, VA 23320', 'Chesapeake', 'outdoor', 'public', 'City of Chesapeake Parks, Recreation & Tourism', 'https://www.cityofchesapeake.net/facilities/facility/details/Crestwood-Park-Park-Side-30', 'Official city listing identifies a basketball court at the park side.'),
  ('chesapeake-pr-campostella-square-park', 'Campostella Square Park', '2019 Windy Road, Chesapeake, VA 23324', 'Chesapeake', 'outdoor', 'public', 'City of Chesapeake Parks, Recreation & Tourism', 'https://www.cityofchesapeake.net/facilities/facility/details/Campostella-Square-Park-20', 'Official city listing includes a basketball court.'),
  ('chesapeake-pr-dunedin-park-m-anne-tregembo-park', 'Dunedin Park – M. Anne Tregembo Park', '3360 Dunedin Drive, Chesapeake, VA 23321', 'Chesapeake', 'outdoor', 'public', 'City of Chesapeake Parks, Recreation & Tourism', 'https://www.cityofchesapeake.net/Facilities/Facility/Details/Dunedin-Park-M-Anne-Tregembo-Park-34', 'Official city park includes a basketball court.'),
  ('vb-pr-level-green-park', 'Level Green Park', '1520 Level Green Blvd, Virginia Beach, VA 23464', 'Virginia Beach', 'outdoor', 'public', 'City of Virginia Beach Parks & Recreation', 'https://parks.virginiabeach.gov/outdoors/city-parks/level-green-park', 'Current official park page confirms two full-size basketball courts following 2025 upgrades; opening announcement May 2026.'),
  ('vb-pr-bayville-farms-park', 'Bayville Farms Park', '4132 First Court Road, Virginia Beach, VA', 'Virginia Beach', 'outdoor', 'public', 'City of Virginia Beach Parks & Recreation', 'https://parks.virginiabeach.gov/outdoors/city-parks/bayville-farms-park', 'Current official park page confirms three LIGHTED basketball courts.'),
  ('vb-pr-great-neck-park', 'Great Neck Park', '2513 Shorehaven Dr, Virginia Beach, VA 23454', 'Virginia Beach', 'outdoor', 'public', 'City of Virginia Beach Parks & Recreation', 'https://parks.virginiabeach.gov/outdoors/city-parks/great-neck-park', 'Current official park page confirms three basketball courts. Baseball fields are separately restricted and must not be mistaken for basketball court access.')
)
insert into public.basketball_locations(
 slug,name,address,locality,area,region,venue_type,access_type,
 latitude,longitude,verification_status,source_label,source_url,last_verified_on,notes,is_active)
select s.slug,s.name,s.address,s.locality,s.locality,'VA',s.venue_type,s.access_type,
 null,null,'official',s.source_label,s.source_url,date '2026-10-17',
 s.notes||' Facility schedule and exact playable-court coordinates require independent verification.',true
from source_rows s
where not exists (
 select 1 from public.basketball_locations b where b.is_active
 and b.verification_status in ('official','provider')
 and lower(trim(b.locality))=lower(trim(s.locality))
 and regexp_replace(lower(b.name),'[^a-z0-9]','','g')=regexp_replace(lower(s.name),'[^a-z0-9]','','g')
)
on conflict (slug) do nothing;