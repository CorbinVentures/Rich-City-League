begin;
create or replace function public.is_coach_or_staff()
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_staff_or_admin() or exists(select 1 from public.team_coaches tc where tc.profile_id=auth.uid());
$$;
drop policy if exists "coaches read own scouting" on public.scouting_reports;
drop policy if exists "coaches create scouting" on public.scouting_reports;
drop policy if exists "coaches manage own scouting" on public.scouting_reports;
drop policy if exists "coaches delete own scouting" on public.scouting_reports;
create policy "coaches read own scouting" on public.scouting_reports for select to authenticated using (public.is_coach_or_staff() and (author_profile_id=auth.uid() or public.is_staff_or_admin()));
create policy "coaches create scouting" on public.scouting_reports for insert to authenticated with check (public.is_coach_or_staff() and (author_profile_id=auth.uid() or public.is_staff_or_admin()));
create policy "coaches manage own scouting" on public.scouting_reports for update to authenticated using (public.is_coach_or_staff() and (author_profile_id=auth.uid() or public.is_staff_or_admin())) with check (public.is_coach_or_staff() and (author_profile_id=auth.uid() or public.is_staff_or_admin()));
create policy "coaches delete own scouting" on public.scouting_reports for delete to authenticated using (public.is_coach_or_staff() and (author_profile_id=auth.uid() or public.is_staff_or_admin()));
grant execute on function public.is_coach_or_staff() to authenticated;
commit;
