-- Expand administrator control without granting staff the ability to escalate roles.
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles"
  on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin manage comments" on public.comments;
create policy "admin manage comments"
  on public.comments
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin manage reports" on public.reports;
create policy "admin manage reports"
  on public.reports
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin delete media" on public.media;
create policy "admin delete media"
  on public.media
  for delete
  using (public.is_admin());
