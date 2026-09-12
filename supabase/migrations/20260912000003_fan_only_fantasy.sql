-- Fantasy team management is a fan-only capability. Staff administer official totals.
drop policy if exists "users manage own fan role request" on public.profile_roles;
create policy "users request fan role" on public.profile_roles for insert
  with check (profile_id = auth.uid() and role = 'fan' and status = 'pending');

drop policy if exists "managers create fantasy teams" on public.fantasy_teams;
create policy "fans create fantasy teams" on public.fantasy_teams for insert
  with check (
    manager_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'fan')
  );

drop policy if exists "managers update fantasy teams" on public.fantasy_teams;
create policy "fans update fantasy teams" on public.fantasy_teams for update
  using (manager_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'fan'))
  with check (manager_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'fan'));

drop policy if exists "managers manage fantasy rosters" on public.fantasy_rosters;
create policy "fans manage fantasy rosters" on public.fantasy_rosters for all
  using (exists (
    select 1 from public.fantasy_teams t
    join public.profiles p on p.id = t.manager_id
    where t.id = fantasy_team_id and t.manager_id = auth.uid() and p.role = 'fan'
  ))
  with check (exists (
    select 1 from public.fantasy_teams t
    join public.profiles p on p.id = t.manager_id
    where t.id = fantasy_team_id and t.manager_id = auth.uid() and p.role = 'fan'
  ));

create or replace function public.ensure_fan_profile_for_active_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'fan' and new.status = 'active' then
    insert into public.fan_profiles (profile_id) values (new.profile_id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists create_fan_profile_for_active_role on public.profile_roles;
create trigger create_fan_profile_for_active_role
  after insert or update of status, role on public.profile_roles
  for each row execute procedure public.ensure_fan_profile_for_active_role();
