-- Public draft night access and atomic coach selections.
alter table public.drafts
  add column if not exists clock_duration_seconds integer not null default 120 check (clock_duration_seconds > 0),
  add column if not exists clock_started_at timestamptz,
  add column if not exists clock_deadline_at timestamptz,
  add column if not exists clock_remaining_seconds integer;

create table if not exists public.draft_order (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  pick_number integer not null check (pick_number > 0),
  round_number integer not null check (round_number > 0),
  team_id uuid not null references public.teams(id),
  created_at timestamptz not null default now(),
  unique (draft_id, pick_number)
);
create index if not exists draft_order_lookup_idx on public.draft_order(draft_id, pick_number);
alter table public.draft_order enable row level security;
create policy "staff manage draft order" on public.draft_order
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "public view live draft order" on public.draft_order
  for select using (exists (
    select 1 from public.drafts d
    where d.id = draft_id and d.status in ('OPEN', 'PAUSED', 'COMPLETED')
  ));

drop policy if exists "staff manage draft operations" on public.draft_pools;
create policy "staff manage draft operations" on public.draft_pools
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "public view eligible draft pool" on public.draft_pools
  for select using (eligible or public.is_staff_or_admin());

drop policy if exists "staff manage drafts" on public.drafts;
create policy "staff manage drafts" on public.drafts
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "public view live drafts" on public.drafts
  for select using (status in ('OPEN', 'PAUSED', 'COMPLETED') or public.is_staff_or_admin());

drop policy if exists "authenticated view draft picks" on public.draft_picks;
create policy "public view draft picks" on public.draft_picks
  for select using (true);
drop policy if exists "staff create draft picks" on public.draft_picks;

create or replace function public.record_draft_pick(target_draft uuid, target_team uuid, target_player uuid)
returns public.draft_picks
language plpgsql security definer set search_path = public
as $$
declare
  d public.drafts;
  result public.draft_picks;
  season_team uuid;
  expected_team uuid;
  team_season uuid;
  roster_id uuid;
  player_profile uuid;
  pool_ok boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into d from public.drafts where id = target_draft for update;
  if not found then raise exception 'Draft not found'; end if;
  if d.status <> 'OPEN' then raise exception 'Draft is not open'; end if;
  if d.clock_deadline_at is not null and now() >= d.clock_deadline_at then
    raise exception 'Pick expired; commissioner review required';
  end if;

  select team_id into expected_team
    from public.draft_order
    where draft_id = target_draft and pick_number = d.current_pick;
  if expected_team is null then raise exception 'Draft order is not configured for the current pick'; end if;
  if not public.is_staff_or_admin() and not exists (
    select 1 from public.team_coaches tc where tc.team_id = target_team and tc.profile_id = auth.uid()
  ) then raise exception 'You are not authorized to make this selection'; end if;
  if target_team <> expected_team then raise exception 'Your team is no longer on the clock'; end if;
  if not exists (
    select 1 from public.players p
    where p.id = target_player and p.is_active
  ) then raise exception 'Player is not eligible for selection'; end if;
  if exists (
    select 1 from public.rosters r
    join public.team_seasons ts on ts.id = r.team_season_id
    where ts.season_id = d.season_id and r.player_id = target_player and r.left_at is null
  ) then raise exception 'Player is already assigned to a roster'; end if;
  select eligible into pool_ok from public.draft_pools where season_id = d.season_id and player_id = target_player;
  if coalesce(pool_ok, false) is not true then raise exception 'Player is not draft eligible'; end if;
  if exists (select 1 from public.draft_picks where draft_id = target_draft and player_id = target_player) then raise exception 'Player has already been selected'; end if;
  if (select count(*) from public.rosters r join public.team_seasons ts on ts.id = r.team_season_id where ts.season_id = d.season_id and ts.team_id = target_team and r.left_at is null) >= d.roster_limit then raise exception 'Team roster is full'; end if;

  insert into public.draft_picks(draft_id, pick_number, round_number, team_id, player_id, selected_by)
  select target_draft, d.current_pick, round_number, target_team, target_player, auth.uid()
  from public.draft_order
  where draft_id = target_draft and pick_number = d.current_pick
  returning * into result;

  select ts.id into team_season
    from public.team_seasons ts
    where ts.season_id = d.season_id and ts.team_id = target_team;
  if team_season is null then raise exception 'Team is not assigned to this season'; end if;
  insert into public.rosters(team_season_id, player_id) values (team_season, target_player) returning id into roster_id;
  insert into public.roster_status_history(roster_id, status, reason, changed_by)
    values (roster_id, 'ACTIVE', 'Selected in RCL draft', auth.uid());
  insert into public.league_transactions(season_id, transaction_type, receiving_team_id, player_ids, status, reason, proposed_by, approved_by, executed_at)
    values (d.season_id, 'DRAFT', target_team, array[target_player], 'EXECUTED', 'RCL draft selection', auth.uid(), auth.uid(), now());
  select profile_id into player_profile from public.players where id = target_player;
  if player_profile is not null then
    insert into public.notifications(recipient_id, actor_id, type, title, body, link)
      values (player_profile, auth.uid(), 'draft_pick', 'You have been drafted!', 'Congratulations — you were selected in the RCL draft.', '/draft');
  end if;
  update public.drafts as current_draft
    set current_pick = current_draft.current_pick + 1,
        clock_started_at = case when exists (select 1 from public.draft_order where draft_id = current_draft.id and pick_number = current_draft.current_pick + 1) then now() else null end,
        clock_deadline_at = case when exists (select 1 from public.draft_order where draft_id = current_draft.id and pick_number = current_draft.current_pick + 1) then now() + make_interval(secs => current_draft.clock_duration_seconds) else null end,
        status = case when exists (select 1 from public.draft_order where draft_id = current_draft.id and pick_number = current_draft.current_pick + 1) then current_draft.status else 'COMPLETED' end
    where current_draft.id = target_draft;
  insert into public.audit_logs(user_id, action, details)
    values (auth.uid(), 'PLAYER_DRAFTED', jsonb_build_object('draft_id', target_draft, 'team_id', target_team, 'player_id', target_player, 'pick_id', result.id)::text);
  return result;
end;
$$;

revoke all on function public.record_draft_pick(uuid, uuid, uuid) from public;
grant execute on function public.record_draft_pick(uuid, uuid, uuid) to authenticated;

create or replace function public.manage_draft_clock(
  target_draft uuid,
  target_action text,
  target_extension_seconds integer default 0
) returns public.drafts
language plpgsql security definer set search_path = public
as $$
declare d public.drafts; remaining integer;
begin
  if not public.is_staff_or_admin() then raise exception 'Only league staff may control the draft clock'; end if;
  select * into d from public.drafts where id = target_draft for update;
  if not found then raise exception 'Draft not found'; end if;
  if target_action = 'OPEN' or target_action = 'RESUME' then
    remaining := coalesce(d.clock_remaining_seconds, d.clock_duration_seconds);
    update public.drafts set status = 'OPEN', clock_started_at = now(),
      clock_deadline_at = now() + make_interval(secs => remaining), clock_remaining_seconds = null
      where id = target_draft;
  elsif target_action = 'PAUSE' then
    remaining := greatest(0, ceil(extract(epoch from (coalesce(d.clock_deadline_at, now()) - now())))::integer);
    update public.drafts set status = 'PAUSED', clock_remaining_seconds = remaining,
      clock_started_at = null, clock_deadline_at = null where id = target_draft;
  elsif target_action = 'EXTEND' then
    if d.status <> 'OPEN' then raise exception 'Only an open draft clock can be extended'; end if;
    update public.drafts set clock_deadline_at = coalesce(clock_deadline_at, now()) +
      make_interval(secs => greatest(target_extension_seconds, 0)) where id = target_draft;
  elsif target_action = 'COMPLETE' then
    update public.drafts set status = 'COMPLETED', clock_started_at = null, clock_deadline_at = null
      where id = target_draft;
  else raise exception 'Unknown draft clock action'; end if;
  select * into d from public.drafts where id = target_draft;
  return d;
end;
$$;
revoke all on function public.manage_draft_clock(uuid, text, integer) from public;
grant execute on function public.manage_draft_clock(uuid, text, integer) to authenticated;

create or replace function public.configure_draft_order(target_draft uuid, ordered_teams uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
declare d public.drafts; team_count integer; i integer; team_id uuid;
begin
  if not public.is_staff_or_admin() then raise exception 'Only league staff may configure draft order'; end if;
  select * into d from public.drafts where id = target_draft for update;
  if not found or d.status <> 'SETUP' then raise exception 'Draft order can only be configured during setup'; end if;
  select count(*) into team_count from public.team_seasons ts
    join public.teams t on t.id = ts.team_id
    where ts.season_id = d.season_id and t.is_active;
  if team_count = 0 or coalesce(array_length(ordered_teams, 1), 0) <> team_count * d.rounds then
    raise exception 'Draft order must contain one entry for every team in every round';
  end if;
  for i in 1..array_length(ordered_teams, 1) loop
    team_id := ordered_teams[i];
    if not exists (select 1 from public.team_seasons ts join public.teams t on t.id = ts.team_id
      where ts.season_id = d.season_id and ts.team_id = team_id and t.is_active) then
      raise exception 'Draft order contains a team outside this season';
    end if;
  end loop;
  delete from public.draft_order where draft_id = target_draft;
  for i in 1..array_length(ordered_teams, 1) loop
    insert into public.draft_order(draft_id, pick_number, round_number, team_id)
      values (target_draft, i, ((i - 1) / team_count) + 1, ordered_teams[i]);
  end loop;
end;
$$;
revoke all on function public.configure_draft_order(uuid, uuid[]) from public;
grant execute on function public.configure_draft_order(uuid, uuid[]) to authenticated;
