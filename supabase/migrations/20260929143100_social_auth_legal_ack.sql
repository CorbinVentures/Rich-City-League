-- Require an explicit legal-acceptance flag when completing social OAuth onboarding.
-- The first social-auth migration creates the RPC with eight arguments; replace
-- it immediately with the consent-aware signature before enabling providers.

drop function if exists public.complete_social_onboarding(text,text,text,text,text,date,text,text);

create or replace function public.complete_social_onboarding(
  p_username text,
  p_first_name text,
  p_last_name text,
  p_display_name text,
  p_profile_type text,
  p_date_of_birth date,
  p_accept_legal boolean,
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

  if p_accept_legal is not true then
    raise exception 'Legal consent is required';
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

revoke all on function public.complete_social_onboarding(text,text,text,text,text,date,boolean,text,text) from public, anon;
grant execute on function public.complete_social_onboarding(text,text,text,text,text,date,boolean,text,text) to authenticated;
