-- Keep new account creation separate from privileged role assignment.
-- The league admin is assigned through controlled admin workflows, not by email
-- matching inside the auth trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    first_name,
    last_name,
    display_name,
    role
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), new.email),
    'player'::public.app_role
  );
  return new;
end;
$$;

-- Existing authorized admins are intentionally left unchanged. This migration
-- only prevents future signups from receiving a privileged role automatically.
