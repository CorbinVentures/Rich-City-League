-- Fantasy team management is a fan-only capability. Staff administer official totals.
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
