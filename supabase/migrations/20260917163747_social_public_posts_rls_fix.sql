drop policy if exists "public posts" on public.posts;
create policy "public published posts" on public.posts for select to public using (status = 'published');
create policy "staff and admins view posts" on public.posts for select to authenticated using (public.is_staff_or_admin());
