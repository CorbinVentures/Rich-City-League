-- Restore the OAuth-safe signup trigger that was present in the September 29
-- migration but drifted in production, and make taken usernames non-fatal.
-- All new users remain unprivileged until verified onboarding is complete.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_type text;
  requested_role public.app_role;
  safe_profile_role public.app_role;
  dob date;
  terms_at timestamptz;
  privacy_at timestamptz;
  completed boolean;
  preferred_username text;
begin
  requested_type := coalesce(new.raw_user_meta_data ->> 'requested_profile_type', 'fan');
  requested_role := case requested_type
    when 'player' then 'player'::public.app_role
    when 'coach' then 'coach'::public.app_role
    else 'fan'::public.app_role
  end;
  -- A self-selected coach cannot authorize themselves as a verified coach.
  safe_profile_role := case
    when requested_role = 'fan'::public.app_role then 'fan'::public.app_role
    else 'player'::public.app_role
  end;

  begin
    dob := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  exception when others then dob := null;
  end;
  begin
    terms_at := nullif(new.raw_user_meta_data ->> 'legal_terms_accepted_at', '')::timestamptz;
  exception when others then terms_at := null;
  end;
  begin
    privacy_at := nullif(new.raw_user_meta_data ->> 'privacy_policy_acknowledged_at', '')::timestamptz;
  exception when others then privacy_at := null;
  end;

  if dob is not null and dob > current_date - interval '16 years' then
    raise exception 'RCH accounts are available only to people age 16 or older';
  end if;
  completed := dob is not null and terms_at is not null and privacy_at is not null;

  preferred_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  -- A username race/duplicate must not roll back the entire Auth account.
  -- The UI preflights availability; in an unlikely race, leave username unset
  -- for the member to claim after they verify their email.
  insert into public.profiles (
    id, username, first_name, last_name, display_name, avatar_url,
    bio, location, role, date_of_birth, legal_terms_accepted_at,
    privacy_policy_acknowledged_at, onboarding_complete
  ) values (
    new.id,
    preferred_username,
    coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'),''), nullif(trim(new.raw_user_meta_data->>'given_name'),'')),
    coalesce(nullif(trim(new.raw_user_meta_data->>'last_name'),''), nullif(trim(new.raw_user_meta_data->>'family_name'),'')),
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),
             nullif(trim(new.raw_user_meta_data->>'full_name'),''),
             nullif(trim(new.raw_user_meta_data->>'name'),''), new.email),
    coalesce(nullif(trim(new.raw_user_meta_data->>'avatar_url'),''), nullif(trim(new.raw_user_meta_data->>'picture'),'')),
    nullif(trim(new.raw_user_meta_data->>'bio'),''),
    nullif(trim(new.raw_user_meta_data->>'location'),''),
    safe_profile_role, dob, terms_at, privacy_at, completed
  )
  on conflict (username) do nothing;

  if not found then
    insert into public.profiles (
      id, username, first_name, last_name, display_name, avatar_url,
      bio, location, role, date_of_birth, legal_terms_accepted_at,
      privacy_policy_acknowledged_at, onboarding_complete
    ) values (
      new.id, null,
      coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'),''), nullif(trim(new.raw_user_meta_data->>'given_name'),'')),
      coalesce(nullif(trim(new.raw_user_meta_data->>'last_name'),''), nullif(trim(new.raw_user_meta_data->>'family_name'),'')),
      coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),
               nullif(trim(new.raw_user_meta_data->>'full_name'),''),
               nullif(trim(new.raw_user_meta_data->>'name'),''), new.email),
      coalesce(nullif(trim(new.raw_user_meta_data->>'avatar_url'),''), nullif(trim(new.raw_user_meta_data->>'picture'),'')),
      nullif(trim(new.raw_user_meta_data->>'bio'),''),
      nullif(trim(new.raw_user_meta_data->>'location'),''),
      safe_profile_role, dob, terms_at, privacy_at, completed
    );
  end if;

  if requested_role = 'coach'::public.app_role and completed then
    insert into public.profile_roles (profile_id, role, status)
    values (new.id, 'coach'::public.app_role, 'pending')
    on conflict (profile_id, role) do nothing;
  end if;

  if requested_role = 'fan'::public.app_role and completed then
    insert into public.fan_profiles(profile_id)
    values(new.id) on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

-- This public boolean lookup enables clear UX before calling Auth signup.
-- It returns no profile data, and the underlying citext unique index remains
-- authoritative for races and case-insensitive collisions.
create or replace function public.rch_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username is not null
    and length(trim(p_username)) between 3 and 30
    and trim(p_username) ~ '^[A-Za-z0-9_]+$'
    and not exists (
      select 1 from public.profiles p
      where p.username = trim(p_username)::public.citext
    );
$$;

revoke all on function public.rch_username_available(text) from public, anon, authenticated;
grant execute on function public.rch_username_available(text) to anon, authenticated;
-- Trigger-only: preserve least privilege for the auth profile creator.
revoke all on function public.handle_new_user() from public, anon, authenticated;
