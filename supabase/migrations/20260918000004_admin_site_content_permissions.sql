-- Give ADMIN a master content/media permission boundary across the public site.
-- Staff can continue to manage ordinary league content; ADMIN can manage all public-facing media assets.

drop policy if exists "admin manage media records" on public.media;
create policy "admin manage media records"
  on public.media
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin manage storage images" on storage.objects;
create policy "admin manage storage images"
  on storage.objects
  for all
  to authenticated
  using (public.is_admin() and bucket_id in ('media', 'avatars'))
  with check (public.is_admin() and bucket_id in ('media', 'avatars'));

drop policy if exists "admin manage teams content" on public.teams;
create policy "admin manage teams content"
  on public.teams
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin manage players content" on public.players;
create policy "admin manage players content"
  on public.players
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin manage news content" on public.news;
create policy "admin manage news content"
  on public.news
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin manage site settings" on public.site_settings;
create policy "admin manage site settings"
  on public.site_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());
