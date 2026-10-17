-- Official county Parks & Recreation basketball-court directory rollout.
-- Names are drawn from the official Arlington and Prince William pages,
-- which explicitly list courts; coordinates, hours and addresses are NOT guessed.
-- No schools are added merely because a district is adjacent to a public park.
with source_rows(slug,name,locality,venue_type,access_type,source_label,source_url) as (
 values
('arlington-pr-alcova-heights-park','Alcova Heights Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-barcroft-park','Barcroft Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-bluemont-park','Bluemont Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-drew-park','Drew Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-fort-bernard-park','Fort Bernard Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-fort-scott-park','Fort Scott Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-glebe-park','Glebe Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-gunston-park','Gunston Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-hayes-park','Hayes Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-highview-park','Highview Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-jamestown-park','Jamestown Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-jennie-dean-park','Jennie Dean Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-lacey-woods-park','Lacey Woods Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-lee-community-center','Lee Community Center','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-lyon-village-park','Lyon Village Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-madison-center','Madison Center','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-madison-manor-park','Madison Manor Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-marcy-road-park','Marcy Road Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-penrose-park','Penrose Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-quincy-park','Quincy Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-rocky-run-park','Rocky Run Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-rosslyn-highlands-park','Rosslyn Highlands Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-stratford-park','Stratford Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-thomas-jefferson-community-center','Thomas Jefferson Community Center','Arlington','mixed','varies','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-tyrol-hills-park','Tyrol Hills Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-virginia-highlands-park','Virginia Highlands Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-westover-park','Westover Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-woodmont-park','Woodmont Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-zitkala-sa-park','Zitkala-Sa Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-butler-holmes-park','Butler Holmes Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-dawson-terrace','Dawson Terrace','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-east-falls-church-park','East Falls Church Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-fairlington-community-center','Fairlington Community Center','Arlington','mixed','varies','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-fort-ethan-allen-park','Fort Ethan Allen Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-greenbrier-park','Greenbrier Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-lubber-run-community-center','Lubber Run Community Center','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-towers-park','Towers Park','Arlington','outdoor','public','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-walter-reed-community-center','Walter Reed Community Center','Arlington','mixed','varies','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-arlington-mill-community-center','Arlington Mill Community Center','Arlington','indoor','varies','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-carver-community-center','Carver Community Center','Arlington','indoor','varies','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-charles-drew-community-center','Charles Drew Community Center','Arlington','indoor','varies','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-gunston-community-center','Gunston Community Center','Arlington','indoor','varies','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('arlington-pr-langston-brown-community-center','Langston-Brown Community Center','Arlington','indoor','varies','Arlington County Parks & Recreation','https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Rentals/Basketball-Courts'),
('pwc-pr-andrew-leitch-park','Andrew Leitch Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-anne-moncure-wall-park','Anne Moncure Wall Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-ben-lomond-park','Ben Lomond Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-birchdale-recreation-center','Birchdale Recreation Center','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-braemar-park','Braemar Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-brittany-park','Brittany Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-cloverdale-park','Cloverdale Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-earl-m-cunard-park','Earl M. Cunard Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-ellis-l-barron-park','Ellis L. Barron Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-george-hellwig-memorial-park','George Hellwig Memorial Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-hammill-mill-park','Hammill Mill Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-james-s-long-regional-park','James S. Long Regional Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-john-d-jenkins-park','John D. Jenkins Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-joseph-d-reading-park','Joseph D. Reading Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-lancaster-park','Lancaster Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-marumsco-acre-lake-park','Marumsco Acre Lake Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-riverbend-park','Riverbend Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-rosemont-lewis-park','Rosemont Lewis Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities'),
('pwc-pr-veterans-memorial-park','Veterans Memorial Park','Prince William','outdoor','public','Prince William County Parks & Recreation','https://pwcaws.pwcva.gov/department/sports-amenities')
)
insert into public.basketball_locations
(slug,name,address,locality,region,area,venue_type,access_type,
 latitude,longitude,verification_status,source_label,source_url,
 last_verified_on,notes,is_active)
select
 s.slug,s.name,'Street address pending facility verification',s.locality,
 'VA',s.locality,s.venue_type,s.access_type,
 null,null,'official',s.source_label,s.source_url,date '2026-10-17',
 'Basketball court or recreation-center gym appears in the official county Parks & Recreation basketball directory. Exact playable-court coordinates and street address require staff review. Facility listing does NOT guarantee open gym access, a reservation or active games.',
 true
from source_rows s
where not exists(
 select 1 from public.basketball_locations b
 where b.verification_status in ('official','provider')
 and lower(b.locality)=lower(s.locality)
 and regexp_replace(lower(b.name),'[^a-z0-9]','','g')=
     regexp_replace(lower(s.name),'[^a-z0-9]','','g')
)
on conflict(slug) do nothing;
