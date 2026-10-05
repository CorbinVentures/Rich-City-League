revoke execute on function public.is_mandatory_follow_profile(uuid) from public, anon, authenticated;
drop function if exists public.is_mandatory_follow_profile(uuid);

create or replace function public.rep_status_label(target_level integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when greatest(target_level,1) >= 25 then 'Icon'
    when greatest(target_level,1) >= 16 then 'Elite'
    when greatest(target_level,1) >= 10 then 'Influential'
    when greatest(target_level,1) >= 6 then 'Recognized'
    when greatest(target_level,1) >= 3 then 'Established'
    else 'Rookie'
  end;
$$;
