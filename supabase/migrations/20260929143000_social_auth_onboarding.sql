-- Support Apple/Google OAuth without weakening RCL's 16+ onboarding rules.
-- Existing profiles remain complete. New auth identities that do not already
-- supply RCL age/legal metadata are created as incomplete profiles and must
-- finish the protected onboarding RPC before platform access is granted.

alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists legal_terms_accepted_at timestamptz,
  add column if not exists privacy_policy_acknowledged_at timestamptz,
  add column if not exists onboarding_complete boolean not null default true;

create index if not exists profiles_onboarding_incomplete_idx
  on public.profiles (id)
  where onboarding_complete = false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
  safe_profile_role public.app_role;
  requested_type text;
  dob date;
  terms_at timestamptz;
  privacy_at timestamptz;
  completed boolean;
begin
  requested_type := coalesce(new.raw_user_meta_data ->> 'requested_profile_type', 'fan');

  requested_role := case requested_type
    when 'player' then 'player'::public.app_role
    when 'coach' then 'coach'::public.app_role
    when 'fan' then 'fan'::public.app_role
    else 'fan'::public.app_role
  end;

  safe_profile_role := case
    when requested_role = 'fan'::public.app_role then 'fan'::public.app_role
    else 'player'::public.app_role
  end;

  begin
    dob := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  exception when others then
    dob := null;
  end;

  begin
    terms_at := nullif(new.raw_user_meta_data ->> 'legal_terms_accepted_at', '')::timestamptz;
  exception when others then
    terms_at := null;
  end;

  begin
    privacy_at := nullif(new.raw_user_meta_data ->> 'privacy_policy_acknowledged_at', '')::timestamptz;
  exception when others then
    privacy_at := null;
  end;

  completed := dob is not null and terms_at is not null and privacy_at is not null;

  -- If a client supplies a DOB during account creation, reject an under-16 DOB.
  -- If DOB/legal metadata is omitted (OAuth, tests, or a non-RCL auth client),
  -- create an incomplete profile instead of granting platform membership.
  if dob is not null and dob > current_date - interval '16 years' then
    raise exception 'RCL social accounts require a valid age of 16 or older';
  end if;

  insert into public.profiles (
    id,
    username,
    first_name,
    last_name,
    display_name,
    avatar_url,
    bio,
    location,
    role,
    date_of_birth,
    legal_terms_accepted_at,
    privacy_policy_acknowledged_at,
    onboarding_complete
  ) values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'given_name'), '')
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'family_name'), '')
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      new.email
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'picture'), '')
    ),
    nullif(trim(new.raw_user_meta_data ->> 'bio'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'location'), ''),
    safe_profile_role,
    dob,
    terms_at,
    privacy_at,
    completed
  );

  if requested_role = 'coach'::public.app_role and completed then
    insert into public.profile_roles (profile_id, role, status)
    values (new.id, 'coach'::public.app_role, 'pending')
    on conflict (profile_id, role) do nothing;
  end if;

  if requested_role = 'fan'::public.app_role and completed then
    insert into public.fan_profiles (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;
