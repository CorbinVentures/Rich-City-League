begin;

-- Native RCL Network reposts are distribution events, not new authored posts.
-- They intentionally do not participate in the REP reward trigger, because
-- reposts live outside public.posts and only point back to the original post.
create table if not exists public.post_reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_reposts_profile_post_unique unique (profile_id, post_id)
);

create index if not exists post_reposts_post_created_idx
  on public.post_reposts(post_id, created_at desc);
create index if not exists post_reposts_profile_created_idx
  on public.post_reposts(profile_id, created_at desc);

alter table public.post_reposts enable row level security;

drop policy if exists "public visible reposts" on public.post_reposts;
create policy "public visible reposts"
  on public.post_reposts
  for select
  to public
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and p.status = 'published'
    )
    and exists (
      select 1
      from public.profiles pr
      where pr.id = profile_id
        and pr.is_active
        and (
          pr.profile_visibility = 'public'
          or pr.id = auth.uid()
          or public.is_staff_or_admin()
        )
    )
  );

drop policy if exists "members repost published posts" on public.post_reposts;
create policy "members repost published posts"
  on public.post_reposts
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and p.status = 'published'
    )
  );

drop policy if exists "members remove own reposts" on public.post_reposts;
create policy "members remove own reposts"
  on public.post_reposts
  for delete
  to authenticated
  using (profile_id = auth.uid() or public.is_staff_or_admin());

grant select on public.post_reposts to anon, authenticated;
grant insert, delete on public.post_reposts to authenticated;

commit;
