begin;

-- RCH Verified is evaluated at read-time. Expired/suspended organizer approval,
-- expired court review and removed game-day readiness all hide the public badge
-- even before an administrator runs periodic reconciliation.
create or replace function public.rch_is_verified_run(p_run uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.rch_run_verifications v
    join public.runs r on r.id=v.run_id
    join public.rch_verified_run_hosts h on h.profile_id=r.host_id
    where v.run_id=p_run
      and v.verification_status='verified'
      and h.verification_status='approved'
      and h.expires_at>now()
      and r.status in ('open','full','completed')
      and r.location_slug is not null
      and exists(select 1 from public.basketball_locations l
        where l.slug=r.location_slug and l.is_active
          and (l.verification_status in ('official','provider')
            or exists(select 1 from public.rch_court_site_reviews s
              where s.court_slug=l.slug and s.approved and s.expires_at>now())))
      and (select count(*) from public.rch_run_operations op
         where op.run_id=r.id and op.completed
           and op.task_code in ('venue_confirmed','rules_briefed','safety_reviewed'))=3
      and (r.run_type<>'competitive' or exists(
        select 1 from public.rch_run_operators o where o.run_id=r.id and o.role='official'))
  )
$$;

drop policy if exists rch_verified_run_public on public.rch_run_verifications;
create policy rch_verified_run_public on public.rch_run_verifications
for select to anon,authenticated
using (
  public.rch_is_verified_run(run_id)
  or coalesce(public.is_staff_or_admin(),false)
);

revoke all on function public.rch_is_verified_run(uuid) from public,anon,authenticated;
grant execute on function public.rch_is_verified_run(uuid) to anon,authenticated;

comment on function public.rch_is_verified_run(uuid) is
  'Public boolean-only real-time accreditation check. Never reveals private organizer application details.';
commit;