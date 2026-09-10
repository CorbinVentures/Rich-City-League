-- Keep identity and calculated competition data under server-side control.

create or replace function public.prevent_protected_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff_or_admin()
    and (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active) then
    raise exception 'Only staff can change profile authorization fields';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_authorization_fields on public.profiles;
create trigger protect_profile_authorization_fields
  before update on public.profiles
  for each row execute procedure public.prevent_protected_profile_changes();

drop policy if exists "users update own fan profile" on public.fan_profiles;
create policy "users view fan profiles"
  on public.fan_profiles for select using (true);
create policy "users update fan preferences"
  on public.fan_profiles for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create or replace function public.prevent_protected_fan_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff_or_admin()
    and (new.fan_level is distinct from old.fan_level
      or new.games_attended is distinct from old.games_attended) then
    raise exception 'Only staff can change official fan progress';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_fan_progress on public.fan_profiles;
create trigger protect_fan_progress
  before update on public.fan_profiles
  for each row execute procedure public.prevent_protected_fan_changes();

create or replace function public.prevent_fantasy_totals_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff_or_admin()
    and (new.manager_id is distinct from old.manager_id
      or new.total_points is distinct from old.total_points
      or new.wins is distinct from old.wins
      or new.losses is distinct from old.losses) then
    raise exception 'Only staff can change official fantasy totals';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_fantasy_totals on public.fantasy_teams;
create trigger protect_fantasy_totals
  before update on public.fantasy_teams
  for each row execute procedure public.prevent_fantasy_totals_changes();

drop policy if exists "users view safe profiles" on public.profiles;
create policy "public active profiles"
  on public.profiles for select
  using (is_active and profile_visibility = 'public');
create policy "users view own or staff profiles"
  on public.profiles for select
  using (id = auth.uid() or public.is_staff_or_admin());
