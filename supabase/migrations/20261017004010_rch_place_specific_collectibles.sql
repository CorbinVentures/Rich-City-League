begin;

-- A collectible is tied to verifiable evidence and to the actual court/locality.
-- Badge art gets a detailed, stable visual key rather than a generic emoji icon.
create table public.rch_badge_blueprints (
 code text primary key,
 display_name text not null,
 description text not null,
 tier text not null check(tier in ('bronze','silver','gold','elite','platinum','diamond')),
 audience text not null check(audience in ('player','crew','fan','cheerleader','creator')),
 visual_key text not null,
 award_rule text not null,
 available boolean not null default true
);
insert into public.rch_badge_blueprints(code,display_name,description,tier,audience,visual_key,award_rule)
values
 ('shutout_21','21–0 Park Domination','Earn an independently verified 21–0 individual victory at this actual court.','gold','player','court-score-engraved','verified_match_1v1_21_0'),
 ('court_specialist','Court Certified','Record five separately verified ranked victories at this exact court.','silver','player','court-medal','verified_five_local_wins'),
 ('court_master','Court King','Take the official Court Master crown in a verified championship game.','elite','player','location-crown','verified_title_takeover'),
 ('road_warrior','Virginia Road Warrior','Compete in verified ranked games in five different Virginia localities.','platinum','player','virginia-route','five_distinct_verified_localities'),
 ('territory_taker','Territory Taker','Your registered crew wins an official Takeover at this court.','gold','crew','crew-shield','verified_crew_takeover'),
 ('fan_courtside','Courtside Witness','Attend a Run recorded and approved by RCH operations staff.','bronze','fan','fan-ticket','staff_verified_attendance'),
 ('cheer_debut','Performance Royalty','Receive staff confirmation of cheerleading participation at an event.','silver','cheerleader','cheer-crown','staff_verified_performance'),
 ('creator_feature','Creator On The Map','Have an original published RCH post verified by the editorial team.','bronze','creator','creator-lens','staff_verified_original_content'),
 ('king_virginia','King of Virginia','Reserved for an officially certified Virginia statewide championship.','diamond','player','virginia-crown','future_state_title')
on conflict(code) do update set display_name=excluded.display_name,description=excluded.description,
 tier=excluded.tier,audience=excluded.audience,visual_key=excluded.visual_key,award_rule=excluded.award_rule;

create table public.rch_place_badge_awards (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 badge_code text not null references public.rch_badge_blueprints(code),
 scope_key text not null,
 court_slug text references public.basketball_locations(slug) on delete restrict,
 place_label text not null,
 locality text not null,
 source_kind text not null check(source_kind in ('ranked_match','master_result','event_attendance','cheer_event','original_post')),
 source_id uuid not null,
 earned_at timestamptz not null default now(),
 unique(profile_id,badge_code,scope_key),
 unique(profile_id,badge_code,source_kind,source_id)
);
create index rch_place_badge_owner_idx on public.rch_place_badge_awards(profile_id,earned_at desc);

create table public.rch_crew_badge_awards (
 id uuid primary key default gen_random_uuid(),
 crew_id uuid not null references public.commonwealth_crews(id) on delete cascade,
 badge_code text not null references public.rch_badge_blueprints(code),
 court_slug text not null references public.basketball_locations(slug) on delete restrict,
 place_label text not null,
 locality text not null,
 takeover_id uuid not null unique references public.rch_court_takeovers(id),
 earned_at timestamptz not null default now(),
 unique(crew_id,badge_code,court_slug)
);

alter table public.rch_badge_blueprints enable row level security;
alter table public.rch_place_badge_awards enable row level security;
alter table public.rch_crew_badge_awards enable row level security;
revoke all on public.rch_badge_blueprints,public.rch_place_badge_awards,public.rch_crew_badge_awards from public,anon,authenticated;
grant select on public.rch_badge_blueprints,public.rch_place_badge_awards,
 public.rch_crew_badge_awards to authenticated;
grant select on public.rch_badge_blueprints,public.rch_place_badge_awards,
 public.rch_crew_badge_awards to anon;
create policy rch_badge_catalog_public on public.rch_badge_blueprints for select to anon,authenticated using(available);
create policy rch_earned_badge_public on public.rch_place_badge_awards for select to anon,authenticated
 using(profile_id=(select auth.uid())
    or exists(select 1 from public.profiles p where p.id=profile_id and p.is_active
      and coalesce(p.profile_visibility,'public') not in ('private','only_me')));
create policy rch_crew_badge_public on public.rch_crew_badge_awards for select to anon,authenticated using(true);

create or replace function public.rch_award_place_badge_internal(
 p_profile uuid,p_code text,p_scope text,p_court text,p_place text,p_locality text,
 p_kind text,p_source uuid
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_new uuid;
begin
 if p_profile is null or p_source is null or p_scope is null then return false; end if;
 if not exists(select 1 from public.profiles p where p.id=p_profile and p.is_active
     and not coalesce(p.is_system_account,false)) then return false; end if;
 insert into public.rch_place_badge_awards
  (profile_id,badge_code,scope_key,court_slug,place_label,locality,source_kind,source_id)
 values(p_profile,p_code,p_scope,p_court,left(p_place,150),left(p_locality,100),p_kind,p_source)
 on conflict do nothing returning id into v_new;
 return v_new is not null;
end $$;
revoke all on function public.rch_award_place_badge_internal(uuid,text,text,text,text,text,text,uuid) from public,anon,authenticated;

-- Only a BOTH-SIDES verified result creates ranked badges. These are
-- physical court-specific, not achievements claimed by the uploader.
create or replace function public.rch_badges_from_ranked_match()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_court text;v_name text;v_locality text;v_winner uuid;v_person uuid;v_wins bigint;v_places bigint;
begin
 if new.status<>'verified' or old.status='verified' then return new; end if;
 select r.location_slug,l.name,l.locality into v_court,v_name,v_locality from public.runs r
 join public.basketball_locations l on l.slug=r.location_slug where r.id=new.run_id;
 if v_court is null then return new; end if;
 if new.game_format='1v1' and ((new.home_score=21 and new.away_score=0) or (new.away_score=21 and new.home_score=0)) then
   v_winner:=case when new.home_score=21 then new.home_roster[1] else new.away_roster[1] end;
   perform public.rch_award_place_badge_internal(v_winner,'shutout_21',
     v_court,v_court,v_name,v_locality,'ranked_match',new.id);
 end if;
 for v_person in select distinct unnest(new.home_roster||new.away_roster) loop
  select count(*) into v_wins from public.run_ranked_matches m
   join public.runs r on r.id=m.run_id where m.status='verified'
    and r.location_slug=v_court
    and ((v_person=any(m.home_roster) and m.home_score>m.away_score)
      or (v_person=any(m.away_roster) and m.away_score>m.home_score));
  if v_wins>=5 then
   perform public.rch_award_place_badge_internal(v_person,'court_specialist',
    v_court,v_court,v_name,v_locality,'ranked_match',new.id);
  end if;
  select count(distinct l.locality) into v_places from public.run_ranked_matches m
   join public.runs r on r.id=m.run_id
   join public.basketball_locations l on l.slug=r.location_slug
   where m.status='verified' and (v_person=any(m.home_roster) or v_person=any(m.away_roster));
  if v_places>=5 then
   perform public.rch_award_place_badge_internal(v_person,'road_warrior',
     'virginia',null,'Commonwealth of Virginia','Virginia','ranked_match',new.id);
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.rch_badges_from_ranked_match() from public,anon,authenticated;
create trigger rch_badges_after_ranked_match
 after update of status on public.run_ranked_matches for each row
 when(new.status='verified' and old.status is distinct from new.status)
 execute function public.rch_badges_from_ranked_match();

create or replace function public.rch_badge_from_master_crown()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_name text;v_locality text;
begin
 if new.event_type<>'title_takeover' then return new; end if;
 select name,locality into v_name,v_locality from public.basketball_locations where slug=new.court_slug;
 perform public.rch_award_place_badge_internal(new.winner_id,'court_master',
   new.court_slug||':'||new.division,new.court_slug,
   v_name||' · '||new.division,v_locality,'master_result',new.match_id);
 return new;
end $$;
revoke all on function public.rch_badge_from_master_crown() from public,anon,authenticated;
create trigger rch_badge_new_court_king after insert on public.rch_court_master_history
 for each row execute function public.rch_badge_from_master_crown();

create or replace function public.rch_badge_from_crew_takeover()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_name text;v_locality text;
begin
 if new.status<>'resolved' or old.status='resolved' or new.winning_crew_id is null
    or new.winning_crew_id<>new.challenger_crew_id then return new; end if;
 select name,locality into v_name,v_locality from public.basketball_locations where slug=new.court_slug;
 insert into public.rch_crew_badge_awards(crew_id,badge_code,court_slug,place_label,locality,takeover_id)
 values(new.winning_crew_id,'territory_taker',new.court_slug,v_name,v_locality,new.id)
 on conflict do nothing;
 return new;
end $$;
revoke all on function public.rch_badge_from_crew_takeover() from public,anon,authenticated;
create trigger rch_badge_crew_takeover after update of status on public.rch_court_takeovers
 for each row execute function public.rch_badge_from_crew_takeover();

-- Human verification avoids rewarding GPS spoofing, self check-in or
-- artificial fan/cheer/creator activity. All such credits are one-shot.
create or replace function public.rch_certify_community_badge(
 p_profile uuid,p_kind text,p_evidence uuid
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_court text;v_place text;v_locality text;
 v_valid boolean:=false;v_badge text;v_reward integer;v_source text;
begin
 if v_actor is null or not coalesce(public.is_staff_or_admin(),false)
 then raise exception 'Only RCH staff can certify event participation'; end if;
 if p_profile=v_actor then raise exception 'Independent staff verification is required'; end if;
 if p_kind='fan_attendance' then
  select r.location_slug,l.name,l.locality,
   (r.allow_fan_checkin and r.starts_at<now() and r.status='completed')
   into v_court,v_place,v_locality,v_valid
  from public.run_checkins c join public.runs r on r.id=c.run_id
  left join public.basketball_locations l on l.slug=r.location_slug
  where c.id=p_evidence and c.profile_id=p_profile;
  v_badge:='fan_courtside';v_reward:=15;
 elsif p_kind='cheer_event' then
  select e.location,e.location,'Virginia',(e.starts_at<now() and a.checked_in_at is not null)
  into v_court,v_place,v_locality,v_valid
  from public.rcl_royaltee_event_registrations a
   join public.rcl_royaltee_events e on e.id=a.event_id
  where a.id=p_evidence and a.profile_id=p_profile;
  v_court:=null;v_badge:='cheer_debut';v_reward:=30;
 elsif p_kind='creator_post' then
  select null,'RCH Social','Virginia',(p.status='published' and not p.is_automated)
  into v_court,v_place,v_locality,v_valid
  from public.posts p where p.id=p_evidence and p.author_id=p_profile;
  v_badge:='creator_feature';v_reward:=20;
 else raise exception 'Unsupported award category'; end if;
 if not coalesce(v_valid,false) then raise exception 'Verified attendance or original published evidence is required'; end if;
 v_source:='event:'||p_kind||':'||p_evidence::text||':'||p_profile::text;
 perform public.rch_rep_credit_internal(p_profile,v_reward,v_source,
   'Staff-certified '||p_kind);
 perform public.rch_award_place_badge_internal(p_profile,v_badge,
  case when p_kind='fan_attendance' then coalesce(v_court,'run:'||p_evidence::text)
       else p_kind||':'||p_evidence::text end,
  case when p_kind='fan_attendance' then v_court else null end,
  coalesce(v_place,'RCH Event'),coalesce(v_locality,'Virginia'),
  case when p_kind='fan_attendance' then 'event_attendance'
       when p_kind='cheer_event' then 'cheer_event' else 'original_post' end,p_evidence);
end $$;
revoke all on function public.rch_certify_community_badge(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.rch_certify_community_badge(uuid,text,uuid) to authenticated;

comment on table public.rch_place_badge_awards is 'Immutable verified badge receipts with exact court and original event reference. Purchase does not grant these.';
commit;