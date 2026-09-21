-- Profile-aware public signup.
-- Public signup may create player/fan identities. Coach is recorded as a pending
-- requested role and never grants coach/scorebook privileges automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
  safe_profile_role public.app_role;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'requested_profile_type' in ('player','coach','fan')
      then (new.raw_user_meta_data ->> 'requested_profile_type')::public.app_role
    else 'fan'::public.app_role
  end;

  safe_profile_role := case when requested_role = 'fan' then 'fan'::public.app_role else 'player'::public.app_role end;

  insert into public.profiles (
    id, username, first_name, last_name, display_name, bio, location, role
  ) values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), new.email),
    nullif(new.raw_user_meta_data ->> 'bio', ''),
    nullif(new.raw_user_meta_data ->> 'location', ''),
    safe_profile_role
  );

  insert into public.profile_roles (profile_id, role, status)
  values (
    new.id,
    requested_role,
    case when requested_role = 'coach' then 'pending' else 'active' end
  )
  on conflict do nothing;

  if requested_role = 'fan' then
    insert into public.fan_profiles (profile_id)
    values (new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;
