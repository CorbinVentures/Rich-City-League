begin;

-- Supabase MFA reference: members who enroll at least one verified TOTP factor
-- must present an AAL2 JWT for private data. Do not require everyone to enroll.
-- SECURITY DEFINER only reads the caller's factor state in auth.mfa_factors;
-- no arbitrary profile identifier is accepted, and auth JWT claims cannot be
-- forged through the Data API.
create or replace function private.member_mfa_session_authorized()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2'
    or not exists(
      select 1 from auth.mfa_factors f
      where f.user_id=(select auth.uid()) and f.status='verified'
    )
  );
$$;
revoke all on function private.member_mfa_session_authorized() from public, anon, authenticated;
grant execute on function private.member_mfa_session_authorized() to authenticated;

-- Restrictive policies combine with (never replace) ownership and moderation
-- policies; a password-only session cannot query private data once MFA is
-- enabled, even by calling PostgREST outside the RCH user interface.
create policy "verified mfa for opted in members"
on public.profiles as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.posts as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.stories as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.messages as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.conversations as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.conversation_members as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.notifications as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.blocks as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.friendships as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.follows as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.privacy_requests as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.registrations as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.rch_creator_accounts as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.profile_roles as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.staff as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

create policy "verified mfa for opted in members"
on public.site_settings as restrictive for all to authenticated
using ((select private.member_mfa_session_authorized()))
with check ((select private.member_mfa_session_authorized()));

-- SECURITY DEFINER owner-only RPCs bypass table RLS, so explicitly apply the
-- same factor check inside the functions.
create or replace function public.get_my_private_profile()
returns table(phone text, date_of_birth date)
language sql stable security definer set search_path=''
as $$
  select p.phone,p.date_of_birth from public.profiles p
  where p.id=(select auth.uid()) and p.is_active
    and private.member_mfa_session_authorized()
  limit 1;
$$;

create or replace function public.is_my_profile_adult()
returns boolean language sql stable security definer set search_path=''
as $$
  select coalesce(private.member_mfa_session_authorized() and exists(
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.is_active
      and p.date_of_birth is not null
      and p.date_of_birth <= (current_date - interval '18 years')::date
  ),false);
$$;

create or replace function public.get_my_blocked_accounts()
returns table(blocked_id uuid, label text, created_at timestamptz)
language sql stable security definer set search_path=''
as $$
  select b.blocked_id,
    coalesce(nullif(trim(p.display_name),''),p.username::text,'RCH member') as label,
    b.created_at
  from public.blocks b join public.profiles p on p.id=b.blocked_id
  where b.blocker_id=(select auth.uid()) and private.member_mfa_session_authorized()
  order by b.created_at desc;
$$;

commit;
