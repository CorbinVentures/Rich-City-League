begin;
select no_plan();
set role postgres;

-- Two independent, synthetic claimed and verified organizations. Rolled back.
insert into auth.users(id,aud,role,email)
values
('a6070000-0000-4000-8000-000000000001','authenticated','authenticated','site-a-test@example.test'),
('a6070000-0000-4000-8000-000000000002','authenticated','authenticated','site-b-test@example.test');
delete from public.profiles where id in (
 'a6070000-0000-4000-8000-000000000001','a6070000-0000-4000-8000-000000000002'
);
insert into public.profiles(id,role,is_active,onboarding_complete)
values
('a6070000-0000-4000-8000-000000000001','player',true,true),
('a6070000-0000-4000-8000-000000000002','player',true,true);
insert into public.network_organizations(id,slug,name,organization_type,is_claimed,is_verified,status)
values
('b6070000-0000-4000-8000-000000000001','sites-rls-a','Site A','training',true,true,'active'),
('b6070000-0000-4000-8000-000000000002','sites-rls-b','Site B','program',true,true,'active');
insert into public.network_organization_members(organization_id,profile_id,member_role,status)
values
('b6070000-0000-4000-8000-000000000001','a6070000-0000-4000-8000-000000000001','owner','active'),
('b6070000-0000-4000-8000-000000000002','a6070000-0000-4000-8000-000000000002','owner','active');
insert into public.rch_site_drafts(organization_id,slug,config,updated_by)
values
('b6070000-0000-4000-8000-000000000001','sites-rls-a','{"tagline":"Draft A"}','a6070000-0000-4000-8000-000000000001'),
('b6070000-0000-4000-8000-000000000002','sites-rls-b','{"tagline":"Draft B"}','a6070000-0000-4000-8000-000000000002');
insert into public.rch_sites(organization_id,slug,config,status)
values
('b6070000-0000-4000-8000-000000000001','sites-rls-a','{"tagline":"Published A"}','published'),
('b6070000-0000-4000-8000-000000000002','sites-rls-b','{"tagline":"Hidden B"}','unpublished');

set role anon;
select throws_ok(
  $$select * from public.rch_site_drafts$$,'42501',null,
  'Anonymous visitors cannot read private site drafts');
select is((select count(*) from public.rch_sites),1::bigint,
  'Public reads ONLY published snapshots');
select throws_ok(
  $$insert into public.rch_sites(organization_id,slug,config)
    values('b6070000-0000-4000-8000-000000000001','sites-forgery','{}')$$,
  '42501',null,'Anonymous visitors cannot publish sites');

set role authenticated;
select set_config('request.jwt.claim.sub','a6070000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.rch_site_drafts),1::bigint,
  'Site A owner sees only own private draft');
select is((select slug from public.rch_site_drafts limit 1),'sites-rls-a',
  'Tenant B draft does not leak to tenant A');
select throws_ok(
  $$update public.rch_site_drafts set config='{"attack":true}' where true$$,
  '42501',null,'Tenant member cannot bypass the validated API with direct draft update');
select throws_ok(
  $$update public.rch_sites set status='published' where slug='sites-rls-b'$$,
  '42501',null,'Tenant member cannot bypass publish approval or mutate another site');
select is((select count(*) from public.rch_sites),1::bigint,
  'No unpublished sites leak to signed-in visitors');

select set_config('request.jwt.claim.sub','a6070000-0000-4000-8000-000000000002',true);
select is((select slug from public.rch_site_drafts limit 1),'sites-rls-b',
  'Tenant B sees only its own draft');

set role postgres;
update public.network_organization_members set status='inactive'
 where profile_id='a6070000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','a6070000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.rch_site_drafts),0::bigint,
  'Revoked organization membership loses private draft access immediately');

select * from finish();
rollback;
