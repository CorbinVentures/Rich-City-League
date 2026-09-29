begin;

-- RCL Basketball OS: shared engagement, live-game, identity, legacy, media and coaching layer.

alter table public.xp_transactions add column if not exists rep_dimension text;

create or replace function public.infer_rep_dimension(reason_name text, source_name text)
returns text language sql immutable as $$
  select case
    when coalesce(source_name,'') in ('game','player_game_stats','lab_session','performance','player_card')
      or coalesce(reason_name,'') ~* '(game|performance|workout|lab|player|stat|hoop)' then 'hooper'
    when coalesce(source_name,'') in ('post','media','highlight','story','news','editorial')
      or coalesce(reason_name,'') ~* '(content|creator|highlight|media|story|post)' then 'creator'
    when coalesce(source_name,'') in ('scouting_report','coaching','coach')
      or coalesce(reason_name,'') ~* '(coach|scout)' then 'coach'
    when coalesce(source_name,'') in ('run','run_checkin','attendance','reliability')
      or coalesce(reason_name,'') ~* '(run|attendance|reliab|check.?in)' then 'reliability'
    else 'community'
  end;
$$;

update public.xp_transactions
set rep_dimension = public.infer_rep_dimension(reason, source_type)
where rep_dimension is null;

create or replace function public.set_rep_dimension()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.rep_dimension is null or new.rep_dimension not in ('hooper','community','creator','coach','reliability') then
    new.rep_dimension := public.infer_rep_dimension(new.reason,new.source_type);
  end if;
  return new;
end $$;

drop trigger if exists set_rep_dimension_before_insert on public.xp_transactions;
create trigger set_rep_dimension_before_insert before insert on public.xp_transactions
for each row execute function public.set_rep_dimension();

create or replace function public.rep_status_label(target_level integer)
returns text language sql immutable as $$
  select case
    when greatest(target_level,1) >= 25 then 'Legend'
    when greatest(target_level,1) >= 16 then 'Elite'
    when greatest(target_level,1) >= 10 then 'All-City'
    when greatest(target_level,1) >= 6 then 'Starter'
    when greatest(target_level,1) >= 3 then 'Prospect'
    else 'Rookie'
  end;
$$;

create table public.weekly_missions (
  id uuid primary key default gen_random_uuid(),
  mission_key text not null unique,
  title text not null,
  description text not null,
  event_type text not null,
  rep_dimension text not null default 'community' check (rep_dimension in ('hooper','community','creator','coach','reliability')),
  target_count integer not null default 1 check (target_count > 0),
  reward_xp integer not null default 25 check (reward_xp >= 0),
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mission_progress (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.weekly_missions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null default date_trunc('week', now())::date,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  last_source_id uuid,
  updated_at timestamptz not null default now(),
  unique(mission_id,profile_id,week_start)
);

insert into public.weekly_missions(mission_key,title,description,event_type,rep_dimension,target_count,reward_xp,icon,sort_order)
values
  ('make_the_feed','Make the Feed','Publish 2 community posts this week.','post','creator',2,60,'📸',10),
  ('talk_hoops','Talk Hoops','Add 5 meaningful comments this week.','comment','community',5,45,'💬',20),
  ('put_in_work','Put In Work','Complete 2 sessions in The Lab this week.','lab_session','hooper',2,75,'🧪',30),
  ('show_up','Show Up','Check in to an RCL Run this week.','run_checkin','reliability',1,50,'📍',40),
  ('call_your_shot','Call Your Shot','Submit a Pick’em prediction this week.','pickem','community',1,35,'🎯',50),
  ('fan_vote','Have Your Say','Cast a Game Night MVP vote this week.','mvp_vote','community',1,25,'🗳️',60)
on conflict (mission_key) do update set
  title=excluded.title,description=excluded.description,event_type=excluded.event_type,
  rep_dimension=excluded.rep_dimension,target_count=excluded.target_count,reward_xp=excluded.reward_xp,
  icon=excluded.icon,sort_order=excluded.sort_order,is_active=true,updated_at=now();

create table public.game_reactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction_key text not null check (reaction_key in ('fire','wow','clutch','defense','bucket','crowd')),
  created_at timestamptz not null default now(),
  unique(game_id,profile_id,reaction_key)
);

create table public.game_chat_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 400),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.game_mvp_votes (
  game_id uuid not null references public.games(id) on delete cascade,
  voter_profile_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(game_id,voter_profile_id)
);

create table public.player_highlights (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  media_id uuid references public.media(id) on delete set null,
  game_id uuid references public.games(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  title text not null,
  category text not null default 'highlight' check (category in ('highlight','top_play','game_winner','ankle_breaker','block','dime','hustle','micd_up','interview')),
  clip_url text,
  thumbnail_url text,
  status text not null default 'published' check (status in ('draft','pending','published','rejected')),
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.player_cards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  edition text not null default 'base',
  title text,
  overall_rating integer not null check (overall_rating between 0 and 99),
  card_payload jsonb not null default '{}'::jsonb,
  image_url text,
  is_featured boolean not null default false,
  issued_at timestamptz not null default now(),
  unique(player_id,season_id,edition)
);

create table public.pickem_picks (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  selected_team_id uuid not null references public.teams(id) on delete cascade,
  predicted_home_score integer check (predicted_home_score between 0 and 250),
  predicted_away_score integer check (predicted_away_score between 0 and 250),
  points_earned integer not null default 0,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id,profile_id)
);

create table public.scouting_reports (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  target_team_id uuid references public.teams(id) on delete cascade,
  target_player_id uuid references public.players(id) on delete cascade,
  title text not null,
  report jsonb not null default '{}'::jsonb,
  notes text,
  visibility text not null default 'private' check (visibility in ('private','staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_team_id is not null or target_player_id is not null)
);

create table public.game_story_drafts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games(id) on delete cascade,
  headline text not null,
  summary text not null,
  story_body text,
  status text not null default 'draft' check (status in ('draft','approved','published')),
  metadata jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.basketball_connections (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  to_profile_id uuid not null references public.profiles(id) on delete cascade,
  relation_type text not null check (relation_type in ('teammate','former_teammate','coach','player','basketball_connection')),
  season_id uuid references public.seasons(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  source text not null default 'user',
  created_at timestamptz not null default now(),
  check (from_profile_id <> to_profile_id),
  unique(from_profile_id,to_profile_id,relation_type,season_id,team_id)
);

create table public.hall_of_fame_inductions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  class_year integer not null check (class_year between 2011 and 2200),
  category text not null default 'player',
  title text not null,
  citation text not null,
  image_url text,
  inducted_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.season_reputation_snapshots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  total_xp integer not null default 0,
  level integer not null default 1,
  hooper_xp integer not null default 0,
  community_xp integer not null default 0,
  creator_xp integer not null default 0,
  coach_xp integer not null default 0,
  reliability_xp integer not null default 0,
  final_rank integer,
  captured_at timestamptz not null default now(),
  unique(season_id,profile_id)
);

alter table public.notification_preferences add column if not exists games boolean not null default true;
alter table public.notification_preferences add column if not exists rep boolean not null default true;
alter table public.notification_preferences add column if not exists missions boolean not null default true;
alter table public.notification_preferences add column if not exists fantasy boolean not null default true;
alter table public.notification_preferences add column if not exists runs boolean not null default true;
alter table public.notification_preferences add column if not exists media boolean not null default true;
alter table public.notification_preferences add column if not exists lab boolean not null default true;
alter table public.notification_preferences add column if not exists pickem boolean not null default true;
alter table public.notification_preferences add column if not exists push_enabled boolean not null default true;

create or replace function public.record_mission_event(actor uuid, event_name text, source_uuid uuid default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if actor is null then return; end if;
  insert into public.mission_progress(mission_id,profile_id,week_start,progress,completed_at,last_source_id,updated_at)
  select m.id, actor, date_trunc('week',now())::date, 1,
         case when m.target_count <= 1 then now() else null end,
         source_uuid, now()
  from public.weekly_missions m
  where m.is_active and m.event_type=event_name
  on conflict (mission_id,profile_id,week_start) do update
    set progress=least(public.mission_progress.progress+1,(select target_count from public.weekly_missions where id=excluded.mission_id)),
        completed_at=case
          when public.mission_progress.completed_at is not null then public.mission_progress.completed_at
          when public.mission_progress.progress+1 >= (select target_count from public.weekly_missions where id=excluded.mission_id) then now()
          else null end,
        last_source_id=excluded.last_source_id,
        updated_at=now();
end $$;

create or replace function public.capture_mission_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; event_name text; source_uuid uuid;
begin
  if tg_table_name='posts' then
    if new.status::text <> 'published' then return new; end if;
    actor:=new.author_id; event_name:='post'; source_uuid:=new.id;
  elsif tg_table_name='comments' then actor:=new.author_id; event_name:='comment'; source_uuid:=new.id;
  elsif tg_table_name='run_checkins' then actor:=new.profile_id; event_name:='run_checkin'; source_uuid:=new.id;
  elsif tg_table_name='lab_sessions' then
    if new.status <> 'completed' or (tg_op='UPDATE' and old.status='completed') then return new; end if;
    actor:=new.profile_id; event_name:='lab_session'; source_uuid:=new.id;
  elsif tg_table_name='pickem_picks' then actor:=new.profile_id; event_name:='pickem'; source_uuid:=new.id;
  elsif tg_table_name='game_mvp_votes' then actor:=new.voter_profile_id; event_name:='mvp_vote'; source_uuid:=new.game_id;
  else return new; end if;
  perform public.record_mission_event(actor,event_name,source_uuid);
  return new;
end $$;

create or replace function public.claim_weekly_mission(target_mission uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid(); progress_row public.mission_progress%rowtype; mission_row public.weekly_missions%rowtype;
begin
  if me is null then raise exception 'Authentication required'; end if;
  select * into mission_row from public.weekly_missions where id=target_mission and is_active;
  if not found then raise exception 'Mission not found'; end if;
  select * into progress_row from public.mission_progress
    where mission_id=target_mission and profile_id=me and week_start=date_trunc('week',now())::date
    for update;
  if not found or progress_row.progress < mission_row.target_count then raise exception 'Mission incomplete'; end if;
  if progress_row.claimed_at is not null then return 0; end if;
  insert into public.user_levels(profile_id) values(me) on conflict do nothing;
  insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id,rep_dimension)
  values(me,mission_row.reward_xp,'weekly_mission','weekly_mission',progress_row.id,mission_row.rep_dimension);
  update public.user_levels set xp=xp+mission_row.reward_xp,level=public.level_for_xp(xp+mission_row.reward_xp),updated_at=now() where profile_id=me;
  update public.mission_progress set claimed_at=now(),updated_at=now() where id=progress_row.id;
  return mission_row.reward_xp;
end $$;

create or replace function public.create_game_story_draft()
returns trigger language plpgsql security definer set search_path=public as $$
declare home_name text; away_name text; winner_name text; loser_name text; winner_score integer; loser_score integer;
begin
  if new.status::text <> 'completed' or old.status::text='completed' then return new; end if;
  select name into home_name from public.teams where id=new.home_team_id;
  select name into away_name from public.teams where id=new.away_team_id;
  if new.home_score >= new.away_score then winner_name:=home_name; loser_name:=away_name; winner_score:=new.home_score; loser_score:=new.away_score;
  else winner_name:=away_name; loser_name:=home_name; winner_score:=new.away_score; loser_score:=new.home_score; end if;
  insert into public.game_story_drafts(game_id,headline,summary,story_body,metadata)
  values(new.id,
    winner_name||' defeats '||loser_name||', '||winner_score||'–'||loser_score,
    winner_name||' earned an official Rich City League win over '||loser_name||' by a final score of '||winner_score||'–'||loser_score||'.',
    'Final: '||winner_name||' '||winner_score||', '||loser_name||' '||loser_score||'. Official player leaders and turning points can be added by RCL staff before publication.',
    jsonb_build_object('home_score',new.home_score,'away_score',new.away_score,'generated_from','official_scorebook'))
  on conflict (game_id) do nothing;
  return new;
end $$;

drop trigger if exists mission_post_event on public.posts;
create trigger mission_post_event after insert on public.posts for each row execute function public.capture_mission_event();
drop trigger if exists mission_comment_event on public.comments;
create trigger mission_comment_event after insert on public.comments for each row execute function public.capture_mission_event();
drop trigger if exists mission_run_event on public.run_checkins;
create trigger mission_run_event after insert on public.run_checkins for each row execute function public.capture_mission_event();
drop trigger if exists mission_lab_event on public.lab_sessions;
create trigger mission_lab_event after insert or update of status on public.lab_sessions for each row execute function public.capture_mission_event();
drop trigger if exists mission_pickem_event on public.pickem_picks;
create trigger mission_pickem_event after insert on public.pickem_picks for each row execute function public.capture_mission_event();
drop trigger if exists mission_mvp_event on public.game_mvp_votes;
create trigger mission_mvp_event after insert on public.game_mvp_votes for each row execute function public.capture_mission_event();
drop trigger if exists auto_game_story_draft on public.games;
create trigger auto_game_story_draft after update of status on public.games for each row execute function public.create_game_story_draft();

create or replace view public.rep_dimension_summary with (security_invoker=true) as
select p.id as profile_id,
       coalesce(sum(x.amount),0)::integer as total_xp,
       coalesce(sum(x.amount) filter(where x.rep_dimension='hooper'),0)::integer as hooper_xp,
       coalesce(sum(x.amount) filter(where x.rep_dimension='community'),0)::integer as community_xp,
       coalesce(sum(x.amount) filter(where x.rep_dimension='creator'),0)::integer as creator_xp,
       coalesce(sum(x.amount) filter(where x.rep_dimension='coach'),0)::integer as coach_xp,
       coalesce(sum(x.amount) filter(where x.rep_dimension='reliability'),0)::integer as reliability_xp,
       coalesce(ul.level,1) as level,
       public.rep_status_label(coalesce(ul.level,1)) as status_label
from public.profiles p
left join public.xp_transactions x on x.profile_id=p.id
left join public.user_levels ul on ul.profile_id=p.id
group by p.id,ul.level;

create or replace view public.player_advanced_analytics with (security_invoker=true) as
select s.player_id,
       count(*)::integer as games_played,
       round(avg(s.points)::numeric,1) as ppg,
       round(avg(s.rebounds)::numeric,1) as rpg,
       round(avg(s.assists)::numeric,1) as apg,
       round(avg(s.steals)::numeric,1) as spg,
       round(avg(s.blocks)::numeric,1) as bpg,
       round(avg(s.plus_minus)::numeric,1) as avg_plus_minus,
       round((sum(s.assists)::numeric/nullif(sum(s.turnovers),0)),2) as assist_turnover_ratio,
       round((100*sum(s.points)::numeric/nullif(2*(sum(s.field_goals_attempted)+0.44*sum(s.free_throws_attempted)),0)),1) as true_shooting_pct,
       round((100*(sum(s.field_goals_made)+0.5*sum(s.three_pointers_made))::numeric/nullif(sum(s.field_goals_attempted),0)),1) as effective_fg_pct,
       round((100*sum(s.three_pointers_made)::numeric/nullif(sum(s.three_pointers_attempted),0)),1) as three_pct,
       round((100*sum(s.free_throws_made)::numeric/nullif(sum(s.free_throws_attempted),0)),1) as free_throw_pct
from public.player_game_stats s
group by s.player_id;

create or replace view public.player_passports with (security_invoker=true) as
select p.id as player_id,p.profile_id,p.first_name,p.last_name,p.jersey_number,p.position,p.height_inches,p.hometown,p.photo_url,p.is_active,
       coalesce(iq.rcl_rating,0) as rcl_rating,iq.player_archetype,iq.rating_trend,
       coalesce(a.games_played,0) as games_played,a.ppg,a.rpg,a.apg,a.spg,a.bpg,a.true_shooting_pct,a.assist_turnover_ratio,a.avg_plus_minus,
       (select count(*)::integer from public.player_badges pb where pb.player_id=p.id) as badge_count,
       (select count(*)::integer from public.awards aw where aw.player_id=p.id) as award_count,
       (select count(distinct ts.season_id)::integer from public.rosters r join public.team_seasons ts on ts.id=r.team_season_id where r.player_id=p.id) as seasons_played,
       (select count(*)::integer from public.player_highlights h where h.player_id=p.id and h.status='published') as highlight_count,
       (select count(*)::integer from public.lab_sessions ls where ls.profile_id=p.profile_id and ls.status='completed') as lab_sessions_completed
from public.players p
left join public.player_iq_profiles iq on iq.player_id=p.id
left join public.player_advanced_analytics a on a.player_id=p.id;

create or replace view public.player_card_live with (security_invoker=true) as
select pp.player_id,pp.first_name,pp.last_name,pp.position,pp.jersey_number,pp.photo_url,
       least(99,greatest(0,round(coalesce(pp.rcl_rating,50))))::integer as overall_rating,
       coalesce(pp.player_archetype,'RCL Hooper') as archetype,
       pp.ppg,pp.rpg,pp.apg,pp.spg,pp.bpg,pp.badge_count,pp.award_count,pp.seasons_played
from public.player_passports pp;

create or replace view public.run_reliability with (security_invoker=true) as
select rp.profile_id,
       count(*)::integer as runs_joined,
       count(rc.id)::integer as verified_checkins,
       round((100.0*count(rc.id)/nullif(count(*),0)),1) as reliability_pct
from public.run_players rp
left join public.run_checkins rc on rc.run_id=rp.run_id and rc.profile_id=rp.profile_id
group by rp.profile_id;

create or replace view public.game_mvp_tallies with (security_invoker=true) as
select game_id,player_id,count(*)::integer as votes
from public.game_mvp_votes
group by game_id,player_id;

create or replace view public.game_live_state with (security_invoker=true) as
select g.id as game_id,g.status,g.home_team_id,g.away_team_id,g.home_score,g.away_score,g.scheduled_at,
       e.period_number,e.clock_seconds,e.sequence_no as last_sequence,e.event_type as last_event_type,e.created_at as last_event_at
from public.games g
left join lateral (
  select ge.period_number,ge.clock_seconds,ge.sequence_no,ge.event_type,ge.created_at
  from public.game_events ge where ge.game_id=g.id and ge.voided_at is null
  order by ge.sequence_no desc limit 1
) e on true;

alter table public.weekly_missions enable row level security;
alter table public.mission_progress enable row level security;
alter table public.game_reactions enable row level security;
alter table public.game_chat_messages enable row level security;
alter table public.game_mvp_votes enable row level security;
alter table public.player_highlights enable row level security;
alter table public.player_cards enable row level security;
alter table public.pickem_picks enable row level security;
alter table public.scouting_reports enable row level security;
alter table public.game_story_drafts enable row level security;
alter table public.basketball_connections enable row level security;
alter table public.hall_of_fame_inductions enable row level security;
alter table public.season_reputation_snapshots enable row level security;

create policy "missions are public" on public.weekly_missions for select using (is_active or public.is_staff_or_admin());
create policy "staff manage missions" on public.weekly_missions for all to authenticated using(public.is_staff_or_admin()) with check(public.is_staff_or_admin());
create policy "members read own mission progress" on public.mission_progress for select to authenticated using(profile_id=auth.uid() or public.is_staff_or_admin());
create policy "game reactions public read" on public.game_reactions for select using (true);
create policy "members manage own game reactions" on public.game_reactions for all to authenticated using(profile_id=auth.uid()) with check(profile_id=auth.uid());
create policy "game chat authenticated read" on public.game_chat_messages for select to authenticated using(deleted_at is null or profile_id=auth.uid() or public.is_staff_or_admin());
create policy "members create game chat" on public.game_chat_messages for insert to authenticated with check(profile_id=auth.uid());
create policy "members delete own game chat" on public.game_chat_messages for update to authenticated using(profile_id=auth.uid() or public.is_staff_or_admin()) with check(profile_id=auth.uid() or public.is_staff_or_admin());
create policy "mvp votes public read" on public.game_mvp_votes for select using(true);
create policy "members manage own mvp vote" on public.game_mvp_votes for all to authenticated using(voter_profile_id=auth.uid()) with check(voter_profile_id=auth.uid());
create policy "published highlights public read" on public.player_highlights for select using(status='published' or uploaded_by=auth.uid() or public.is_staff_or_admin());
create policy "members submit highlights" on public.player_highlights for insert to authenticated with check(uploaded_by=auth.uid() or public.is_staff_or_admin());
create policy "members manage own highlights" on public.player_highlights for update to authenticated using(uploaded_by=auth.uid() or public.is_staff_or_admin()) with check(uploaded_by=auth.uid() or public.is_staff_or_admin());
create policy "player cards public read" on public.player_cards for select using(true);
create policy "staff manage player cards" on public.player_cards for all to authenticated using(public.is_staff_or_admin()) with check(public.is_staff_or_admin());
create policy "members read own pickem" on public.pickem_picks for select to authenticated using(profile_id=auth.uid() or public.is_staff_or_admin());
create policy "members create own pickem" on public.pickem_picks for insert to authenticated with check(profile_id=auth.uid() and exists(select 1 from public.games g where g.id=game_id and g.status::text='scheduled' and g.scheduled_at>now()));
create policy "members update own pickem" on public.pickem_picks for update to authenticated using(profile_id=auth.uid() and exists(select 1 from public.games g where g.id=game_id and g.status::text='scheduled' and g.scheduled_at>now())) with check(profile_id=auth.uid());
create policy "coaches read own scouting" on public.scouting_reports for select to authenticated using(author_profile_id=auth.uid() or public.is_staff_or_admin());
create policy "coaches create scouting" on public.scouting_reports for insert to authenticated with check(author_profile_id=auth.uid() or public.is_staff_or_admin());
create policy "coaches manage own scouting" on public.scouting_reports for update to authenticated using(author_profile_id=auth.uid() or public.is_staff_or_admin()) with check(author_profile_id=auth.uid() or public.is_staff_or_admin());
create policy "coaches delete own scouting" on public.scouting_reports for delete to authenticated using(author_profile_id=auth.uid() or public.is_staff_or_admin());
create policy "published game stories public read" on public.game_story_drafts for select using(status='published' or public.is_staff_or_admin());
create policy "staff manage game stories" on public.game_story_drafts for all to authenticated using(public.is_staff_or_admin()) with check(public.is_staff_or_admin());
create policy "basketball connections public read" on public.basketball_connections for select using(true);
create policy "members manage outgoing basketball connections" on public.basketball_connections for all to authenticated using(from_profile_id=auth.uid() or public.is_staff_or_admin()) with check(from_profile_id=auth.uid() or public.is_staff_or_admin());
create policy "hall of fame public read" on public.hall_of_fame_inductions for select using(true);
create policy "staff manage hall of fame" on public.hall_of_fame_inductions for all to authenticated using(public.is_staff_or_admin()) with check(public.is_staff_or_admin());
create policy "season rep public read" on public.season_reputation_snapshots for select using(true);
create policy "staff manage season rep" on public.season_reputation_snapshots for all to authenticated using(public.is_staff_or_admin()) with check(public.is_staff_or_admin());

grant select on public.weekly_missions to anon,authenticated;
grant select on public.game_reactions,public.game_mvp_votes,public.player_highlights,public.player_cards,public.hall_of_fame_inductions,public.season_reputation_snapshots to anon,authenticated;
grant select on public.rep_dimension_summary,public.player_advanced_analytics,public.player_passports,public.player_card_live,public.run_reliability,public.game_mvp_tallies,public.game_live_state to anon,authenticated;
grant select,insert,update,delete on public.game_reactions,public.game_mvp_votes,public.basketball_connections to authenticated;
grant select,insert,update on public.game_chat_messages,public.player_highlights,public.pickem_picks,public.scouting_reports to authenticated;
grant select on public.mission_progress to authenticated;
grant execute on function public.claim_weekly_mission(uuid) to authenticated;
grant execute on function public.rep_status_label(integer) to anon,authenticated;
revoke execute on function public.record_mission_event(uuid,text,uuid) from public,anon,authenticated;
revoke execute on function public.capture_mission_event() from public,anon,authenticated;
revoke execute on function public.create_game_story_draft() from public,anon,authenticated;

create index if not exists mission_progress_profile_week_idx on public.mission_progress(profile_id,week_start);
create index if not exists game_reactions_game_idx on public.game_reactions(game_id,created_at desc);
create index if not exists game_chat_game_idx on public.game_chat_messages(game_id,created_at desc);
create index if not exists player_highlights_player_idx on public.player_highlights(player_id,created_at desc);
create index if not exists pickem_profile_idx on public.pickem_picks(profile_id,created_at desc);
create index if not exists scouting_author_idx on public.scouting_reports(author_profile_id,updated_at desc);
create index if not exists connections_from_idx on public.basketball_connections(from_profile_id,created_at desc);
create index if not exists hall_of_fame_year_idx on public.hall_of_fame_inductions(class_year desc);
create index if not exists xp_transactions_dimension_idx on public.xp_transactions(profile_id,rep_dimension,created_at desc);

commit;