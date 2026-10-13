-- Wave 3: confirmed Richmond gym sites, public closure status and correct municipal tariffs.
with admin_actor as (select id from public.profiles where role::text='admin' and coalesce(is_active,true) order by id limit 1),
candidate as (select * from jsonb_to_recordset($rcl$[{"name":"Powhatan Community Center","city":"Richmond","address":"5051 Northampton Street","phone":"804-646-0973","url":"https://www.rva.gov/parks-recreation/powhatan-community-center","notes":"City confirms indoor basketball gymnasium. City's GENERAL gym rental tariff is $65/hr before permit/staff; eligibility and actual quote for Powhatan must be confirmed."},{"name":"Southside Community Center","city":"Richmond","address":"6255 Old Warwick Road","phone":"804-646-0761","url":"https://rva.gov/parks-recreation/capital-improvement-projects","notes":"New 2025 facility has indoor auxiliary gym. Published citywide gym rental tariff is not a facility-specific quote. Request details from city scheduling."},{"name":"Luck's Field Community Center","city":"Richmond","address":"1925 U Street","phone":"804-646-0761","url":"https://rva.gov/parks-recreation/capital-improvement-projects","notes":"Reopened September 2025. City athletics program specifically lists Luck's Field Gymnasium; 1925 U Street confirmed in city recreation registration. Exclusive rental eligibility unknown."},{"name":"Hotchkiss Field Community Center","city":"Richmond","address":"701 East Brookland Park Boulevard","phone":"804-646-4466","url":"https://www.rva.gov/parks-recreation/hotchkiss-field-community-center","notes":"Official listing says CLOSED FOR RENOVATIONS as of October 2026. Indoor gym exists but not currently rentable.","closed":true},{"name":"Calhoun Community Center","city":"Richmond","address":"436 Calhoun Street","phone":"804-646-4083","url":"https://www.rva.gov/parks-recreation/about-department","notes":"City August 2026 center status: CLOSED / UNDER CONSTRUCTION; gymnasium refurbishment in city capital plan. No availability.","closed":true}]$rcl$::jsonb) as x(name text,city text,address text,phone text,url text,notes text,closed boolean))
insert into public.rcl_command_venues (source_key,name,city,address,phone,source_url,source_label,source_checked_on,website,
 region_group,venue_kind,source_verification,rate_basis,rate_details,budget_status,availability_status,
 availability_details,rental_allowed,notes,created_by)
select 'rcl-wave3:'||lower(regexp_replace(x.name,'[^a-zA-Z0-9]+','-','g')),x.name,x.city,x.address,x.phone,x.url,
 'City of Richmond official facility and capital improvements pages',date '2026-10-13',x.url,'Richmond Metro',
 'recreation_center','official','unknown',
 'City Richmond general gymnasium rental tariff: $65/hr with 2-hour minimum PLUS staff ($40/hr per staff), $25 permit, possible nonresident surcharge and $100 refundable deposit. This price is NOT confirmed for this specific facility.',
 case when coalesce(x.closed,false) then 'not_rentable' else 'needs_quote' end,
 case when coalesce(x.closed,false) then 'not_rentable' else 'inquiry_required' end,
 case when coalesce(x.closed,false) then 'Official Richmond facility listing says closed/under construction.' else 'Call Richmond scheduling (804) 646-0761 to request actual open dates and event approval.' end,
 case when coalesce(x.closed,false) then false else null end,
 x.notes,a.id
from candidate x cross join admin_actor a
where not exists(select 1 from public.rcl_command_venues v where lower(v.name)=lower(x.name) and lower(v.city)=lower(x.city))
on conflict do nothing;

-- T.B. Smith's old facility listing mentions outdoor-only basketball, but the NEW
-- 2025 community center has an indoor gym. Use new city capital documentation.
update public.rcl_command_venues set phone='804-646-8490',
 source_url='https://rva.gov/parks-recreation/capital-improvement-projects',
 source_label='Richmond Capital Improvements — T.B. Smith completed 2025 indoor gymnasium',
 source_verification='official',source_checked_on=date '2026-10-13',
 availability_status='inquiry_required',
 availability_details='2025 new 30,000 square-foot center contains an indoor basketball gym; city has NOT confirmed any RCL-exclusive game dates. Contact gym staff or City scheduling at (804) 646-0761.',
 hourly_rate=65.00,effective_hourly_rate=105.00,rate_basis='published',budget_status='over_limit',
 rate_details='Citywide published gym rental standard $65/hr with 2-hour minimum, plus $40/hour per required staff member and $25 permit. 30% nonresident rental surcharge may apply; refundable $100 deposit. $105/hr is a hypothetical estimate with ONE staff member, not a confirmed venue quote.',
 notes='The new T.B. Smith indoor basketball gym opened in 2025. City official older facility page still refers to the former building; use capital improvement documentation for current gym existence. Full game, filming and spectator access not yet verified.'
where name='Thomas B. Smith Community Center' and city='Richmond' and source_key like 'rcl-research:%';
