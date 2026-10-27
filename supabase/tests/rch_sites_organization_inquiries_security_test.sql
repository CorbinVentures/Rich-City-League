begin;
select no_plan();
set role postgres;

insert into auth.users(id,aud,role,email)
values
('a6110000-0000-4000-8000-000000000001','authenticated','authenticated','org-hub-one@example.test'),
('a6110000-0000-4000-8000-000000000002','authenticated','authenticated','org-hub-two@example.test');
delete from public.profiles where id in (
  'a6110000-0000-4000-8000-000000000001','a6110000-0000-4000-8000-000000000002'
);
insert into public.profiles(id,role,is_active,onboarding_complete)
values
('a6110000-0000-4000-8000-000000000001','player',true,true),
('a6110000-0000-4000-8000-000000000002','player',true,true);

insert into public.network_organizations(id,slug,name,organization_type,is_claimed,is_verified,status)
values
('b6110000-0000-4000-8000-000000000001','hub-owner-one','Hub One','training',true,true,'active'),
('b6110000-0000-4000-8000-000000000002','hub-owner-two','Hub Two','program',true,true,'active');
insert into public.rch_sites(organization_id,slug,config,status)
values
('b6110000-0000-4000-8000-000000000001','hub-owner-one','{"siteType":"trainer"}','published'),
('b6110000-0000-4000-8000-000000000002','hub-owner-two','{"siteType":"aau"}','published');
insert into public.rch_site_inquiries(organization_id,requester_id,contact_email,purpose,contact_consent)
values
('b6110000-0000-4000-8000-000000000001','a6110000-0000-4000-8000-000000000001','org-hub-one@example.test','training',true),
('b6110000-0000-4000-8000-000000000002','a6110000-0000-4000-8000-000000000002','org-hub-two@example.test','program',true);

select throws_ok($$
insert into public.rch_site_inquiries(organization_id,requester_id,contact_email,purpose,contact_consent)
values('b6110000-0000-4000-8000-000000000001','a6110000-0000-4000-8000-000000000001','org-hub-one@example.test','event',true)
$$,'23505',null,'One requester cannot submit repeated inquiries to an organization the same day');

select throws_ok($$
insert into public.rch_site_inquiries(organization_id,requester_id,contact_email,purpose,contact_consent)
values('b6110000-0000-4000-8000-000000000001','a6110000-0000-4000-8000-000000000002','org-hub-two@example.test','program',false)
$$,'23514',null,'Inquiries must include explicit contact consent');

select throws_ok($$
update public.rch_site_inquiries set status='contacted' where
organization_id='b6110000-0000-4000-8000-000000000001'
$$,'23514',null,'Status cannot change without reviewer and timestamp');

set role anon;
select throws_ok($$select * from public.rch_site_inquiries$$,'42501',null,
'Anonymous visitors cannot read a private inquiry or its email');
select throws_ok($$insert into public.rch_site_inquiries(organization_id,requester_id,contact_email,purpose,contact_consent)
values('b6110000-0000-4000-8000-000000000001','a6110000-0000-4000-8000-000000000001','org-hub-one@example.test','training',true)
$$,'42501',null,'Anonymous visitors cannot forge inquiries via direct Data API');

set role authenticated;
select set_config('request.jwt.claim.sub','a6110000-0000-4000-8000-000000000001',true);
select throws_ok($$select * from public.rch_site_inquiries$$,'42501',null,
'Even a signed-in member cannot inspect other organizations or any private contact emails directly');
select throws_ok($$update public.rch_site_inquiries set status='closed'$$,'42501',null,
'Signed-in members cannot bypass owner review');
select throws_ok($$delete from public.rch_site_inquiries$$,'42501',null,
'Signed-in members cannot delete contacts');

set role postgres;
update public.rch_site_inquiries set status='contacted',reviewed_at=now(),
reviewed_by='a6110000-0000-4000-8000-000000000001'
where organization_id='b6110000-0000-4000-8000-000000000001';
select is((select status from public.rch_site_inquiries
  where organization_id='b6110000-0000-4000-8000-000000000001'),
 'contacted','Authorized server-side review records a contacted state');
select is((select status from public.rch_site_inquiries
  where organization_id='b6110000-0000-4000-8000-000000000002'),
 'new','Updating one organization cannot change another inbox');

select * from finish();
rollback;
