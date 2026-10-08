create or replace function public.has_game_iq_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in ('coach'::app_role, 'admin'::app_role)
  );
$$;

revoke all on function public.has_game_iq_access() from public;
grant execute on function public.has_game_iq_access() to authenticated;

create or replace function public.is_game_iq_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role = 'admin'::app_role
  );
$$;

revoke all on function public.is_game_iq_admin() from public;
grant execute on function public.is_game_iq_admin() to authenticated;
