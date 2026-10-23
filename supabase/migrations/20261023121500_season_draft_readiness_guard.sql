-- Official playable-season Draft Night: format integrity + preflight gate.
-- The draft already inserts official season roster rows in record_draft_pick.
-- This migration adds prerequisites and prevents a malformed live draft.
create or replace function private.inspect_season_draft_readiness(target_draft uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  d public.drafts;
  team_total integer;
  ordered_total integer;
  eligible_total integer;
  invalid_slots integer;
  full_teams integer;
  blockers jsonb := '[]'::jsonb;
begin
  select * into d from public.drafts where id = target_draft;
  if d.id is null then
    return jsonb_build_array('Draft not found');
  end if;

  select count(*) into team_total
  from public.team_seasons ts join public.teams t on t.id = ts.team_id
  where ts.season_id = d.season_id and t.is_active;
  if team_total < 2 then
    blockers := blockers || jsonb_build_array('Assign at least two active teams to the draft season.');
  end if;
  if d.rounds > d.roster_limit then
    blockers := blockers || jsonb_build_array('Draft rounds exceed the maximum players per team.');
  end if;

  select count(*) into ordered_total from public.draft_order where draft_id = d.id;
  if team_total = 0 or ordered_total <> team_total * d.rounds then
    blockers := blockers || jsonb_build_array('Configure a complete draft order for every round.');
  end if;

  -- Standard order: exactly one slot for each participating team each round.
  select count(*) into invalid_slots
  from (
    select expected.round_number, expected.team_id
    from generate_series(1, d.rounds) expected_round(round_number)
    cross join (
      select ts.team_id from public.team_seasons ts
      join public.teams t on t.id = ts.team_id
      where ts.season_id = d.season_id and t.is_active
    ) active_teams
    cross join lateral (select expected_round.round_number, active_teams.team_id) expected
    left join public.draft_order o on o.draft_id = d.id
      and o.round_number = expected.round_number and o.team_id = expected.team_id
    group by expected.round_number, expected.team_id
    having count(o.id) <> 1
  ) missing_or_duplicate;
  if invalid_slots > 0 or exists (
    select 1 from public.draft_order o
    left join public.team_seasons ts on ts.season_id = d.season_id and ts.team_id = o.team_id
    left join public.teams t on t.id = o.team_id and t.is_active
    where o.draft_id = d.id
      and (ts.id is null or t.id is null or o.round_number not between 1 and d.rounds)
  ) then
    blockers := blockers || jsonb_build_array('Each active season team must appear exactly once per round.');
  end if;

  select count(*) into full_teams
  from public.team_seasons ts join public.teams t on t.id = ts.team_id
  where ts.season_id = d.season_id and t.is_active
    and (select count(*) from public.rosters r
      where r.team_season_id = ts.id and r.left_at is null)
        + (select count(*) from public.draft_order o
           where o.draft_id = d.id and o.team_id = ts.team_id) > d.roster_limit;
  if full_teams > 0 then
    blockers := blockers || jsonb_build_array('One or more teams lack enough roster vacancies for their scheduled selections.');
  end if;

  -- A player already assigned to any team in this playable season cannot
  -- be counted as available, even if they are still in the draft pool.
  select count(*) into eligible_total
  from public.draft_pools pool
  join public.players p on p.id = pool.player_id and p.is_active
  where pool.season_id = d.season_id and pool.eligible
    and not exists (
      select 1 from public.rosters r
      join public.team_seasons ts on ts.id = r.team_season_id
      where ts.season_id = d.season_id and r.player_id = pool.player_id and r.left_at is null
    );
  if eligible_total < ordered_total then
    blockers := blockers || jsonb_build_array('Approved, unassigned prospects must cover every planned selection.');
  end if;
  return blockers;
end;
$$;

revoke all on function private.inspect_season_draft_readiness(uuid) from public, anon, authenticated;

create or replace function public.season_draft_readiness(target_draft uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_staff_or_admin() then
    raise exception 'Only league staff may inspect draft readiness' using errcode='42501';
  end if;
  return private.inspect_season_draft_readiness(target_draft);
end;
$$;
revoke all on function public.season_draft_readiness(uuid) from public, anon, authenticated;
grant execute on function public.season_draft_readiness(uuid) to authenticated;

create or replace function public.configure_draft_order(target_draft uuid, ordered_teams uuid[])
returns void language plpgsql security definer set search_path = ''
as $$
declare
  d public.drafts;
  team_count integer;
  pick_index integer;
begin
  if (select auth.uid()) is null or not public.is_staff_or_admin() then
    raise exception 'League staff authorization required' using errcode='42501';
  end if;
  select * into d from public.drafts where id=target_draft for update;
  if d.id is null or d.status <> 'SETUP' then
    raise exception 'Draft order can only be changed during setup';
  end if;
  select count(*) into team_count
  from public.team_seasons ts join public.teams t on t.id=ts.team_id
  where ts.season_id=d.season_id and t.is_active;
  if team_count < 2 or coalesce(array_length(ordered_teams,1),0) <> team_count*d.rounds then
    raise exception 'Order must contain every participating team in each round';
  end if;
  if exists (
    select 1 from unnest(ordered_teams) with ordinality selected(team_id, pick_no)
    left join public.team_seasons ts on ts.season_id=d.season_id and ts.team_id=selected.team_id
    left join public.teams t on t.id=selected.team_id and t.is_active
    where ts.id is null or t.id is null
  ) then
    raise exception 'Draft order contains a team outside the playable season';
  end if;
  if exists (
    select 1 from unnest(ordered_teams) with ordinality selected(team_id,pick_no)
    group by ((selected.pick_no-1)/team_count), selected.team_id
    having count(*) <> 1
  ) then
    raise exception 'Each participating team must appear exactly once per round';
  end if;
  delete from public.draft_order where draft_id=target_draft;
  for pick_index in 1..array_length(ordered_teams,1) loop
    insert into public.draft_order(draft_id,pick_number,round_number,team_id)
    values (target_draft,pick_index,((pick_index-1)/team_count)+1,ordered_teams[pick_index]);
  end loop;
  insert into public.audit_logs(user_id,action,details)
  values ((select auth.uid()),'SEASON_DRAFT_ORDER_CONFIGURED',
    jsonb_build_object('draft_id',target_draft,'picks',array_length(ordered_teams,1))::text);
end;
$$;
revoke all on function public.configure_draft_order(uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.configure_draft_order(uuid,uuid[]) to authenticated;

create or replace function public.manage_draft_clock(
  target_draft uuid, target_action text, target_extension_seconds integer default 0
)
returns public.drafts language plpgsql security definer set search_path = ''
as $$
declare
  d public.drafts;
  remaining integer;
  blockers jsonb;
begin
  if (select auth.uid()) is null or not public.is_staff_or_admin() then
    raise exception 'Only league staff may control the season draft clock' using errcode='42501';
  end if;
  select * into d from public.drafts where id=target_draft for update;
  if d.id is null then raise exception 'Draft not found'; end if;
  if target_action='OPEN' then
    if d.status <> 'SETUP' or d.current_pick <> 1 then
      raise exception 'Only a new setup draft may be opened';
    end if;
    blockers := private.inspect_season_draft_readiness(target_draft);
    if jsonb_array_length(blockers) > 0 then
      raise exception 'Draft cannot open: %', blockers::text using errcode='P0001';
    end if;
    update public.drafts set status='OPEN', clock_started_at=now(),
      clock_deadline_at=now()+make_interval(secs=>d.clock_duration_seconds),
      clock_remaining_seconds=null where id=target_draft;
  elsif target_action='RESUME' then
    if d.status <> 'PAUSED' then raise exception 'Only a paused draft may resume'; end if;
    remaining := greatest(1,coalesce(d.clock_remaining_seconds,d.clock_duration_seconds));
    update public.drafts set status='OPEN',clock_started_at=now(),
      clock_deadline_at=now()+make_interval(secs=>remaining),
      clock_remaining_seconds=null where id=target_draft;
  elsif target_action='PAUSE' then
    if d.status <> 'OPEN' then raise exception 'Only an open draft may pause'; end if;
    remaining := greatest(0,ceil(extract(epoch from(coalesce(d.clock_deadline_at,now())-now())))::integer);
    update public.drafts set status='PAUSED', clock_remaining_seconds=remaining,
      clock_started_at=null,clock_deadline_at=null where id=target_draft;
  elsif target_action='EXTEND' then
    if d.status <> 'OPEN' or target_extension_seconds not between 1 and 900 then
      raise exception 'Only an open draft can receive a 1–900 second extension';
    end if;
    update public.drafts set clock_deadline_at=greatest(coalesce(clock_deadline_at,now()),now())
      +make_interval(secs=>target_extension_seconds) where id=target_draft;
  elsif target_action='COMPLETE' then
    if d.status not in ('OPEN','PAUSED') then raise exception 'Only an active draft may be completed'; end if;
    update public.drafts set status='COMPLETED',clock_started_at=null,
      clock_deadline_at=null,clock_remaining_seconds=null where id=target_draft;
  else raise exception 'Unknown draft clock action'; end if;
  select * into d from public.drafts where id=target_draft;
  insert into public.audit_logs(user_id,action,details)
  values ((select auth.uid()),'SEASON_DRAFT_CLOCK_CHANGED',
    jsonb_build_object('draft_id',target_draft,'action',target_action)::text);
  return d;
end;
$$;
revoke all on function public.manage_draft_clock(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.manage_draft_clock(uuid,text,integer) to authenticated;
