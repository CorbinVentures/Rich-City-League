-- Allow a social post to be addressed to a member's public profile wall.
alter table public.posts
  add column if not exists target_profile_id uuid references public.profiles(id) on delete cascade;

create index if not exists posts_target_profile_created_idx
  on public.posts (target_profile_id, created_at desc);

comment on column public.posts.target_profile_id is
  'Optional profile wall destination. Null means the general social feed.';
