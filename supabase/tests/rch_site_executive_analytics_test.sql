begin;
select no_plan();

set role anon;
select throws_ok(
  $$select public.get_rch_executive_analytics(30)$$,
  '42501',null,'anonymous visitors cannot read executive reports'
);
select throws_ok(
  $$select count(*) from public.rch_site_section_visits$$,
  '42501',null,'anonymous visitors cannot inspect raw visit telemetry'
);
select lives_ok(
  $$select public.record_rch_site_visit('8c120000-0000-4000-8000-000000000001'::uuid,'social')$$,
  'public section visit recording is non-blocking'
);
select lives_ok(
  $$select public.record_rch_site_visit('8c120000-0000-4000-8000-000000000001'::uuid,'social')$$,
  'duplicate section visit is safe'
);
select lives_ok(
  $$select public.record_rch_site_visit('8c120000-0000-4000-8000-000000000001'::uuid,'/account/security')$$,
  'unapproved path value is ignored'
);

set role authenticated;
select throws_ok(
  $$select public.get_rch_executive_analytics(30)$$,
  '42501',null,'authenticated but non-admin clients cannot inspect executive reports'
);
select throws_ok(
  $$select count(*) from public.rch_site_section_visits$$,
  '42501',null,'authenticated clients cannot inspect raw visit telemetry'
);
select throws_ok(
  $$select public.get_rch_executive_analytics(14)$$,
  '22023',null,'arbitrary reporting windows are rejected'
);
select lives_ok(
  $$select public.record_rch_site_visit('8c120000-0000-4000-8000-000000000002'::uuid,'runs')$$,
  'authenticated visitors may record coarse run section activity'
);

select * from finish();
rollback;
