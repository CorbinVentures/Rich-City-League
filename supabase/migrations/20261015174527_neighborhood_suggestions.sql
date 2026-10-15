begin;

-- Reuse the existing private member visibility guard: public, active, human
-- profiles and no block in either direction. It checks the actor against auth.uid().
-- This endpoint remains SECURITY INVOKER and returns only public card fields.
create or replace function public.get_neighborhood_profiles(p_limit integer default 12)
returns table(id uuid, display_name text, username text, avatar_url text)
language sql stable security invoker set search_path = ''
as $$
  select p.id, p.display_name, p.username, p.avatar_url
  from public.profiles p
  where (select auth.uid()) is not null
    and exists (select 1 from public.profiles viewer where viewer.id = (select auth.uid()) and viewer.is_active)
    and p.id <> (select auth.uid())
    and p.is_active and p.profile_visibility = 'public' and not p.is_system_account
    and private.member_can_post_to_wall(p.id, (select auth.uid()))
    and not exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = p.id)
  order by p.created_at desc, p.id
  limit greatest(1, least(coalesce(p_limit, 12), 24));
$$;
revoke all on function public.get_neighborhood_profiles(integer) from public, anon;
grant execute on function public.get_neighborhood_profiles(integer) to authenticated;

-- Recheck eligibility at click time, rather than trusting a stale suggestion.
create or replace function public.follow_neighborhood_profile(p_target uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if (select auth.uid()) is null or p_target = (select auth.uid())
    or not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
    or not coalesce(private.member_can_post_to_wall(p_target, (select auth.uid())), false)
  then raise exception 'This profile is no longer available to follow.' using errcode = '42501'; end if;
  insert into public.follows(follower_id, following_id) values ((select auth.uid()), p_target)
  on conflict (follower_id, following_id) do nothing;
end;
$$;
revoke all on function public.follow_neighborhood_profile(uuid) from public, anon;
grant execute on function public.follow_neighborhood_profile(uuid) to authenticated;
commit;
