begin;

-- RCH Member Privacy: row visibility is NOT column privacy. A visible social
-- profile must never expose phone numbers, birthdays or acceptance timestamps
-- through PostgREST's wildcard select or embedded profile relationships.
-- Preserve writes and existing row-level policies, but remove table-wide SELECT.
revoke select on table public.profiles from public, anon, authenticated;

-- Public-facing profile attributes only. Both roles receive the same minimal
-- read surface; ownership and accepted-connection checks remain enforced by RLS.
grant select (
  id, username, first_name, last_name, display_name, avatar_url, bio,
  role, is_active, created_at, updated_at, cover_url, position,
  jersey_number, location, profile_visibility, friend_request_policy,
  message_policy, is_vip, vip_label, is_system_account, system_account_key,
  onboarding_complete, qualified_referral_count, profile_song_url
) on table public.profiles to anon, authenticated;

-- Private fields are accessed only through identity-bound RPCs.
-- SECURITY DEFINER is needed solely to read columns withheld from client roles.
-- No caller-provided profile ID is accepted; the function reads auth.uid().
create or replace function public.get_my_private_profile()
returns table(phone text, date_of_birth date)
language sql stable security definer
set search_path = ''
as $$
  select p.phone,p.date_of_birth
  from public.profiles p
  where p.id=(select auth.uid()) and p.is_active
  limit 1;
$$;
revoke all on function public.get_my_private_profile() from public, anon, authenticated;
grant execute on function public.get_my_private_profile() to authenticated;

-- Adult-only enrollment can use a boolean without transferring exact DOB.
create or replace function public.is_my_profile_adult()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(exists(
    select 1
    from public.profiles p
    where p.id=(select auth.uid()) and p.is_active
      and p.date_of_birth is not null
      and p.date_of_birth <= (current_date - interval '18 years')::date
  ),false);
$$;
revoke all on function public.is_my_profile_adult() from public, anon, authenticated;
grant execute on function public.is_my_profile_adult() to authenticated;

commit;
