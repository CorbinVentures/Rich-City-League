-- Give Royaltee control to its explicitly approved organization managers, not
-- every employee who happens to hold a cheerleading role elsewhere in RCL.
-- The current Royaltee coach is assigned to Royaltee using the organization
-- membership approval workflow; no global profile.role promotion is needed.
create or replace function public.can_manage_royaltee()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null and (
    coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.network_organization_members m
      join public.network_organizations o on o.id = m.organization_id
      where o.slug = 'royaltee-steppas'
        and m.profile_id = (select auth.uid())
        and m.status = 'active'
        and m.member_role in ('owner','manager')
    )
  );
$$;
revoke all on function public.can_manage_royaltee() from public;
grant execute on function public.can_manage_royaltee() to authenticated;
comment on function public.can_manage_royaltee()
is 'Royaltee-only approval: active owner/manager membership or RCH site administrator. A general cheerleading_coach role alone does not grant access.';
