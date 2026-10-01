begin;

drop index if exists public.run_highlight_claims_one_per_member_run_idx;

drop policy if exists "public view current and recent runs" on public.runs;
create policy "public view current and recent runs" on public.runs
for select
using (
  (
    status in ('open','full','completed')
    and starts_at >= now() - interval '7 days'
  )
  or host_id = (select auth.uid())
  or exists (
    select 1 from public.run_players rp
    where rp.run_id = runs.id and rp.profile_id = (select auth.uid())
  )
  or public.is_staff_or_admin()
);

revoke execute on function public.can_manage_run(uuid) from public, anon;
grant execute on function public.can_manage_run(uuid) to authenticated;

commit;
