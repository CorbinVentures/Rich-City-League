begin;

-- One membership privacy rule for public profiles, accepted connections, social
-- posts and stories. Runs as a locked-down RLS helper to avoid recursion when
-- reading profiles/friendships/blocks; never returns profile data.
create or replace function private.can_view_social_profile(p_target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_target and p.is_active
      and (
        p.profile_visibility = 'public'
        or (
          (select auth.uid()) is not null
          and (
            p.id = (select auth.uid())
            or (
              p.profile_visibility = 'friends'
              and exists (
                select 1 from public.friendships f
                where f.status = 'accepted'
                  and ((f.requester_id = (select auth.uid()) and f.addressee_id = p.id)
                    or (f.addressee_id = (select auth.uid()) and f.requester_id = p.id))
              )
            )
          )
        )
      )
      and (
        (select auth.uid()) is null or p.id = (select auth.uid())
        or not exists (
          select 1 from public.blocks b
          where (b.blocker_id = (select auth.uid()) and b.blocked_id = p.id)
             or (b.blocker_id = p.id and b.blocked_id = (select auth.uid()))
        )
      )
  );
$$;
revoke all on function private.can_view_social_profile(uuid) from public;
grant execute on function private.can_view_social_profile(uuid) to anon, authenticated;

drop policy if exists "public active profiles" on public.profiles;
create policy "public active profiles" on public.profiles
  for select to anon, authenticated
  using (private.can_view_social_profile(id));

-- Enforce a consistent social boundary for direct reads, including through
-- the Data API; hiding a profile must also protect its authored social posts.
drop policy if exists "public published posts" on public.posts;
create policy "public published posts" on public.posts
  for select to anon, authenticated
  using (
    status = 'published'::public.content_status
    and private.can_view_social_profile(author_id)
    and (target_profile_id is null or private.can_view_social_profile(target_profile_id))
  );

drop policy if exists "visible active stories" on public.stories;
create policy "visible active stories" on public.stories
  for select to anon, authenticated
  using (
    expires_at > now()
    and private.can_view_social_profile(author_id)
    and (
      audience = 'public' or author_id = (select auth.uid())
      or (
        audience = 'friends' and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = (select auth.uid()) and f.addressee_id = author_id)
              or (f.addressee_id = (select auth.uid()) and f.requester_id = author_id))
        )
      )
    )
  );

-- Friend requests honor the recipient's actual preferences, mutuals, and
-- blocks regardless of which client submits the request.
create or replace function private.can_request_friendship(p_requester uuid, p_target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_requester = (select auth.uid())
    and p_requester is distinct from p_target
    and exists (
      select 1 from public.profiles sender, public.profiles recipient
      where sender.id = p_requester and sender.is_active
        and recipient.id = p_target and recipient.is_active
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = p_requester and b.blocked_id = p_target)
             or (b.blocker_id = p_target and b.blocked_id = p_requester)
        )
        and (
          recipient.friend_request_policy = 'everyone'
          or (
            recipient.friend_request_policy = 'friends_of_friends'
            and exists (
              select 1
              from public.friendships a join public.friendships b
                on (case when a.requester_id = p_requester then a.addressee_id else a.requester_id end)
                 = (case when b.requester_id = p_target then b.addressee_id else b.requester_id end)
              where a.status = 'accepted' and b.status = 'accepted'
                and p_requester in (a.requester_id, a.addressee_id)
                and p_target in (b.requester_id, b.addressee_id)
            )
          )
        )
    );
$$;
revoke all on function private.can_request_friendship(uuid,uuid) from public;
grant execute on function private.can_request_friendship(uuid,uuid) to authenticated;

drop policy if exists "users create friendships" on public.friendships;
create policy "users create friendships" on public.friendships
  for insert to authenticated
  with check (
    requester_id = (select auth.uid()) and status = 'pending'
    and private.can_request_friendship(requester_id, addressee_id)
  );

-- Prevent requesters accepting their own invitations or changing participant
-- identities after creation. Existing friends remain unchanged.
create or replace function private.guard_friendship_transition()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Connection participants cannot be changed' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    if old.status <> 'pending' or not (
      ((select auth.uid()) = old.addressee_id and new.status in ('accepted', 'declined'))
      or ((select auth.uid()) = old.requester_id and new.status = 'cancelled')
    ) then
      raise exception 'This connection transition is not permitted' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_friendship_transition on public.friendships;
create trigger guard_friendship_transition
before update on public.friendships
for each row execute function private.guard_friendship_transition();

commit;
