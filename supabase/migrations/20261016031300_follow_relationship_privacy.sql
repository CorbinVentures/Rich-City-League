begin;

-- Member relationships must respect the same visibility and block rules as
-- member profiles. Public follow graphs must not reveal private identities.
drop policy if exists "public follows" on public.follows;
create policy "public follows with visible profiles" on public.follows
for select to anon, authenticated
using (
  follower_id = (select auth.uid())
  or following_id = (select auth.uid())
  or (private.can_view_social_profile(follower_id)
      and private.can_view_social_profile(following_id))
);

-- Existing permissive 'users manage own follows' is insufficient by itself:
-- direct Data API INSERT/UPDATE must not bypass profile visibility or blocks.
create policy "follow recipient privacy insert" on public.follows
as restrictive for insert to authenticated
with check (
  follower_id = (select auth.uid())
  and private.can_view_social_profile(following_id)
);

create policy "follow recipient privacy update" on public.follows
as restrictive for update to authenticated
using (follower_id = (select auth.uid()))
with check (
  follower_id = (select auth.uid())
  and private.can_view_social_profile(following_id)
);

commit;
