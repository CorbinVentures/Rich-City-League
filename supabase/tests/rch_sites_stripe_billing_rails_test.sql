begin;
select no_plan();
set role postgres;

insert into auth.users(id,aud,role,email)
values ('a6220000-0000-4000-8000-000000000001','authenticated','authenticated','sites-billing-owner@example.test');
delete from public.profiles where id='a6220000-0000-4000-8000-000000000001';
insert into public.profiles(id,role,is_active,onboarding_complete)
values ('a6220000-0000-4000-8000-000000000001','player',true,true);
insert into public.network_organizations(id,slug,name,organization_type,status,is_verified,is_claimed)
values ('b6220000-0000-4000-8000-000000000001','rch-sites-billing-one','RCH Sites Billing One','training','active',true,true);

select ok(has_table_privilege('service_role','public.rch_site_billing_intents','INSERT'),
  'Trusted website billing server may create a private checkout lineage');
select ok(has_table_privilege('service_role','public.rch_site_billing_events','UPDATE'),
  'Trusted website billing server may reconcile signed webhook events');
select ok(not has_table_privilege('anon','public.rch_site_billing_intents','SELECT'),
  'Public visitors cannot view private website checkout lineage');
select ok(not has_table_privilege('authenticated','public.rch_site_billing_intents','INSERT'),
  'Regular signed-in users cannot grant their own checkout identity');
select ok(not has_table_privilege('authenticated','public.rch_site_billing_events','UPDATE'),
  'Regular signed-in users cannot forge processed Stripe events');

insert into public.rch_site_billing_intents
  (id,organization_id,initiated_by,tier,billing_interval,stripe_price_id,status)
values
  ('c6220000-0000-4000-8000-000000000001',
   'b6220000-0000-4000-8000-000000000001',
   'a6220000-0000-4000-8000-000000000001',
   'amateur','monthly','price_testRchSitesOne','pending');
select throws_ok($$
  insert into public.rch_site_billing_intents
    (organization_id,initiated_by,tier,billing_interval,stripe_price_id)
  values('b6220000-0000-4000-8000-000000000001',
         'a6220000-0000-4000-8000-000000000001',
         'professional','annual','price_testRchSitesTwo')
$$,'23505',null,'No second pending Checkout for a single organization');
update public.rch_site_billing_intents set status='expired'
where id='c6220000-0000-4000-8000-000000000001';
insert into public.rch_site_billing_intents
    (organization_id,initiated_by,tier,billing_interval,stripe_price_id,status)
values('b6220000-0000-4000-8000-000000000001',
       'a6220000-0000-4000-8000-000000000001',
       'professional','annual','price_testRchSitesTwo','checkout_ready');
select is((select count(*) from public.rch_site_billing_intents
where organization_id='b6220000-0000-4000-8000-000000000001'),2::bigint,
'Expired checkout may be replaced by a new independent attempt');
select throws_ok($$
  insert into public.rch_site_billing_intents
    (organization_id,initiated_by,tier,billing_interval,stripe_price_id,status)
  values('b6220000-0000-4000-8000-000000000001',
         'a6220000-0000-4000-8000-000000000001',
         'free','monthly','price_fake','completed')
$$,'23514',null,'Free websites cannot be purchased as paid Stripe memberships');
select throws_ok($$
  insert into public.rch_site_billing_intents
    (organization_id,initiated_by,tier,billing_interval,stripe_price_id,status)
  values('b6220000-0000-4000-8000-000000000001',
         'a6220000-0000-4000-8000-000000000001',
         'amateur','weekly','price_fake','completed')
$$,'23514',null,'Unsupported recurring periods are rejected by database');

insert into public.rch_site_billing_events(event_id,event_type,processing_status)
values('evt_testRchSitesOne','invoice.paid','processing');
select throws_ok($$
  insert into public.rch_site_billing_events(event_id,event_type,processing_status)
  values('evt_testRchSitesOne','invoice.paid','processed')
$$,'23505',null,'Duplicate Stripe event identifiers cannot insert twice');
select is((select tier from public.rch_site_subscriptions
where organization_id='b6220000-0000-4000-8000-000000000001'),'free',
'Creating checkout intents or recording events does not grant a paid entitlement');
select is((select enforce_booking from public.rch_site_booking_quota_rollout where id=true),
false,'Preparing billing does not activate the strict booking-quota rollout');

set role anon;
select throws_ok($$ select * from public.rch_site_billing_intents $$,
'42501',null,'Anonymous visitors cannot inspect checkout intent records');
set role authenticated;
select throws_ok($$ select * from public.rch_site_billing_events $$,
'42501',null,'Regular users cannot inspect private Stripe events');
select throws_ok($$
  update public.rch_site_subscriptions set tier='professional'
  where organization_id='b6220000-0000-4000-8000-000000000001'
$$,'42501',null,'Signed-in users cannot grant themselves website subscription access');

select * from finish();
rollback;
