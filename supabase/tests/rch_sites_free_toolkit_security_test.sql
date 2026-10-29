begin;
select no_plan();
set role postgres;
select has_table('public','rch_site_toolkit',
  'Free toolkit storage is present');
select has_table('public','rch_site_toolkit_registrations',
  'Adult registration storage is present');
select is((select relrowsecurity from pg_class where oid='public.rch_site_toolkit'::regclass),
  true,'RLS is enabled for private toolkit documents');
select is((select relrowsecurity from pg_class where oid='public.rch_site_toolkit_registrations'::regclass),
  true,'RLS is enabled for registration contacts');

set role anon;
select throws_ok('select * from public.rch_site_toolkit','42501',null,
  'Anonymous visitors cannot enumerate private toolkit documents');
select throws_ok('select * from public.rch_site_toolkit_registrations','42501',null,
  'Anonymous visitors cannot read registration contact information');
select throws_ok($$insert into public.rch_site_toolkit(organization_id)
  values('00000000-0000-4000-8000-000000000001')$$,'42501',null,
  'Anonymous visitors cannot insert toolkit documents');

set role authenticated;
select throws_ok('select * from public.rch_site_toolkit','42501',null,
  'Authenticated users cannot bypass organization-manager API');
select throws_ok('select * from public.rch_site_toolkit_registrations','42501',null,
  'Authenticated users cannot read private registration contacts directly');
select throws_ok($$insert into public.rch_site_toolkit_registrations(organization_id,name,email)
  values('00000000-0000-4000-8000-000000000001','Not Authorized','bad@example.test')$$,
  '42501',null,'Authenticated users cannot bypass server registration validation');

set role postgres;
select * from finish();
rollback;
