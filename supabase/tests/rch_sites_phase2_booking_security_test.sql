begin;
select no_plan();
set role postgres;
insert into auth.users(id,aud,role,email)
values
('a6090000-0000-4000-8000-000000000001','authenticated','authenticated','booking-a-test@example.test'),
('a6090000-0000-4000-8000-000000000002','authenticated','authenticated','booking-b-test@example.test');
delete from public.profiles where id in (
  'a6090000-0000-4000-8000-000000000001','a6090000-0000-4000-8000-000000000002'
);
insert into public.profiles(id,role,is_active,onboarding_complete)
values
('a6090000-0000-4000-8000-000000000001','player',true,true),
('a6090000-0000-4000-8000-000000000002','player',true,true);
insert into public.network_organizations(id,slug,name,organization_type,is_claimed,is_verified,status)
values ('b6090000-0000-4000-8000-000000000001','rch-booking-trainer','Booking Trainer','training',true,true,'active');
insert into public.rch_sites(organization_id,slug,config,status)
values ('b6090000-0000-4000-8000-000000000001','rch-booking-trainer','{"siteType":"trainer"}','published');
insert into public.rch_site_services(id,organization_id,name,duration_minutes,price_cents)
values ('c6090000-0000-4000-8000-000000000001','b6090000-0000-4000-8000-000000000001','Private hoops session',60,0);
insert into public.rch_site_slots(id,organization_id,service_id,starts_at,ends_at)
values ('d6090000-0000-4000-8000-000000000001','b6090000-0000-4000-8000-000000000001',
 'c6090000-0000-4000-8000-000000000001',now()+interval '2 days',now()+interval '2 days 1 hour');

select throws_ok($$
insert into public.rch_site_slots(organization_id,service_id,starts_at,ends_at)
values ('b6090000-0000-4000-8000-000000000001','c6090000-0000-4000-8000-000000000001',
now()+interval '2 days 30 minutes',now()+interval '2 days 1 hour 30 minutes')
$$,'23P01',null,'Overlapping service slots are blocked at the database');
insert into public.rch_site_bookings(id,organization_id,service_id,slot_id,client_id,idempotency_key)
values ('e6090000-0000-4000-8000-000000000001','b6090000-0000-4000-8000-000000000001',
'c6090000-0000-4000-8000-000000000001','d6090000-0000-4000-8000-000000000001',
'a6090000-0000-4000-8000-000000000001','f6090000-0000-4000-8000-000000000001');

select throws_ok($$
insert into public.rch_site_bookings(organization_id,service_id,slot_id,client_id,idempotency_key)
values ('b6090000-0000-4000-8000-000000000001','c6090000-0000-4000-8000-000000000001',
'd6090000-0000-4000-8000-000000000001','a6090000-0000-4000-8000-000000000002',
'f6090000-0000-4000-8000-000000000002')
$$,'23505',null,'Concurrent-style duplicate reservations cannot confirm the same slot');

select throws_ok($$
update public.rch_site_slots set status='closed'
where id='d6090000-0000-4000-8000-000000000001'
$$,'23514',null,'Host cannot close an already reserved slot');

set role anon;
select is((select count(*) from public.rch_site_services),1::bigint,'Anonymous visitor sees published active services');
select is((select count(*) from public.rch_site_slots),1::bigint,'Anonymous visitor sees open availability, no client identity');
select throws_ok($$select * from public.rch_site_bookings$$,'42501',null,'Anonymous visitor cannot access private bookings');
select throws_ok($$insert into public.rch_site_bookings
(organization_id,service_id,slot_id,client_id,idempotency_key)
values ('b6090000-0000-4000-8000-000000000001','c6090000-0000-4000-8000-000000000001',
'd6090000-0000-4000-8000-000000000001','a6090000-0000-4000-8000-000000000001',
'f6090000-0000-4000-8000-000000000003')$$,'42501',null,'Anonymous visitor cannot forge a reservation');

set role authenticated;
select set_config('request.jwt.claim.sub','a6090000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.rch_site_bookings),1::bigint,'Booking customer reads own reservation');
select throws_ok($$update public.rch_site_bookings set status='cancelled'$$,'42501',null,'Customer cannot bypass server-side cancellation checks');
select set_config('request.jwt.claim.sub','a6090000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.rch_site_bookings),0::bigint,'Other RCH member cannot see reservation');
select throws_ok($$insert into public.rch_site_services(organization_id,name,duration_minutes)
values('b6090000-0000-4000-8000-000000000001','Unauthorized editing',60)$$,
'42501',null,'Member cannot bypass host service manager API');

set role postgres;
update public.rch_site_bookings set status='cancelled',cancelled_at=now()
where id='e6090000-0000-4000-8000-000000000001';
select lives_ok($$update public.rch_site_slots set status='closed' where id='d6090000-0000-4000-8000-000000000001'$$,
'Released appointment may be closed after cancellation');
set role anon;
select is((select count(*) from public.rch_site_slots),0::bigint,'Closed slots disappear from public availability');

select * from finish();
rollback;
