begin;
select no_plan();
set role postgres;

insert into auth.users(id,aud,role,email) values
('a6190000-0000-4000-8000-000000000001','authenticated','authenticated','starter-owner@example.test'),
('a6190000-0000-4000-8000-000000000002','authenticated','authenticated','starter-stranger@example.test');
delete from public.profiles where id in
 ('a6190000-0000-4000-8000-000000000001','a6190000-0000-4000-8000-000000000002');
insert into public.profiles(id,role,is_active,onboarding_complete)
values
('a6190000-0000-4000-8000-000000000001','player',true,true),
('a6190000-0000-4000-8000-000000000002','player',true,true);

insert into public.rch_site_starter_drafts
 (profile_id,organization_name,desired_slug,preferred_tier,config)
values
('a6190000-0000-4000-8000-000000000001',
 'Future Richmond Trainer','future-richmond-trainer','free',
 '{"siteType":"trainer","theme":"courtside","tagline":"Grow your game","about":"Adult training"}');

select ok(has_table_privilege('authenticated','public.rch_site_starter_drafts','SELECT'),
'Authenticated owner has RLS-protected read permission');
select ok(not has_table_privilege('authenticated','public.rch_site_starter_drafts','INSERT'),
'No browser user can create draft with another profile ID');
select ok(not has_table_privilege('authenticated','public.rch_site_starter_drafts','UPDATE'),
'No browser user can overwrite another site design');
select ok(not has_table_privilege('anon','public.rch_site_starter_drafts','SELECT'),
'Anonymous users cannot read starter records');
select throws_ok($$
 insert into public.rch_site_starter_drafts(profile_id,organization_name,desired_slug,preferred_tier,config)
 values('a6190000-0000-4000-8000-000000000002','Bad slug','../bad','free','{}')
$$,'23514',null,'Database rejects invalid starter slugs');
select throws_ok($$
 insert into public.rch_site_starter_drafts(profile_id,organization_name,desired_slug,preferred_tier,config)
 values('a6190000-0000-4000-8000-000000000002','Bad tier','valid-slug','flagship','{}')
$$,'23514',null,'Network advertising/flagship tiers cannot create site entitlements');

set role anon;
select throws_ok($$select * from public.rch_site_starter_drafts$$,
'42501',null,'Anonymous site visitors cannot read private drafts');

set role authenticated;
select set_config('request.jwt.claim.sub','a6190000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.rch_site_starter_drafts),0::bigint,
'Another signed-in profile cannot see the owner's website');
select throws_ok($$update public.rch_site_starter_drafts
  set organization_name='Impersonated'$$,
'42501',null,'Other users cannot change a private starter');
select set_config('request.jwt.claim.sub','a6190000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.rch_site_starter_drafts),1::bigint,
'The draft owner can resume the private website');

select * from finish();
rollback;
