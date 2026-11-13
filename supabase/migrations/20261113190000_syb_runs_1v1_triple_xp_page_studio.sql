begin;

-- Keep the old direct XP check-in RPC disabled; official Runs check-ins use host codes.
revoke all on function public.check_in_to_run(uuid) from public,anon,authenticated;

alter table public.rch_runs_partners
  add column if not exists page_settings jsonb not null default '{}'::jsonb;
alter table public.rch_runs_partners
  drop constraint if exists rch_runs_partners_page_settings_object;
alter table public.rch_runs_partners
  add constraint rch_runs_partners_page_settings_object
  check (jsonb_typeof(page_settings)='object');

alter table public.rch_runs_partners
  drop constraint if exists rch_runs_partners_reward_multiplier_check;
alter table public.rch_runs_partners
  add constraint rch_runs_partners_reward_multiplier_check
  check (reward_multiplier in (1,2,3));
alter table public.rch_runs_partner_sessions
  drop constraint if exists rch_runs_partner_sessions_reward_multiplier_check;
alter table public.rch_runs_partner_sessions
  add constraint rch_runs_partner_sessions_reward_multiplier_check
  check (reward_multiplier in (1,2,3));

-- A verified SYB event earns triple eligible Run XP/REP. Existing SYB events
-- are upgraded too, so all of the org's existing event records share the rule.
update public.rch_runs_partners
set reward_multiplier=3,
    page_settings=case when page_settings='{}'::jsonb then jsonb_build_object(
      'eyebrow','OFFICIAL RUNS PARTNER · RVA 1V1 CIRCUIT',
      'headline','Every matchup has a story.',
      'subheadline','The talk. The records. The moment the ball goes up.',
      'hero_image_url','',
      'featured_video_url','https://www.youtube.com/watch?v=ir8I6M2MXqk',
      'featured_video_label','CARI VS WICK',
      'cta_label','Explore the circuit',
      'show_schedule',true,
      'show_leaderboard',true,
      'show_video',true,
      'show_results',true,
      'callout_title','ONE COURT. EVERY RECORD.',
      'callout_body','Follow the official SYB 1v1 circuit, see verified records, and bring your next matchup to the floor.'
    ) else page_settings end,
    updated_at=now()
where slug='syb-hoop-richmond';

update public.rch_runs_partner_sessions s
set reward_multiplier=3
from public.rch_runs_partners p
where p.id=s.partner_id
  and p.slug='syb-hoop-richmond'
  and s.reward_multiplier<>3;

-- Partner rewards take precedence over the weekend double: SYB events remain
-- 3x, while non-partner weekend events keep their existing 2x multiplier.
create or replace function public.rch_partner_reward_multiplier(p_run uuid)
returns integer language sql stable security definer set search_path='' as $$
  select coalesce((
    select s.reward_multiplier::integer
    from public.rch_runs_partner_sessions s
    join public.rch_runs_partners p on p.id=s.partner_id
    join public.runs r on r.id=s.run_id
    where s.run_id=p_run
      and p.status='approved'
      and r.run_type='competitive'
      and r.status<>'cancelled'
    limit 1
  ),1)
$$;
revoke all on function public.rch_partner_reward_multiplier(uuid) from public,anon,authenticated;

create or replace function public.rch_is_partner_reward_eligible(p_run uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select public.rch_partner_reward_multiplier(p_run)>1
$$;

drop function if exists public.rch_review_runs_partner(uuid,text,text,smallint);
create function public.rch_review_runs_partner(
 p_partner uuid,p_decision text,p_note text,p_reward_multiplier smallint default 1
) returns void language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();p public.rch_runs_partners%rowtype;
begin
 if a is null or not coalesce(public.is_staff_or_admin(),false)
 then raise exception 'RCH operations staff only'; end if;
 if p_decision not in ('approved','declined','suspended')
    or char_length(trim(coalesce(p_note,''))) not between 8 and 500
    or p_reward_multiplier not in (1,2,3)
 then raise exception 'Choose a valid decision, review note and 1x, 2x or 3x reward multiplier'; end if;
 select * into p from public.rch_runs_partners where id=p_partner for update;
 if p.id is null then raise exception 'Partner not found'; end if;
 if p.owner_id=a then raise exception 'You cannot approve your own organization'; end if;
 update public.rch_runs_partners
 set status=p_decision,
     reward_multiplier=case when p_decision='approved'
       then case when p.slug='syb-hoop-richmond' then 3 else p_reward_multiplier end
       else 1 end,
     review_note=trim(p_note),reviewed_by=a,reviewed_at=now(),updated_at=now()
 where id=p_partner;
end $$;
revoke all on function public.rch_review_runs_partner(uuid,text,text,smallint) from public,anon,authenticated;
grant execute on function public.rch_review_runs_partner(uuid,text,text,smallint) to authenticated;

-- Approved partner managers can prepare every official event roster and
-- start its courtside board. Scorekeeper-only members retain scoring access
-- through can_operate_run_game but cannot reconfigure the game.
create or replace function public.can_manage_run_roster(target_run uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(public.can_manage_run(target_run),false)
    or exists(
      select 1
      from public.rch_runs_partner_sessions s
      join public.rch_runs_partners p on p.id=s.partner_id and p.status='approved'
      join public.rch_runs_partner_members m
        on m.partner_id=p.id and m.role='manager'
      where s.run_id=target_run
        and m.profile_id=(select auth.uid())
    )
$$;
revoke all on function public.can_manage_run_roster(uuid) from public,anon;
grant execute on function public.can_manage_run_roster(uuid) to authenticated;

-- Partner managers can see the independent review state for their own official
-- events. Public users still see verified rows only; players can confirm only
-- their own side through review_ranked_run_result.
drop policy if exists "approved partner managers read ranked run results" on public.run_ranked_matches;
create policy "approved partner managers read ranked run results"
  on public.run_ranked_matches for select to authenticated
  using (exists(
    select 1
    from public.rch_runs_partner_sessions s
    join public.rch_runs_partners p on p.id=s.partner_id and p.status='approved'
    join public.rch_runs_partner_members pm
      on pm.partner_id=p.id and pm.profile_id=(select auth.uid()) and pm.role='manager'
    where s.run_id=run_ranked_matches.run_id
  ));

create or replace function public.submit_ranked_run_result(p_game uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  v_game public.run_games%rowtype;
  v_run public.runs%rowtype;
  v_size integer;
  v_home uuid[];
  v_away uuid[];
  v_id uuid;
begin
  if v_actor is null then raise exception 'Sign in to submit a result'; end if;
  select * into v_game from public.run_games where id=p_game for update;
  if not found then raise exception 'Game not found'; end if;
  select * into v_run from public.runs where id=v_game.run_id;
  if not public.can_manage_run_roster(v_run.id) then
    raise exception 'Only the run host, approved partner manager or RCH staff can submit game results';
  end if;
  if v_run.run_type<>'competitive' or v_run.status='cancelled'
     or v_run.game_format not in ('1v1','2v2','3v3','4v4','5v5') then
    raise exception 'Only structured 1v1–5v5 competitive runs are rated';
  end if;
  if v_game.status<>'completed' or v_game.home_score=v_game.away_score
     or v_run.starts_at>now() or v_run.starts_at<now()-interval '14 days' then
    raise exception 'Complete a non-tied game within 14 days of the run';
  end if;
  v_size:=split_part(v_run.game_format,'v',1)::integer;
  select array_agg(m.profile_id order by m.profile_id) into v_home
    from public.run_team_members m where m.run_id=v_run.id and m.run_team_id=v_game.home_run_team_id;
  select array_agg(m.profile_id order by m.profile_id) into v_away
    from public.run_team_members m where m.run_id=v_run.id and m.run_team_id=v_game.away_run_team_id;
  if coalesce(array_length(v_home,1),0)<>v_size or coalesce(array_length(v_away,1),0)<>v_size then
    raise exception 'Both teams need exactly % assigned players before submitting',v_size;
  end if;
  if (select count(*) from public.run_checkins c
      where c.run_id=v_run.id and c.profile_id=any(v_home))<>v_size
    or (select count(*) from public.run_checkins c
      where c.run_id=v_run.id and c.profile_id=any(v_away))<>v_size then
    raise exception 'Each rostered player must check in before the result can be rated';
  end if;
  if exists(select 1 from public.run_ranked_matches m
      where m.run_id=v_run.id and m.status='verified'
        and m.home_team_id in (v_game.home_run_team_id,v_game.away_run_team_id)
        and m.away_team_id in (v_game.home_run_team_id,v_game.away_run_team_id)
      group by m.run_id having count(*)>=3) then
    raise exception 'At most three games between these teams per run can affect ratings';
  end if;
  insert into public.run_ranked_matches(
    game_id,run_id,game_format,home_team_id,away_team_id,home_score,away_score,home_roster,away_roster,submitted_by
  ) values (
    p_game,v_run.id,v_run.game_format,v_game.home_run_team_id,v_game.away_run_team_id,
    v_game.home_score,v_game.away_score,v_home,v_away,v_actor
  )
  on conflict (game_id) do update set
    home_score=excluded.home_score,away_score=excluded.away_score,
    home_roster=excluded.home_roster,away_roster=excluded.away_roster,
    status='pending',home_confirmed_by=null,away_confirmed_by=null,
    submitted_by=excluded.submitted_by,submitted_at=now(),rejected_at=null
    where public.run_ranked_matches.status='rejected'
  returning id into v_id;
  if v_id is null then raise exception 'This game already has an open or verified review'; end if;
  return v_id;
end $$;

drop policy if exists "run hosts manage teams" on public.run_teams;
create policy "run hosts and partner managers manage teams"
  on public.run_teams for all to authenticated
  using (public.can_manage_run_roster(run_id))
  with check (public.can_manage_run_roster(run_id));
drop policy if exists "run hosts manage team members" on public.run_team_members;
create policy "run hosts and partner managers manage team members"
  on public.run_team_members for all to authenticated
  using (public.can_manage_run_roster(run_id))
  with check (public.can_manage_run_roster(run_id));

create or replace function public.rch_start_run_game(
  p_run uuid,p_home_team uuid,p_away_team uuid,p_target_score integer default 11,
  p_scoring_profile text default 'one_two_three'
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r public.runs%rowtype; gid uuid;
begin
  if actor is null then raise exception 'Sign in to start a game'; end if;
  if not public.can_manage_run_roster(p_run) then raise exception 'Only the run host, approved partner manager or RCH staff can start a game'; end if;
  if p_home_team is null or p_away_team is null or p_home_team=p_away_team then
    raise exception 'Choose two different teams';
  end if;
  if p_target_score not between 1 and 250 then raise exception 'Choose a target score from 1 to 250'; end if;
  if p_scoring_profile not in ('one_two_three','two_three') then raise exception 'Choose a supported scoring profile'; end if;
  select * into r from public.runs where id=p_run for update;
  if not found or r.status not in ('open','full') then raise exception 'This Run is not available for a new game'; end if;
  if now()<r.starts_at-interval '2 hours' or now()>r.starts_at+interval '6 hours' then
    raise exception 'Game mode opens two hours before the Run and closes six hours after it starts';
  end if;
  if not exists(select 1 from public.run_teams t where t.id=p_home_team and t.run_id=p_run)
     or not exists(select 1 from public.run_teams t where t.id=p_away_team and t.run_id=p_run) then
    raise exception 'Both teams must belong to this Run';
  end if;
  if not exists(select 1 from public.run_team_members m where m.run_id=p_run and m.run_team_id=p_home_team)
     or not exists(select 1 from public.run_team_members m where m.run_id=p_run and m.run_team_id=p_away_team) then
    raise exception 'Assign at least one registered player to each team before starting';
  end if;
  if r.game_format='1v1' and (
    (select count(*) from public.run_team_members m where m.run_id=p_run and m.run_team_id=p_home_team)<>1
    or (select count(*) from public.run_team_members m where m.run_id=p_run and m.run_team_id=p_away_team)<>1
  ) then
    raise exception 'A 1v1 scoreboard needs exactly one player assigned to each side';
  end if;
  if exists(select 1 from public.run_games g where g.run_id=p_run and g.status='live'
    and (g.home_run_team_id in (p_home_team,p_away_team) or g.away_run_team_id in (p_home_team,p_away_team))) then
    raise exception 'One of these teams already has a live game';
  end if;
  insert into public.run_games(run_id,home_run_team_id,away_run_team_id,status,created_by,target_score,scoring_profile,started_at)
  values(p_run,p_home_team,p_away_team,'live',actor,p_target_score,p_scoring_profile,now()) returning id into gid;
  return gid;
end $$;

create or replace function public.rch_record_run_game_action(
  p_game uuid,p_action text,p_team uuid default null,p_player uuid default null,
  p_score integer default null,p_stat text default null,p_undo uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); g public.run_games%rowtype; action_id uuid; v_seq bigint;
  prior public.run_game_actions%rowtype; current_last uuid; next_score integer;
begin
  if actor is null then raise exception 'Sign in before recording game action'; end if;
  select * into g from public.run_games where id=p_game for update;
  if not found then raise exception 'Game not found'; end if;
  if not public.can_operate_run_game(g.run_id) then raise exception 'Only the host, RCH staff, or an assigned scorekeeper can operate the scoreboard'; end if;
  if g.status<>'live' then raise exception 'This game is not live'; end if;

  if p_action='score' then
    if g.home_score>=g.target_score or g.away_score>=g.target_score then
      raise exception 'A side reached the target. Finalize this game before recording another score';
    end if;
    if p_team not in (g.home_run_team_id,g.away_run_team_id) or p_player is null or p_score not in (1,2,3) then
      raise exception 'Choose the scoring team, player, and a valid basket value';
    end if;
    if p_score=1 and g.scoring_profile='two_three' then raise exception 'This Run uses two- and three-point baskets'; end if;
    if not exists(select 1 from public.run_team_members m where m.run_id=g.run_id and m.run_team_id=p_team and m.profile_id=p_player) then
      raise exception 'Scoring player must be assigned to that team';
    end if;
    if p_team=g.home_run_team_id then next_score:=g.home_score+p_score;
      update public.run_games set home_score=next_score,action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
    else next_score:=g.away_score+p_score;
      update public.run_games set away_score=next_score,action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
    end if;
    insert into public.run_game_actions(game_id,run_id,sequence_no,action_type,team_id,player_id,score_value,created_by)
    values(g.id,g.run_id,v_seq,'score',p_team,p_player,p_score,actor) returning id into action_id;
    return action_id;
  elsif p_action='stat' then
    if p_team not in (g.home_run_team_id,g.away_run_team_id) or p_player is null
      or p_stat not in ('rebound','assist','steal','block','turnover','defensive_stop','three_attempted') then
      raise exception 'Choose a rostered player and a supported stat';
    end if;
    if not exists(select 1 from public.run_team_members m where m.run_id=g.run_id and m.run_team_id=p_team and m.profile_id=p_player) then
      raise exception 'Stat player must be assigned to that team';
    end if;
    update public.run_games set action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
    insert into public.run_game_actions(game_id,run_id,sequence_no,action_type,team_id,player_id,stat_type,created_by)
    values(g.id,g.run_id,v_seq,'stat',p_team,p_player,p_stat,actor) returning id into action_id;
    return action_id;
  elsif p_action='undo' then
    if p_undo is null then raise exception 'Choose the last action to undo'; end if;
    select * into prior from public.run_game_actions a
      where a.id=p_undo and a.game_id=g.id and a.action_type in ('score','stat') for update;
    if not found or exists(select 1 from public.run_game_actions u where u.undoes_action_id=p_undo) then
      raise exception 'This action can no longer be undone';
    end if;
    select a.id into current_last from public.run_game_actions a
      where a.game_id=g.id and a.action_type in ('score','stat')
        and not exists(select 1 from public.run_game_actions u where u.undoes_action_id=a.id)
      order by a.sequence_no desc limit 1;
    if current_last is distinct from p_undo then raise exception 'Undo the most recent game action first'; end if;
    if prior.action_type='score' then
      if prior.team_id=g.home_run_team_id then
        update public.run_games set home_score=greatest(0,home_score-prior.score_value),action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
      else update public.run_games set away_score=greatest(0,away_score-prior.score_value),action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
      end if;
    else
      update public.run_games set action_sequence=action_sequence+1 where id=g.id returning action_sequence into v_seq;
    end if;
    insert into public.run_game_actions(game_id,run_id,sequence_no,action_type,undoes_action_id,created_by)
    values(g.id,g.run_id,v_seq,'undo',p_undo,actor) returning id into action_id;
    return action_id;
  end if;
  raise exception 'Choose score, stat, or undo';
end $$;

alter table public.rch_run_stat_rewards
  drop constraint if exists rch_run_stat_rewards_rep_bonus_check;
alter table public.rch_run_stat_rewards
  add constraint rch_run_stat_rewards_rep_bonus_check check(rep_bonus between 0 and 90);

create or replace function public.rch_weekend_double_verified_game()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_run uuid;v_multiplier integer;
begin
 select m.run_id into v_run from public.run_ranked_matches m where m.id=new.match_id;
 v_multiplier:=greatest(
  case when public.rch_is_weekend_bonus_eligible(v_run) then 2 else 1 end,
  public.rch_partner_reward_multiplier(v_run)
 );
 if v_multiplier>1 then new.rep:=new.rep*v_multiplier; end if;
 return new;
end $$;

create or replace function public.rch_weekend_double_reviewed_stats()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_run uuid;v_multiplier integer;
begin
 select s.run_id into v_run from public.run_competitive_box_scores s where s.id=new.submission_id;
 v_multiplier:=greatest(
  case when public.rch_is_weekend_bonus_eligible(v_run) then 2 else 1 end,
  public.rch_partner_reward_multiplier(v_run)
 );
 if v_multiplier>1 then new.rep_bonus:=new.rep_bonus*v_multiplier; end if;
 return new;
end $$;

create or replace function public.check_in_to_run(p_run uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare
 actor uuid:=auth.uid(); r public.runs%rowtype; checkin_id uuid; awarded boolean;
 v_reward integer:=15; v_multiplier integer;
begin
  if actor is null then raise exception 'Sign in to check in'; end if;
  select * into r from public.runs where id=p_run;
  if r.id is null or r.status='cancelled' then raise exception 'Run is unavailable'; end if;
  if now() < r.starts_at - interval '2 hours' or now() > r.starts_at + interval '6 hours' then
    raise exception 'Check-in opens 2 hours before the run and closes 6 hours after start';
  end if;
  if not r.allow_fan_checkin and actor<>r.host_id and not exists(select 1 from public.run_players rp where rp.run_id=p_run and rp.profile_id=actor) then
    raise exception 'This run only allows participant check-ins';
  end if;
  insert into public.run_checkins(run_id,profile_id) values(p_run,actor)
    on conflict(run_id,profile_id) do update set checked_in_at=public.run_checkins.checked_in_at
    returning id into checkin_id;
  v_multiplier:=greatest(
    public.rch_partner_reward_multiplier(p_run),
    case when public.rch_is_weekend_bonus_eligible(p_run) then 2 else 1 end
  );
  v_reward:=v_reward*v_multiplier;
  awarded:=public.award_run_rep(actor,v_reward,'run_checkin','run_checkin',checkin_id);
  perform public.unlock_run_badges(actor);
  return case when awarded then v_reward else 0 end;
end $$;
revoke all on function public.check_in_to_run(uuid) from public,anon,authenticated;

create or replace function public.claim_latest_run_highlight(p_run uuid)
returns table(rep_awarded integer,post_id uuid) language plpgsql security definer set search_path=public as $$
declare
  actor uuid:=auth.uid(); r public.runs%rowtype; chosen uuid; claim_id uuid;
  awarded boolean; v_reward integer:=35; v_multiplier integer;
begin
  if actor is null then raise exception 'Sign in to claim a highlight'; end if;
  select * into r from public.runs where id=p_run;
  if r.id is null then raise exception 'Run not found'; end if;
  if actor<>r.host_id and not exists(select 1 from public.run_players rp where rp.run_id=p_run and rp.profile_id=actor) then
    raise exception 'Join the run before claiming a player highlight';
  end if;
  if exists(select 1 from public.run_highlight_claims h where h.run_id=p_run and h.profile_id=actor) then
    return query select 0::integer,h.post_id from public.run_highlight_claims h where h.run_id=p_run and h.profile_id=actor order by h.created_at desc limit 1;
    return;
  end if;
  select p.id into chosen
    from public.posts p
    where p.author_id=actor
      and p.status='published'
      and p.run_id=p_run
      and jsonb_typeof(p.media_urls)='array'
      and jsonb_array_length(p.media_urls)>0
      and p.created_at between r.starts_at - interval '2 hours' and r.starts_at + interval '72 hours'
    order by p.created_at desc
    limit 1;
  if chosen is null then raise exception 'Post a photo or video from this Run first'; end if;
  insert into public.run_highlight_claims(run_id,profile_id,post_id)
  values(p_run,actor,chosen)
  returning id into claim_id;
  v_multiplier:=greatest(
    public.rch_partner_reward_multiplier(p_run),
    case when public.rch_is_weekend_bonus_eligible(p_run) then 2 else 1 end
  );
  v_reward:=v_reward*v_multiplier;
  awarded:=public.award_run_rep(actor,v_reward,'run_highlight','run_highlight',claim_id);
  perform public.unlock_run_badges(actor);
  return query select case when awarded then v_reward else 0 end,chosen;
end $$;

create or replace function public.rch_update_runs_partner_page(
 p_partner uuid,p_settings jsonb
) returns void language plpgsql security definer set search_path='' as $$
declare
 a uuid:=auth.uid(); p public.rch_runs_partners%rowtype; v_settings jsonb;
begin
 if a is null then raise exception 'Sign in'; end if;
 select * into p from public.rch_runs_partners where id=p_partner for update;
 if p.id is null or not (
   p.owner_id=a or exists(select 1 from public.rch_runs_partner_members m
      where m.partner_id=p.id and m.profile_id=a and m.role='manager')
 ) then raise exception 'Partner management access required'; end if;
 if jsonb_typeof(p_settings) is distinct from 'object'
    or jsonb_typeof(p_settings->'eyebrow') is distinct from 'string'
    or jsonb_typeof(p_settings->'headline') is distinct from 'string'
    or jsonb_typeof(p_settings->'subheadline') is distinct from 'string'
    or jsonb_typeof(p_settings->'hero_image_url') is distinct from 'string'
    or jsonb_typeof(p_settings->'featured_video_url') is distinct from 'string'
    or jsonb_typeof(p_settings->'featured_video_label') is distinct from 'string'
    or jsonb_typeof(p_settings->'cta_label') is distinct from 'string'
    or jsonb_typeof(p_settings->'show_schedule') is distinct from 'boolean'
    or jsonb_typeof(p_settings->'show_leaderboard') is distinct from 'boolean'
    or jsonb_typeof(p_settings->'show_video') is distinct from 'boolean'
    or jsonb_typeof(p_settings->'show_results') is distinct from 'boolean'
    or jsonb_typeof(p_settings->'callout_title') is distinct from 'string'
    or jsonb_typeof(p_settings->'callout_body') is distinct from 'string'
 then raise exception 'Page settings are incomplete or invalid'; end if;
 if length(p_settings->>'eyebrow')>100
    or length(p_settings->>'headline') not between 3 and 100
    or length(p_settings->>'subheadline')>280
    or length(p_settings->>'hero_image_url')>2048
    or length(p_settings->>'featured_video_url')>300
    or length(p_settings->>'featured_video_label')>60
    or length(p_settings->>'cta_label')>40
    or length(p_settings->>'callout_title')>80
    or length(p_settings->>'callout_body')>300
 then raise exception 'One or more page fields are too long'; end if;
 if p_settings->>'hero_image_url'<>'' and p_settings->>'hero_image_url' !~* '^https://[^[:space:]]+$'
 then raise exception 'Banner images must use an HTTPS URL'; end if;
 if p_settings->>'featured_video_url'<>'' and p_settings->>'featured_video_url' !~* '^https://(www[.]youtube[.]com|youtube[.]com|m[.]youtube[.]com|youtu[.]be|youtube-nocookie[.]com)/[^[:space:]]+$'
 then raise exception 'Featured videos must use a supported YouTube URL'; end if;
 v_settings:=jsonb_build_object(
   'eyebrow',trim(p_settings->>'eyebrow'),
   'headline',trim(p_settings->>'headline'),
   'subheadline',trim(p_settings->>'subheadline'),
   'hero_image_url',trim(p_settings->>'hero_image_url'),
   'featured_video_url',trim(p_settings->>'featured_video_url'),
   'featured_video_label',trim(p_settings->>'featured_video_label'),
   'cta_label',trim(p_settings->>'cta_label'),
   'show_schedule',(p_settings->>'show_schedule')::boolean,
   'show_leaderboard',(p_settings->>'show_leaderboard')::boolean,
   'show_video',(p_settings->>'show_video')::boolean,
   'show_results',(p_settings->>'show_results')::boolean,
   'callout_title',trim(p_settings->>'callout_title'),
   'callout_body',trim(p_settings->>'callout_body')
 );
 update public.rch_runs_partners set page_settings=v_settings,updated_at=now() where id=p_partner;
end $$;
revoke all on function public.rch_update_runs_partner_page(uuid,jsonb) from public,anon;
revoke all on function public.rch_update_runs_partner_page(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.rch_update_runs_partner_page(uuid,jsonb) to authenticated;

create or replace function public.rch_runs_partner_public_stats(p_partner uuid)
returns jsonb language sql stable security definer set search_path='' as $$
with partner_row as (
 select p.id from public.rch_runs_partners p where p.id=p_partner and p.status='approved'
), partner_sessions as (
 select s.run_id,r.starts_at,r.status,r.game_format
 from public.rch_runs_partner_sessions s
 join public.runs r on r.id=s.run_id
 join partner_row p on p.id=s.partner_id
 where r.status<>'cancelled'
), verified_matches as (
 select m.id,m.run_id,m.home_score,m.away_score,m.verified_at
 from public.run_ranked_matches m
 join partner_sessions s on s.run_id=m.run_id and s.game_format='1v1'
 where m.status='verified' and m.game_format='1v1'
), player_lines as (
 select mp.profile_id,mp.side,
   (case when mp.side='home' then m.home_score>m.away_score else m.away_score>m.home_score end) as won,
   case when mp.side='home' then m.home_score else m.away_score end as points_for,
   case when mp.side='home' then m.away_score else m.home_score end as points_against,
   m.verified_at
 from verified_matches m
 join public.run_ranked_match_players mp on mp.match_id=m.id
 where mp.side in ('home','away')
), public_players as (
 select p.id as profile_id,
   coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player') as player_name,
   nullif(p.username::text,'') as username,p.avatar_url
 from public.profiles p
 where p.is_active=true and not coalesce(p.is_system_account,false)
   and p.profile_visibility='public'
), player_totals as (
 select l.profile_id,pp.player_name,pp.username,pp.avatar_url,
   count(*)::integer as games,
   count(*) filter(where l.won)::integer as wins,
   count(*) filter(where not l.won)::integer as losses,
   coalesce(sum(l.points_for),0)::integer as points_for,
   coalesce(sum(l.points_against),0)::integer as points_against,
   round(100*count(*) filter(where l.won)::numeric/nullif(count(*),0),1) as win_pct,
   max(l.verified_at) as latest_match_at
 from player_lines l
 join public_players pp on pp.profile_id=l.profile_id
 group by l.profile_id,pp.player_name,pp.username,pp.avatar_url
), ranked as (
 select row_number() over(order by wins desc,win_pct desc,(points_for-points_against) desc,games desc,profile_id) as placement,
   profile_id,player_name,username,avatar_url,games,wins,losses,points_for,points_against,win_pct,latest_match_at
 from player_totals
)
select case when not exists(select 1 from partner_row) then null::jsonb else
 jsonb_build_object(
   'events',(select count(*)::integer from partner_sessions),
   'upcoming_events',(select count(*)::integer from partner_sessions s where s.starts_at>now() and s.status in ('open','full')),
   'verified_matchups',(select count(*)::integer from verified_matches),
   'ranked_players',(select count(*)::integer from player_totals),
   'leaderboard',(select coalesce(jsonb_agg(jsonb_build_object(
     'rank',b.placement,'profile_id',b.profile_id,'player_name',b.player_name,'username',b.username,'avatar_url',b.avatar_url,
     'games',b.games,'wins',b.wins,'losses',b.losses,'points_for',b.points_for,'points_against',b.points_against,
     'win_pct',b.win_pct,'latest_match_at',b.latest_match_at
   ) order by b.placement),'[]'::jsonb) from (select * from ranked order by placement limit 25) b)
 )
end
$$;
revoke all on function public.rch_runs_partner_public_stats(uuid) from public;
revoke all on function public.rch_runs_partner_public_stats(uuid) from public,anon,authenticated;
grant execute on function public.rch_runs_partner_public_stats(uuid) to anon,authenticated;

commit;
