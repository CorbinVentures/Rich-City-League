begin;
select no_plan();
set role postgres;
insert into auth.users(id,aud,role,email)
values
('a6100000-0000-4000-8000-000000000001','authenticated','authenticated','paypal-test-one@example.test'),
('a6100000-0000-4000-8000-000000000002','authenticated','authenticated','paypal-test-two@example.test');
delete from public.profiles where id in
 ('a6100000-0000-4000-8000-000000000001','a6100000-0000-4000-8000-000000000002');
insert into public.profiles(id,role,is_active,onboarding_complete)
values
('a6100000-0000-4000-8000-000000000001','player',true,true),
('a6100000-0000-4000-8000-000000000002','player',true,true);
insert into public.network_organizations(id,slug,name,organization_type,is_claimed,is_verified,status)
values
('b6100000-0000-4000-8000-000000000001','paypal-rls-one','PayPal Test One','training',true,true,'active'),
('b6100000-0000-4000-8000-000000000002','paypal-rls-two','PayPal Test Two','training',true,true,'active');
insert into public.rch_sites(organization_id,slug,config,status)
values
('b6100000-0000-4000-8000-000000000001','paypal-rls-one','{"siteType":"trainer"}','published'),
('b6100000-0000-4000-8000-000000000002','paypal-rls-two','{"siteType":"trainer"}','unpublished');
insert into public.rch_site_paypal_offerings(organization_id,title,amount_cents,payment_url)
values
('b6100000-0000-4000-8000-000000000001','Private lesson',4000,'https://www.paypal.com/ncp/payment/F3YMU2ZGT49XX'),
('b6100000-0000-4000-8000-000000000002','Private practice',4500,'https://www.paypal.com/ncp/payment/PLB-X7MNK9P2QR8T');

set role anon;
select is((select count(*) from public.rch_site_paypal_offerings),1::bigint,'Only published organization payment links are public');
select throws_ok($$insert into public.rch_site_paypal_offerings(organization_id,title,amount_cents,payment_url)
values('b6100000-0000-4000-8000-000000000001','Fraud link',2000,
'https://www.paypal.com/ncp/payment/F3YMU2ZGT49XX')$$,'42501',null,'Anonymous visitors cannot add payment links');
set role authenticated;
select set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.rch_site_paypal_offerings),1::bigint,'Signed-in customer only sees published links');
select throws_ok($$update public.rch_site_paypal_offerings set amount_cents=1$$,
'42501',null,'Signed-in customers cannot modify merchant prices');
select throws_ok($$delete from public.rch_site_paypal_offerings$$,
'42501',null,'Signed-in customers cannot remove merchant payment links');
set role postgres;
update public.rch_site_paypal_offerings set active=false
where organization_id='b6100000-0000-4000-8000-000000000001';
set role anon;
select is((select count(*) from public.rch_site_paypal_offerings),0::bigint,'Inactive links disappear immediately');
select * from finish();
rollback;
