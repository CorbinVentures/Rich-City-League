-- Profile-aware public signup.
-- Authentication identity, community profile and season registration remain separate.
-- A public signup can create a player or fan identity. Coach selection is only a
-- pending request and never grants coach/scorebook authorization automatically.
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
begin
  requested_type := coalesce(new.raw_user_meta_data ->> 'requested_profile_type', 'fan');

  requested_role := case requested_type
    when 'player' then 'player'::public.app_role
    when 'coach' then 'coach'::public.app_role
    when 'fan' then 'fan'::public.app_role
    else 'fan'::public.app_role
  end;

  -- Coach is privileged elsewhere in the application. Keep the authorization
  -- role non-privileged until an authorized operator approves the request.
  safe_profile_role := case
    when requested_role = 'fan'::public.app_role then 'fan'::public.app_role
    else 'player'::public.app_role
  end;

  insert into public.profiles (
    id, username, first_name, last_name, display_name, bio, location, role
  ) values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), new.email),
    nullif(trim(new.raw_user_meta_data ->> 'bio'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'location'), ''),
    safe_profile_role
  );

  -- profile_roles has an authorization sync trigger. Never insert an active
  -- player/fan row here because doing so would mix self-selected identity with
  -- verified authorization. Coach requests are explicitly pending.
  if requested_role = 'coach'::public.app_role then
    insert into public.profile_roles (profile_id, role, status)
    values (new.id, 'coach'::public.app_role, 'pending')
    on conflict (profile_id, role) do nothing;
  end if;

  if requested_role = 'fan'::public.app_role then
    insert into public.fan_profiles (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;
