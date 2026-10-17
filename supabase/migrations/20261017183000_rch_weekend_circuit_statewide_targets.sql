begin;
-- Every RCH Virginia World city (including secondary markets) must be visible
-- in the ongoing Double REP city readiness program; never treat an unverified
-- mapped court as an approved venue or advertise an unstaffed reservation.
create table public.rch_weekend_circuit_city_targets (
 city_id text primary key check(city_id ~ '^[a-z0-9-]+$'),
 city_name text not null unique,
 is_major boolean not null default false,
 enrolled_at timestamptz not null default now()
);
alter table public.rch_weekend_circuit_city_targets enable row level security;
revoke all on public.rch_weekend_circuit_city_targets from public,anon,authenticated;
grant select on public.rch_weekend_circuit_city_targets to anon,authenticated;
create policy rch_weekend_city_targets_read
 on public.rch_weekend_circuit_city_targets for select to anon,authenticated using(true);

insert into public.rch_weekend_circuit_city_targets(city_id,city_name,is_major) values
 ('richmond','Richmond',true),
 ('alexandria','Alexandria',true),
 ('arlington','Arlington',false),
 ('fairfax','Fairfax',true),
 ('manassas','Manassas',false),
 ('leesburg','Leesburg',false),
 ('fredericksburg','Fredericksburg',true),
 ('winchester','Winchester',true),
 ('harrisonburg','Harrisonburg',false),
 ('staunton','Staunton',false),
 ('charlottesville','Charlottesville',true),
 ('roanoke','Roanoke',true),
 ('blacksburg','Blacksburg',false),
 ('lynchburg','Lynchburg',true),
 ('danville','Danville',true),
 ('martinsville','Martinsville',false),
 ('wytheville','Wytheville',false),
 ('bristol','Bristol',true),
 ('abingdon','Abingdon',false),
 ('petersburg','Petersburg',true),
 ('chesterfield','Chesterfield',false),
 ('williamsburg','Williamsburg',false),
 ('newport-news','Newport News',true),
 ('hampton','Hampton',false),
 ('norfolk','Norfolk',true),
 ('portsmouth','Portsmouth',false),
 ('chesapeake','Chesapeake',false),
 ('virginia-beach','Virginia Beach',true),
 ('suffolk','Suffolk',false),
 ('emporia','Emporia',false),
 ('north-chesterfield','North Chesterfield',false);

-- Read-only live coverage and deployment readiness. A locality match means
-- the mapped park is in that locality, not merely in the surrounding county.
-- Multiple GIS features at the same named park are counted as ONE site.
create view public.rch_weekend_circuit_coverage
with (security_invoker=true) as
select t.city_id,t.city_name,t.is_major,
 coalesce(d.verified_sites,0)::integer as verified_eligible_park_sites,
 coalesce(d.mapped_unverified,0)::integer as mapped_unverified_sites,
 coalesce(c.assigned_total,0)::integer as assigned_slots,
 coalesce(c.qualified_total,0)::integer as qualified_slots,
 coalesce(e.upcoming,0)::integer as upcoming_featured_runs,
 case
  when coalesce(c.qualified_total,0)=4 and coalesce(e.upcoming,0)>0 then 'scheduled'
  when coalesce(c.qualified_total,0)=4 then 'ready_to_generate'
  when coalesce(d.verified_sites,0)>=4 then 'needs_court_assignment'
  else 'needs_venue_verification'
 end as circuit_status
from public.rch_weekend_circuit_city_targets t
left join lateral (
 select
  count(distinct lower(trim(l.name))) filter(
   where l.verification_status in ('official','provider')
    and l.access_type='public' and l.venue_type='outdoor'
    and l.name ~* '(park|playground)'
  ) as verified_sites,
  count(distinct l.slug) filter(where l.verification_status='community') as mapped_unverified
 from public.basketball_locations l
 where l.is_active and lower(trim(l.locality))=lower(trim(t.city_name))
) d on true
left join lateral (
 select count(*) as assigned_total,
  count(distinct lower(trim(l.name))) filter(where cc.active and l.is_active
    and lower(trim(l.locality))=lower(trim(t.city_name))
    and l.access_type='public' and l.venue_type='outdoor'
    and l.verification_status in ('official','provider')
    and l.name ~* '(park|playground)') as qualified_total
 from public.rch_weekend_circuit_courts cc
 join public.basketball_locations l on l.slug=cc.court_slug
 where cc.city=t.city_name
) c on true
left join lateral (
 select count(*) as upcoming
 from public.rch_weekend_circuit_events ce
 join public.runs r on r.id=ce.run_id
 where ce.city=t.city_name and ce.starts_at>now()
 and r.status in ('open','full') and ce.bonus_enabled
) e on true;
revoke all on public.rch_weekend_circuit_coverage from public,anon,authenticated;
grant select on public.rch_weekend_circuit_coverage to anon,authenticated;
comment on view public.rch_weekend_circuit_coverage is
'Every city target tracked; only four verified public outdoor park sites plus four active assignments enable automated featured Runs. Unverified GIS/OSM maps never count as venue permission.';

commit;
