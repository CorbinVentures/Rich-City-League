begin;
-- A small public boolean projection instead of opening complete private
-- redemption records to visitors and other profiles.
create or replace function public.rch_has_active_rep_frame(p_profile uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.rch_rep_orders o
  join public.profiles p on p.id=o.profile_id
  where o.profile_id=p_profile and o.reward_code='profile_frame'
   and o.status='active' and o.expires_at>now()
   and p.is_active and not coalesce(p.is_system_account,false)
   and (p.id=auth.uid() or coalesce(p.profile_visibility,'public') not in ('private','only_me'))
 )
$$;
revoke all on function public.rch_has_active_rep_frame(uuid) from public,anon,authenticated;
grant execute on function public.rch_has_active_rep_frame(uuid) to anon,authenticated;
commit;