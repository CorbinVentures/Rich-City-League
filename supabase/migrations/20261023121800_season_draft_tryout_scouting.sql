-- Official tryout scouting is visible only to league staff and coaches
-- assigned to a team in this specific playable season.
-- Never expose raw notes, behavioral labels, or per-evaluator assessments.
create or replace function public.season_draft_scouting(target_draft uuid)
returns table(player_id uuid, evaluation_count integer, average_evaluation numeric)
language plpgsql stable security definer set search_path = ''
as $$
declare
  draft_season uuid;
  caller uuid := (select auth.uid());
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select d.season_id into draft_season from public.drafts d
  where d.id=target_draft and d.status in ('SETUP','OPEN','PAUSED');
  if draft_season is null then
    raise exception 'No editable or active official draft found';
  end if;
  if not public.is_staff_or_admin() and not exists (
    select 1 from public.team_coaches tc
    join public.team_seasons ts on ts.team_id=tc.team_id
    join public.teams t on t.id=ts.team_id and t.is_active
    where tc.profile_id=caller and ts.season_id=draft_season
  ) then
    raise exception 'Assigned league coaches or staff only' using errcode='42501';
  end if;

  return query
  select e.player_id,
    count(distinct e.evaluator_id)::integer,
    round(avg(e.evaluation_score),1)
  from public.player_evaluations e
  join public.tryout_sessions s on s.id=e.session_id and s.season_id=draft_season
  join public.draft_pools pool on pool.season_id=draft_season
    and pool.player_id=e.player_id and pool.eligible
  join public.players p on p.id=e.player_id and p.is_active
  group by e.player_id;
end;
$$;
revoke all on function public.season_draft_scouting(uuid) from public,anon,authenticated;
grant execute on function public.season_draft_scouting(uuid) to authenticated;
