begin;
select no_plan();
set role postgres;

insert into auth.users(id,aud,role,email)
values
('a6170000-0000-4000-8000-000000000001','authenticated','authenticated','sites-entitlements-one@example.test'),
('a6170000-0000-4000-8000-000000000002','authenticated','authenticated','sites-entitlements-two@example.test');
delete from public.profiles where id in
('a6170000-0000-4000-8000-000000000001','a6170000-0000-4000-8000-000000000002');
insert into public.profiles(id,role,is_active,onboarding_complete)
values
('a6170000-0000-4000-8000-000000000001','player',true,true),
('a6170000-0000-4000-8000-000000000002','player',true,true);

insert into public.network_organizations(id,slug,name,organization_type,status,is_verified,is_claimed)
values
('b6170000-0000-4000-8000-000000000001','sites-ent-one','Sites Entitlement One','training','active',true,true),
('b6170000-0000-4000-8000-000000000002','sites-ent-two','Sites Entitlement Two','training','active',true,true);
insert into public.rch_sites(organization_id,slug,config,status)
values
('b6170000-0000-4000-8000-000000000001','sites-ent-one','{"siteType":"trainer"}','published'),
('b6170000-0000-4000-8000-000000000002','sites-ent-two','{"siteType":"trainer"}','published');

select is((select enforce_booking from public.rch_site_booking_quota_rollout where id=true),
false,'Migration leaves strict quotas disabled by default');
update public.rch_site_booking_quota_rollout set enforce_booking=true where id=true;
select is((select enforce_booking from public.rch_site_booking_quota_rollout where id=true),
true,'Authorized operator may enable atomic booking quotas for pilot');

-- Keep local fixture small; real proposed tiers are 2/30/25 and 15/150/150.
update public.rch_site_plan_limits
set booking_services=1,upcoming_slots=1,confirmed_bookings_monthly=1
where tier='free';

insert into public.rch_site_services(id,organization_id,name,duration_minutes,price_cents)
values
('c6170000-0000-4000-8000-000000000001','b6170000-0000-4000-8000-000000000001','Personal training',60,0),
('c6170000-0000-4000-8000-000000000002','b6170000-0000-4000-8000-000000000002','Other trainer',60,0);

select is((select tier from public.rch_site_subscriptions
where organization_id='b6170000-0000-4000-8000-000000000001'),
'free','New eligible organization receives a free site entitlement');
select is((select count(*) from public.rch_site_services where status='active'),
2::bigint,'Quota counts active services separately across organizations');

select throws_ok($$
insert into public.rch_site_services(organization_id,name,duration_minutes)
values('b6170000-0000-4000-8000-000000000001','Extra active service',60)
$$,'P0001',null,'A second service exceeds first organization quota');

insert into public.rch_site_services(id,organization_id,name,duration_minutes,status)
values('c6170000-0000-4000-8000-000000000003',
'b6170000-0000-4000-8000-000000000001','Inactive offering',60,'inactive');

select throws_ok($$
update public.rch_site_services set status='active'
where id='c6170000-0000-4000-8000-000000000003'
$$,'P0001',null,'Inactive service cannot be reactivated over the cap');

insert into public.rch_site_slots(id,organization_id,service_id,starts_at,ends_at)
values('d6170000-0000-4000-8000-000000000001',
'b6170000-0000-4000-8000-000000000001',
'c6170000-0000-4000-8000-000000000001',
now()+interval '2 days',now()+interval '2 days 1 hour');

select throws_ok($$
insert into public.rch_site_slots(organization_id,service_id,starts_at,ends_at)
values('b6170000-0000-4000-8000-000000000001',
'c6170000-0000-4000-8000-000000000001',
now()+interval '3 days',now()+interval '3 days 1 hour')
$$,'P0001',null,'New future open slot is blocked at quota');

update public.rch_site_plan_limits set upcoming_slots=2 where tier='free';

insert into public.rch_site_slots(id,organization_id,service_id,starts_at,ends_at)
values('d6170000-0000-4000-8000-000000000002',
'b6170000-0000-4000-8000-000000000001',
'c6170000-0000-4000-8000-000000000001',
now()+interval '3 days',now()+interval '3 days 1 hour');

insert into public.rch_site_bookings(id,organization_id,service_id,slot_id,client_id,idempotency_key)
values('e6170000-0000-4000-8000-000000000001',
'b6170000-0000-4000-8000-000000000001',
'c6170000-0000-4000-8000-000000000001',
'd6170000-0000-4000-8000-000000000001',
'a6170000-0000-4000-8000-000000000001',
'f6170000-0000-4000-8000-000000000001');

select throws_ok($$
insert into public.rch_site_bookings(organization_id,service_id,slot_id,client_id,idempotency_key)
values('b6170000-0000-4000-8000-000000000001',
'c6170000-0000-4000-8000-000000000001',
'd6170000-0000-4000-8000-000000000002',
'a6170000-0000-4000-8000-000000000002',
'f6170000-0000-4000-8000-000000000002')
$$,'P0001',null,'Monthly booking quota is enforced for distinct available slots');

update public.rch_site_bookings
set status='cancelled',cancelled_at=now()
where id='e6170000-0000-4000-8000-000000000001';

select throws_ok($$
insert into public.rch_site_bookings(organization_id,service_id,slot_id,client_id,idempotency_key)
values('b6170000-0000-4000-8000-000000000001',
'c6170000-0000-4000-8000-000000000001',
'd6170000-0000-4000-8000-000000000002',
'a6170000-0000-4000-8000-000000000002',
'f6170000-0000-4000-8000-000000000003')
$$,'P0001',null,'Cancelling a booking does not reset monthly usage');

select throws_ok($$
update public.rch_site_subscriptions set tier='professional',billing_status='active'
where organization_id='b6170000-0000-4000-8000-000000000001'
$$,'23514',null,'Paid entitlement requires a provider subscription reference');

update public.rch_site_subscriptions
set tier='amateur',billing_status='active',provider_subscription_ref='test-provider-subscription'
where organization_id='b6170000-0000-4000-8000-000000000001';

select lives_ok($$
update public.rch_site_services set status='active'
where id='c6170000-0000-4000-8000-000000000003'
$$,'A valid active paid subscription can expand service allowance');

update public.rch_site_subscriptions set billing_status='past_due'
where organization_id='b6170000-0000-4000-8000-000000000001';

select throws_ok($$
insert into public.rch_site_services(organization_id,name,duration_minutes)
values('b6170000-0000-4000-8000-000000000001','Suspended paid plan',60)
$$,'23514',null,'Past-due paid subscription cannot create bookable services');

select ok(not has_table_privilege('anon','public.rch_site_subscriptions','SELECT'),
'Anonymous clients have no direct subscription privileges');
select ok(not has_table_privilege('authenticated','public.rch_site_subscriptions','UPDATE'),
'Signed-in clients cannot alter subscription entitlements');
select ok(not has_table_privilege('authenticated','public.rch_site_plan_limits','SELECT'),
'Server-owned plan limits are hidden from raw Data API');

set role anon;
select throws_ok($$select * from public.rch_site_subscriptions$$,'42501',null,
'Anonymous visitors cannot inspect billing subscriptions');
select throws_ok($$select * from public.rch_site_plan_limits$$,'42501',null,
'Anonymous visitors cannot inspect server plan limits');

set role authenticated;
select set_config('request.jwt.claim.sub','a6170000-0000-4000-8000-000000000001',true);
select throws_ok($$update public.rch_site_subscriptions set tier='professional'$$,
'42501',null,'Ordinary site users cannot upgrade themselves');
select throws_ok($$insert into public.rch_site_subscriptions(organization_id)
values('b6170000-0000-4000-8000-000000000002')$$,'42501',null,
'Ordinary site users cannot mint an entitlement');
select throws_ok($$select * from public.rch_site_plan_limits$$,'42501',null,
'Ordinary site users cannot read internal quota definition');

select * from finish();
rollback;
