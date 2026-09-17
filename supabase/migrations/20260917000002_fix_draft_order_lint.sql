-- Production-safe redefinition of draft-order validation and policy scope.
-- These corrections are delivered as a new migration because the original draft
-- migration is already applied in deployed environments.

create or replace function public.configure_draft_order(target_draft uuid, ordered_teams uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d public.drafts;
  team_count integer;
  ordered_team_id uuid;
  round_index integer;
  team_index integer;
  array_index integer;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only league staff may configure draft order';
  end if;

  select * into d from public.drafts where id = target_draft for update;
  if not found or d.status <> 'SETUP' then
    raise exception 'Draft order can only be configured during setup';
  end if;

  select count(*) into team_count
  from public.team_seasons ts
  join public.teams t on t.id = ts.team_id
  where ts.season_id = d.season_id and t.is_active;

  if team_count = 0 or coalesce(array_length(ordered_teams, 1), 0) <> team_count * d.rounds then
    raise exception 'Draft order must contain one entry for every team in every round';
  end if;

  -- Every round must contain each active team exactly once. Since each round
  -- contains exactly team_count entries and every entry must belong to the
  -- active team set, rejecting duplicates also rejects missing teams.
  for round_index in 0..d.rounds - 1 loop
    for team_index in 1..team_count loop
      array_index := round_index * team_count + team_index;
      ordered_team_id := ordered_teams[array_index];

      if not exists (
        select 1
        from public.team_seasons ts
        join public.teams t on t.id = ts.team_id
        where ts.season_id = d.season_id
          and ts.team_id = ordered_team_id
          and t.is_active
      ) then
        raise exception 'Draft order contains a team outside this season';
      end if;

      if team_index > 1 and exists (
        select 1
        from generate_series(1, team_index - 1) prior_index
        where ordered_teams[round_index * team_count + prior_index] = ordered_team_id
      ) then
        raise exception 'Each team may appear only once per draft round';
      end if;
    end loop;
  end loop;

  delete from public.draft_order where draft_id = target_draft;

  for array_index in 1..array_length(ordered_teams, 1) loop
    insert into public.draft_order(draft_id, pick_number, round_number, team_id)
    values (
      target_draft,
      array_index,
      ((array_index - 1) / team_count) + 1,
      ordered_teams[array_index]
    );
  end loop;
end;
$$;

revoke all on function public.configure_draft_order(uuid, uuid[]) from public;
grant execute on function public.configure_draft_order(uuid, uuid[]) to authenticated;

-- Authorization helpers used by protected draft policies are intentionally
-- unavailable to anon. Keep anonymous policies limited to anon-safe predicates.
drop policy if exists "staff manage draft order" on public.draft_order;
create policy "staff manage draft order" on public.draft_order
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

drop policy if exists "staff manage draft operations" on public.draft_pools;
create policy "staff manage draft operations" on public.draft_pools
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

drop policy if exists "public view eligible draft pool" on public.draft_pools;
create policy "public view eligible draft pool" on public.draft_pools
  for select to anon, authenticated
  using (eligible);

drop policy if exists "staff manage drafts" on public.drafts;
create policy "staff manage drafts" on public.drafts
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

drop policy if exists "public view live drafts" on public.drafts;
create policy "public view live drafts" on public.drafts
  for select to anon, authenticated
  using (status in ('OPEN', 'PAUSED', 'COMPLETED'));
