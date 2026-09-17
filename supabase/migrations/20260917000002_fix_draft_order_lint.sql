-- Production-safe redefinition of configure_draft_order.
-- The original migration is already applied in deployed environments, so the
-- corrected function must also be introduced as a new migration.
create or replace function public.configure_draft_order(target_draft uuid, ordered_teams uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d public.drafts;
  team_count integer;
  ordered_team_id uuid;
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

  for pick_index in 1..array_length(ordered_teams, 1) loop
    ordered_team_id := ordered_teams[pick_index];
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
  end loop;

  delete from public.draft_order where draft_id = target_draft;

  for pick_index in 1..array_length(ordered_teams, 1) loop
    insert into public.draft_order(draft_id, pick_number, round_number, team_id)
    values (
      target_draft,
      pick_index,
      ((pick_index - 1) / team_count) + 1,
      ordered_teams[pick_index]
    );
  end loop;
end;
$$;

revoke all on function public.configure_draft_order(uuid, uuid[]) from public;
grant execute on function public.configure_draft_order(uuid, uuid[]) to authenticated;
