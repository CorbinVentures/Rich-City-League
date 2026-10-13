-- Second sourced enrichment wave: only facility names listed by official operator.
-- No public operating schedule is a real-time reservation confirmation.
with administrator as (
 select id from public.profiles where role::text='admin' and coalesce(is_active,true) order by id limit 1
), candidates as (
 select * from jsonb_to_recordset($rcl_additions$[["Green Ridge Recreation Center","Roanoke","7415 Wood Haven Road","https://roanokecountyparks.com/175/Gymnasium",50,"540-777-6306","greenridgerentals@roanokecountyva.gov","Southside & Southwest","recreation_center","published","Basketball gym rental pricing STARTS at $50/hour. This is a starting rate, not a guaranteed game-day or exclusive two-court rate; ask about attendance, staffing and weekend premium.","Two full high-school regulation basketball courts. Request date/time from rental coordinator; not a live reservation.",2],["Montpelier Recreation Center and Library","Montpelier","15302 Clazemont Road","https://www.hanovercounty.gov/1208/Montpelier-Recreation-Center-And-Library",null,"804-883-5161",null,"Richmond Metro","recreation_center","unknown","Official Hanover County confirms full-size indoor gym with basketball lines; NO gym rental rate published. Montpelier Park community-center room fee is NOT a basketball-gym rental price.","Published gym hours are open play and programming; organized league events require separate permission.",1],["William Ramsay Recreation Center","Alexandria","5650 Sanger Avenue","https://www.alexandriava.gov/recreation-centers/william-ramsay-recreation-center",null,"703-746-5558",null,"Northern Virginia","recreation_center","unknown","Official City of Alexandria confirms full-size gymnasium. Exclusive court rental price not published.","Operating hours do not establish rental openings. Contact center for dates and insurance.",1],["Gunston Community Center","Arlington","2700 South Lang Street","https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Locations/Indoor-Facilities/Gunston-Community-Center",null,"703-228-6980","facilitiesscheduling@arlingtonva.us","Northern Virginia","recreation_center","unknown","County confirms indoor gymnasium and basketball; county FY27 published $300 nonresident gym rental applies SPECIFICALLY to Arlington Mill and Walter Reed; do not assume Gunston rentable or same tariff.","Gym runs scheduled public activities. Contact Arlington facilities scheduling to determine exclusive access.",1],["Carver Community Center","Arlington","","https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts",null,"703-228-4747","facilitiesscheduling@arlingtonva.us","Northern Virginia","recreation_center","unknown","Listed as indoor basketball court by Arlington County, but no exclusive rental tariff published for this specific venue.","Gym might be programmed for residents; event permits and rental eligibility unknown.",1],["Charles Drew Community Center","Arlington","","https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts",null,"703-228-4747","facilitiesscheduling@arlingtonva.us","Northern Virginia","recreation_center","unknown","Official Arlington indoor basketball court; specific gym rental permit and fee unverified.","Operating/open gym schedule is not a reservable slot.",1],["Fairlington Community Center","Arlington","3308 South Stafford Street","https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts",null,"703-228-4747","facilitiesscheduling@arlingtonva.us","Northern Virginia","recreation_center","unknown","Official county lists ELEMENTARY-SIZE indoor basketball court; not suitable for regulation professional-style RCL game until dimensions confirmed.","Ask county to confirm court size and whether public ticketed games allowed.",1],["Langston-Brown Community Center","Arlington","2121 North Culpeper Street","https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Locations/Indoor-Facilities/Langston-Brown-Community-Center-and-Park",null,"703-228-4747","facilitiesscheduling@arlingtonva.us","Northern Virginia","recreation_center","unknown","Official Arlington basketball/gymnasium facility. No verified exclusive gym hourly rate.","Confirm regulation dimensions, spectator access and closed-out dates.",1],["Thomas Jefferson Community Center","Arlington","3501 South 2nd Street","https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts",null,"703-228-4747","facilitiesscheduling@arlingtonva.us","Northern Virginia","recreation_center","unknown","County lists indoor basketball courts; commercial events require specific permissions.","No live booking availability verified.",1],["Mount Vernon Recreation Center","Alexandria","2701 Commonwealth Avenue","https://www.alexandriava.gov/recreation-centers/mount-vernon-recreation-center",null,"703-746-5556","elsie.akinbobola@alexandriava.gov","Northern Virginia","recreation_center","unknown","Official Alexandria indoor gymnasium; rental tariff needs quote.","The public center hours are not a private rental schedule.",1],["North Phoebus Community Center","Hampton","249 West Chamberlin Avenue","https://www.hampton.gov/facilities/Facility/Details/18",null,"757-727-1160",null,"Hampton Roads","recreation_center","unknown","Official Hampton center lists adult and youth basketball league programming. Verify full gymnasium and room size.","RCL events may require permit, especially spectator ticketing.",null],["South Run RECenter Field House","Springfield","","https://www.fairfaxcounty.gov/parks/facility-rentals",null,"703-324-8680","FCPARECenters@fairfaxcounty.gov","Northern Virginia","fieldhouse","unknown","Fairfax County lists South Run field house for rent but basketball configuration and price not confirmed.","Contact county rental coordinator; no date availability verified.",null],["Sully Community Center Gymnasium","Chantilly","","https://www.fairfaxcounty.gov/parks/gymnasiums",null,"703-324-8680","FCPARECenters@fairfaxcounty.gov","Northern Virginia","recreation_center","unknown","Fairfax County officially identifies Sully indoor gymnasium available for reservation; price not confirmed.","Submit gym rental request with date, time, participants, purpose.",1]]$rcl_additions$::jsonb)
 as x(name text,city text,address text,source_url text,hourly_rate numeric,phone text,email text,region_group text,venue_kind text,rate_basis text,rate_details text,availability_details text,court_count integer)
)
insert into public.rcl_command_venues
 (source_key,name,city,address,source_url,source_label,source_checked_on,hourly_rate,rate_basis,rate_details,
 budget_status,availability_status,availability_details,phone,email,website,region_group,venue_kind,court_count,source_verification,created_by)
select 'rcl-wave2:'||lower(regexp_replace(x.city||':'||x.name,'[^a-zA-Z0-9]+','-','g')),x.name,x.city,x.address,x.source_url,
 'Official city/county facility or gymnasium directory',date '2026-10-13',x.hourly_rate,x.rate_basis,x.rate_details,
 case when x.hourly_rate is null then 'needs_quote' else 'conditional' end,
 'inquiry_required',x.availability_details,x.phone,x.email,x.source_url,x.region_group,x.venue_kind,x.court_count,'official',a.id
from candidates x cross join administrator a
where not exists(select 1 from public.rcl_command_venues v
 where lower(v.name)=lower(x.name) and lower(v.city)=lower(x.city))
on conflict do nothing;

-- Correct conflicting addresses with current operator listings (no staff-created records touched).
update public.rcl_command_venues set address='548 King Arthur Drive',
 notes=concat_ws(' ',notes,'2026 Chesapeake Parks published gym location address is 548 King Arthur Drive.'),
 updated_at=now()
where name='Camelot Community Center' and city='Chesapeake' and source_key like 'rcl-research:%';

update public.rcl_command_venues set address='1001 River Crest Parkway',updated_at=now()
where name='River Crest Community Center' and city='Chesapeake' and source_key like 'rcl-research:%';

-- Four-hour minimum / higher published base: these are NOT ≤$75/hr candidates.
update public.rcl_command_venues set budget_status='over_limit'
where city='Danville' and name in ('Coates Recreation Center','Glenwood Recreation Center','Camp Grove Recreation Center','Activ8 STEM Academy Gymnasium')
 and source_key like 'rcl-research:%';

-- The JMU rate was per sports forum, not a verified entire basketball gym court.
update public.rcl_command_venues set hourly_rate=null,rate_basis='unknown',budget_status='needs_quote',
 rate_details='Official university page advertises $45/hour per Sports Forum, NOT a confirmed regulation-size basketball gym. Verify court dimensions, full-court rental price, public spectators, and outside organization eligibility before booking.'
where name='JMU University Recreation Center — Sports Forum' and source_key like 'rcl-research:%';

-- Lynchburg armory: an additional-hour price is NOT the actual entry hourly cost.
update public.rcl_command_venues set hourly_rate=null,rate_basis='unknown',budget_status='conditional',
 rate_details='Full City Armory rental: $300 for a block of up to 8 hours (equivalent to $37.50/hr only if all 8 hours are used). Each additional hour costs $75. Other charges may apply. Contact venue specialist for dates and full event tariff.'
where name='Lynchburg City Armory' and source_key like 'rcl-research:%';

-- Existing RCH community-mapped venue should link to more authoritative operator evidence.
update public.rcl_command_venues set
 address='2701 Commonwealth Avenue',source_url='https://www.alexandriava.gov/recreation-centers/mount-vernon-recreation-center',
 source_label='City of Alexandria — Mount Vernon Recreation Center',source_verification='official',
 source_checked_on=date '2026-10-13',phone='703-746-5556',
 email='elsie.akinbobola@alexandriava.gov',website='https://www.alexandriava.gov/recreation-centers/mount-vernon-recreation-center',
 venue_kind='recreation_center',region_group='Northern Virginia',budget_status='needs_quote',
 rate_details='Official City of Alexandria confirms indoor gymnasium. Full-court exclusive rental pricing is not published.',
 availability_status='inquiry_required'
where name='Mount Vernon Recreation Center' and city='Alexandria'
 and (source_key like 'rcl-location:%' or source_key like 'rcl-wave2:%');

-- Richmond Metro recreation rooms are sometimes mislabeled basketball gyms.
-- These County pages list multipurpose/art/craft rooms but no indoor full basketball gym.
update public.rcl_command_venues set rental_allowed=false,budget_status='not_rentable',
 availability_status='not_rentable',
 notes='Chesterfield operator page describes multipurpose rooms, not a verified regulation basketball gym. Do not use as RCL home court unless the county confirms an appropriate basketball gym.',
 rate_details='No verified exclusive basketball gym at this facility. Existing rental offer concerns multipurpose rooms, not a full-size basketball court.'
where city='North Chesterfield' and name in ('Stonebridge Recreation Center','Bensley Recreation Center')
 and source_key like 'rcl-research:%';
