-- Public draft night access and atomic coach selections.
alter table public.drafts
  add column if not exists clock_duration_seconds integer not null default 120 check (clock_duration_seconds > 0),
  add column if not exists clock_started_at timestamptz,
  add column if not exists clock_deadline_at timestamptz;

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
  team_count integer;
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

  select count(*) into team_count
    from public.team_seasons ts
    join public.teams t on t.id = ts.team_id
    where ts.season_id = d.season_id and t.is_active;
  if team_count = 0 then raise exception 'Draft has no eligible teams'; end if;
  select t.id into expected_team
    from public.team_seasons ts
    join public.teams t on t.id = ts.team_id
    where ts.season_id = d.season_id and t.is_active
    order by t.name
    offset ((d.current_pick - 1) % team_count) limit 1;
  if not public.is_staff_or_admin() and not exists (
    select 1 from public.team_coaches tc where tc.team_id = target_team and tc.profile_id = auth.uid()
  ) then raise exception 'You are not authorized to make this selection'; end if;
  if target_team <> expected_team then raise exception 'Your team is no longer on the clock'; end if;
  select eligible into pool_ok from public.draft_pools where season_id = d.season_id and player_id = target_player;
  if coalesce(pool_ok, false) is not true then raise exception 'Player is not draft eligible'; end if;
  if exists (select 1 from public.draft_picks where draft_id = target_draft and player_id = target_player) then raise exception 'Player has already been selected'; end if;
  if (select count(*) from public.rosters r join public.team_seasons ts on ts.id = r.team_season_id where ts.season_id = d.season_id and ts.team_id = target_team and r.left_at is null) >= d.roster_limit then raise exception 'Team roster is full'; end if;

  insert into public.draft_picks(draft_id, pick_number, round_number, team_id, player_id, selected_by)
  values (target_draft, d.current_pick, ((d.current_pick - 1) / team_count) + 1, target_team, target_player, auth.uid())
  returning * into result;

  select id into team_season from public.team_seasons where season_id = d.season_id and team_id = target_team limit 1;
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
  update public.drafts
    set current_pick = current_pick + 1,
        clock_started_at = now(),
        clock_deadline_at = now() + make_interval(secs => clock_duration_seconds)
    where id = target_draft;
  insert into public.audit_logs(user_id, action, details)
    values (auth.uid(), 'PLAYER_DRAFTED', jsonb_build_object('draft_id', target_draft, 'team_id', target_team, 'player_id', target_player, 'pick_id', result.id)::text);
  return result;
end;
$$;

revoke all on function public.record_draft_pick(uuid, uuid, uuid) from public;
grant execute on function public.record_draft_pick(uuid, uuid, uuid) to authenticated;
