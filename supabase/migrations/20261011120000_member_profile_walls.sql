-- Secure member-to-member wall posting, without changing ordinary feed publishing.
begin;

create or replace function private.member_can_post_to_wall(p_target uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = p_target
        and p.is_active = true
        and p.profile_visibility = 'public'
        and p.is_system_account = false
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = p_actor and b.blocked_id = p_target)
         or (b.blocker_id = p_target and b.blocked_id = p_actor)
    );
$$;

-- The private schema is not Data API exposed; authenticated can only use this
-- helper through the RLS policy, not as a public RPC.
grant usage on schema private to authenticated;
revoke all on function private.member_can_post_to_wall(uuid,uuid) from public, anon;
grant execute on function private.member_can_post_to_wall(uuid,uuid) to authenticated;

drop policy if exists "users create posts" on public.posts;
create policy "users create posts" on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and not is_automated
    and (
      target_profile_id is null
      or private.member_can_post_to_wall(target_profile_id, author_id)
    )
  );

-- A member must not bypass the wall guard by first creating a regular post
-- and then editing its destination to a private or blocked profile.
drop policy if exists "authors update posts" on public.posts;
create policy "authors update posts" on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()) or public.is_staff_or_admin())
  with check (
    public.is_staff_or_admin()
    or (
      author_id = (select auth.uid())
      and not is_automated
      and (
        target_profile_id is null
        or private.member_can_post_to_wall(target_profile_id, author_id)
      )
    )
  );

-- Profile owners can moderate guest messages, but official league events
-- are protected. The author's own post deletion policy remains unchanged.
drop policy if exists "profile owners moderate visitor posts" on public.posts;
create policy "profile owners moderate visitor posts" on public.posts
  for delete to authenticated
  using (
    target_profile_id = (select auth.uid())
    and author_id <> (select auth.uid())
    and not is_automated
  );

-- Existing notification trigger drives in-app/PWA alerts. Honor the member's
-- comments preference and never alert on drafts, self-posts, or blocked pairs.
create or replace function public.notify_profile_wall_post()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_catalog'
as $$
declare actor_name text;
begin
  if new.status <> 'published' or new.target_profile_id is null
     or new.target_profile_id = new.author_id
     or not coalesce(
       (select pref.comments from public.notification_preferences pref where pref.profile_id = new.target_profile_id),
       true
     ) then
    return new;
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = new.target_profile_id and b.blocked_id = new.author_id)
       or (b.blocker_id = new.author_id and b.blocked_id = new.target_profile_id)
  ) then return new; end if;

  select coalesce(display_name, username, 'An RCH member') into actor_name
  from public.profiles where id = new.author_id;

  insert into public.notifications(recipient_id,actor_id,type,title,body,link)
  values (
    new.target_profile_id,
    new.author_id,
    'profile_post',
    case when new.is_automated then 'New official RCH activity' else 'New wall post' end,
    case when new.is_automated
      then coalesce(actor_name,'Rich City Hoops')||' added an official moment to your profile.'
      else coalesce(actor_name,'An RCH member')||' posted on your wall.'
    end,
    '/social/post/'||new.id
  );
  return new;
end
$$;

revoke execute on function public.notify_profile_wall_post() from public, anon, authenticated;
commit;
