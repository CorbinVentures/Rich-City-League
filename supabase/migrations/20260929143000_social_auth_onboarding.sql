-- Support Apple/Google OAuth without weakening RCL's 16+ onboarding rules.
-- Existing profiles remain complete; newly-created social identities must finish
-- age/legal/profile onboarding before protected platform access is allowed.

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
  auth_provider text;
  dob date;
  terms_at timestamptz;
  privacy_at timestamptz;
  completed boolean;
begin
  requested_type := coalesce(new.raw_user_meta_data ->> 'requested_profile_type', 'fan');
  auth_provider := coalesce(nullif(new.raw_app_meta_data ->> 'provider', ''), 'email');

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

  -- Email/password creation already collects the 16+ screen and legal consent.
  -- Enforce that on the server as well. OAuth users intentionally enter with an
  -- incomplete profile and are routed to complete_social_onboarding().
  if auth_provider = 'email' then
    if not completed or dob > current_date - interval '16 years' then
      raise exception 'RCL social accounts require a valid age of 16 or older and legal consent';
    end if;
  elsif dob is not null and dob > current_date - interval '16 years' then
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

create or replace function public.complete_social_onboarding(
  p_username text,
  p_first_name text,
  p_last_name text,
  p_display_name text,
  p_profile_type text,
  p_date_of_birth date,
  p_location text default null,
  p_bio text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_username text;
  requested_role public.app_role;
  safe_profile_role public.app_role;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if p_date_of_birth is null or p_date_of_birth > current_date - interval '16 years' then
    raise exception 'RCL social accounts are available only to users age 16 or older';
  end if;

  clean_username := lower(regexp_replace(trim(coalesce(p_username, '')), '^@', ''));
  if length(clean_username) < 3 or length(clean_username) > 30 then
    raise exception 'Username must be between 3 and 30 characters';
  end if;
  if clean_username !~ '^[a-z0-9._]+$' then
    raise exception 'Username may contain only letters, numbers, periods, and underscores';
  end if;

  if length(trim(coalesce(p_first_name, ''))) < 1 or length(trim(coalesce(p_last_name, ''))) < 1 then
    raise exception 'First and last name are required';
  end if;

  requested_role := case lower(trim(coalesce(p_profile_type, 'fan')))
    when 'player' then 'player'::public.app_role
    when 'coach' then 'coach'::public.app_role
    when 'fan' then 'fan'::public.app_role
    else 'fan'::public.app_role
  end;

  safe_profile_role := case
    when requested_role = 'fan'::public.app_role then 'fan'::public.app_role
    else 'player'::public.app_role
  end;

  update public.profiles
  set
    username = clean_username,
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    display_name = coalesce(nullif(trim(p_display_name), ''), trim(p_first_name) || ' ' || trim(p_last_name)),
    location = nullif(trim(coalesce(p_location, '')), ''),
    bio = nullif(trim(coalesce(p_bio, '')), ''),
    role = safe_profile_role,
    date_of_birth = p_date_of_birth,
    legal_terms_accepted_at = now(),
    privacy_policy_acknowledged_at = now(),
    onboarding_complete = true,
    updated_at = now()
  where id = uid;

  if not found then
    raise exception 'RCL profile not found';
  end if;

  -- Only remove an unverified coach request left from a previous onboarding try.
  delete from public.profile_roles
  where profile_id = uid and role = 'coach'::public.app_role and status = 'pending';

  if requested_role = 'coach'::public.app_role then
    insert into public.profile_roles (profile_id, role, status)
    values (uid, 'coach'::public.app_role, 'pending')
    on conflict (profile_id, role) do update set status = 'pending';
  end if;

  if requested_role = 'fan'::public.app_role then
    insert into public.fan_profiles (profile_id)
    values (uid)
    on conflict (profile_id) do nothing;
  else
    delete from public.fan_profiles where profile_id = uid;
  end if;

  return true;
end;
$$;

revoke all on function public.complete_social_onboarding(text,text,text,text,text,date,text,text) from public, anon;
grant execute on function public.complete_social_onboarding(text,text,text,text,text,date,text,text) to authenticated;
