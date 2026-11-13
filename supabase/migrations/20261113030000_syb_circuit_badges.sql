begin;

-- The SYB 1v1 collection is awarded only from independently verified match
-- receipts attached to an approved SYB Runs partner event.
alter table public.rch_run_badge_awards
 drop constraint if exists rch_run_badge_awards_badge_code_check;
alter table public.rch_run_badge_awards
 add constraint rch_run_badge_awards_badge_code_check check(badge_code in (
  'first_win','run_veteran','court_defender','takeover_artist',
  'syb_circuit_debut','syb_first_w','syb_run_it_back','syb_two_deep','syb_road_tested'
 ));

-- Player-history checks use array containment so verified 1v1 roster lookups
-- can use these partial GIN indexes as the SYB match archive grows.
create index if not exists rch_syb_verified_1v1_home_roster_idx
 on public.run_ranked_matches using gin(home_roster)
 where status='verified' and verified_at is not null and game_format='1v1';
create index if not exists rch_syb_verified_1v1_away_roster_idx
 on public.run_ranked_matches using gin(away_roster)
 where status='verified' and verified_at is not null and game_format='1v1';

create or replace function public.rch_syb_sync_match_badges(p_match uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
 v_match public.run_ranked_matches%rowtype;
 v_home uuid;v_away uuid;v_winner uuid;v_loser uuid;v_player uuid;
 v_prior_matches bigint;v_prior_wins bigint;v_event_prior_wins bigint;
 v_prior_courts bigint;v_same_court_win boolean;v_court text;
begin
 select * into v_match from public.run_ranked_matches where id=p_match;
 if not found or v_match.status<>'verified' or v_match.verified_at is null
    or v_match.game_format<>'1v1' or cardinality(v_match.home_roster)<>1
    or cardinality(v_match.away_roster)<>1 then return; end if;

 if not exists(
   select 1 from public.rch_runs_partner_sessions s
   join public.rch_runs_partners p on p.id=s.partner_id
   join public.runs r on r.id=s.run_id
   where s.run_id=v_match.run_id and p.slug='syb-hoop-richmond'
     and p.status='approved' and r.run_type='competitive' and r.status<>'cancelled'
 ) then return; end if;

 v_home:=v_match.home_roster[1];
 v_away:=v_match.away_roster[1];
 if v_home is null or v_away is null or v_home=v_away then return; end if;

 -- Serialize per-player history decisions in a deterministic order. This
 -- prevents two matches verified at nearly the same time from both claiming
 -- a player's debut or first win.
 for v_player in
  select distinct player_id
  from unnest(array[v_home,v_away]) as players(player_id)
  order by player_id
 loop
  perform pg_advisory_xact_lock(hashtextextended(v_player::text,0));
 end loop;

 v_winner:=case when v_match.home_score>v_match.away_score then v_home else v_away end;
 v_loser:=case when v_match.home_score>v_match.away_score then v_away else v_home end;
 select r.location_slug into v_court from public.runs r where r.id=v_match.run_id;

 foreach v_player in array array[v_home,v_away] loop
  select count(*) into v_prior_matches
  from public.run_ranked_matches prior
  join public.runs prior_run on prior_run.id=prior.run_id
  join public.rch_runs_partner_sessions ps on ps.run_id=prior.run_id
  join public.rch_runs_partners partner on partner.id=ps.partner_id
  where prior.status='verified' and prior.verified_at is not null and prior.game_format='1v1'
    and prior_run.run_type='competitive' and prior_run.status<>'cancelled'
    and partner.slug='syb-hoop-richmond'
    and cardinality(prior.home_roster)=1 and cardinality(prior.away_roster)=1
    and (prior.verified_at<v_match.verified_at
      or (prior.verified_at=v_match.verified_at and prior.id<v_match.id))
    and (prior.home_roster @> array[v_player] or prior.away_roster @> array[v_player]);
  if v_prior_matches=0 then
   insert into public.rch_run_badge_awards(profile_id,badge_code,earned_from_match_id,awarded_at)
   values(v_player,'syb_circuit_debut',v_match.id,v_match.verified_at) on conflict do nothing;
  end if;
 end loop;

 select count(*) into v_prior_wins
 from public.run_ranked_matches prior
 join public.runs prior_run on prior_run.id=prior.run_id
 join public.rch_runs_partner_sessions ps on ps.run_id=prior.run_id
 join public.rch_runs_partners partner on partner.id=ps.partner_id
 where prior.status='verified' and prior.verified_at is not null and prior.game_format='1v1'
   and prior_run.run_type='competitive' and prior_run.status<>'cancelled'
   and partner.slug='syb-hoop-richmond'
   and cardinality(prior.home_roster)=1 and cardinality(prior.away_roster)=1
   and (prior.verified_at<v_match.verified_at
     or (prior.verified_at=v_match.verified_at and prior.id<v_match.id))
   and ((prior.home_roster @> array[v_winner] and prior.home_score>prior.away_score)
     or (prior.away_roster @> array[v_winner] and prior.away_score>prior.home_score));
 if v_prior_wins=0 then
  insert into public.rch_run_badge_awards(profile_id,badge_code,earned_from_match_id,awarded_at)
  values(v_winner,'syb_first_w',v_match.id,v_match.verified_at) on conflict do nothing;
 end if;

 -- A rematch counts only when this same opponent previously beat the current winner.
 if exists(
   select 1 from public.run_ranked_matches prior
   join public.runs prior_run on prior_run.id=prior.run_id
   join public.rch_runs_partner_sessions ps on ps.run_id=prior.run_id
   join public.rch_runs_partners partner on partner.id=ps.partner_id
   where prior.status='verified' and prior.verified_at is not null
     and prior.game_format='1v1' and partner.slug='syb-hoop-richmond'
     and cardinality(prior.home_roster)=1 and cardinality(prior.away_roster)=1
     and prior_run.run_type='competitive' and prior_run.status<>'cancelled'
     and (prior.verified_at<v_match.verified_at
       or (prior.verified_at=v_match.verified_at and prior.id<v_match.id))
     and ((prior.home_roster @> array[v_winner] and prior.away_roster @> array[v_loser]
           and prior.home_score<prior.away_score)
       or (prior.away_roster @> array[v_winner] and prior.home_roster @> array[v_loser]
           and prior.away_score<prior.home_score))
 ) then
  insert into public.rch_run_badge_awards(profile_id,badge_code,earned_from_match_id,awarded_at)
  values(v_winner,'syb_run_it_back',v_match.id,v_match.verified_at) on conflict do nothing;
 end if;

 select count(*) into v_event_prior_wins
 from public.run_ranked_matches prior
 where prior.run_id=v_match.run_id and prior.status='verified'
   and prior.game_format='1v1' and prior.id<>v_match.id
   and (prior.verified_at<v_match.verified_at
     or (prior.verified_at=v_match.verified_at and prior.id<v_match.id))
   and ((prior.home_roster @> array[v_winner] and prior.home_score>prior.away_score)
     or (prior.away_roster @> array[v_winner] and prior.away_score>prior.home_score));
 if v_event_prior_wins>=1 then
  insert into public.rch_run_badge_awards(profile_id,badge_code,earned_from_match_id,awarded_at)
  values(v_winner,'syb_two_deep',v_match.id,v_match.verified_at) on conflict do nothing;
 end if;

 select count(distinct prior_run.location_slug) into v_prior_courts
 from public.run_ranked_matches prior
 join public.runs prior_run on prior_run.id=prior.run_id
 join public.rch_runs_partner_sessions ps on ps.run_id=prior.run_id
 join public.rch_runs_partners partner on partner.id=ps.partner_id
 where prior.status='verified' and prior.verified_at is not null and prior.game_format='1v1'
   and prior_run.run_type='competitive' and prior_run.status<>'cancelled'
   and prior_run.location_slug is not null and partner.slug='syb-hoop-richmond'
   and cardinality(prior.home_roster)=1 and cardinality(prior.away_roster)=1
   and (prior.verified_at<v_match.verified_at
     or (prior.verified_at=v_match.verified_at and prior.id<v_match.id))
   and ((prior.home_roster @> array[v_winner] and prior.home_score>prior.away_score)
     or (prior.away_roster @> array[v_winner] and prior.away_score>prior.home_score));
 select exists(
   select 1 from public.run_ranked_matches prior
   join public.runs prior_run on prior_run.id=prior.run_id
   join public.rch_runs_partner_sessions ps on ps.run_id=prior.run_id
   join public.rch_runs_partners partner on partner.id=ps.partner_id
   where prior.status='verified' and prior.verified_at is not null and prior.game_format='1v1'
     and prior_run.run_type='competitive' and prior_run.status<>'cancelled'
     and prior_run.location_slug=v_court and partner.slug='syb-hoop-richmond'
     and cardinality(prior.home_roster)=1 and cardinality(prior.away_roster)=1
     and (prior.verified_at<v_match.verified_at
       or (prior.verified_at=v_match.verified_at and prior.id<v_match.id))
     and ((prior.home_roster @> array[v_winner] and prior.home_score>prior.away_score)
       or (prior.away_roster @> array[v_winner] and prior.away_score>prior.home_score))
 ) into v_same_court_win;
 if v_court is not null and v_prior_courts>=2 and not v_same_court_win then
  insert into public.rch_run_badge_awards(profile_id,badge_code,earned_from_match_id,awarded_at)
  values(v_winner,'syb_road_tested',v_match.id,v_match.verified_at) on conflict do nothing;
 end if;
end $$;

revoke all on function public.rch_syb_sync_match_badges(uuid) from public,anon,authenticated;

create or replace function public.rch_award_syb_circuit_badges()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='verified' and old.status is distinct from new.status then
  perform public.rch_syb_sync_match_badges(new.id);
 end if;
 return new;
end $$;
revoke all on function public.rch_award_syb_circuit_badges() from public,anon,authenticated;
drop trigger if exists syb_circuit_badges_after_verified_match on public.run_ranked_matches;
create trigger syb_circuit_badges_after_verified_match
after update of status on public.run_ranked_matches
for each row when(new.status='verified' and old.status is distinct from new.status)
execute function public.rch_award_syb_circuit_badges();

-- Existing independently verified SYB games establish the starting collection.
-- Award timestamps stay tied to the match that first met each requirement.
do $$
declare v_match_id uuid;
begin
 for v_match_id in
  select m.id from public.run_ranked_matches m
  join public.rch_runs_partner_sessions s on s.run_id=m.run_id
  join public.rch_runs_partners p on p.id=s.partner_id
  join public.runs r on r.id=m.run_id
  where m.status='verified' and m.game_format='1v1' and m.verified_at is not null
    and p.slug='syb-hoop-richmond'
    and r.run_type='competitive' and r.status<>'cancelled'
  order by m.verified_at,m.id
 loop
  perform public.rch_syb_sync_match_badges(v_match_id);
 end loop;
end $$;

-- Let the signed-in player receive the same real-time unlock moment used by
-- the existing player badge experience.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
   and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
     and schemaname='public' and tablename='rch_run_badge_awards') then
   execute 'alter publication supabase_realtime add table public.rch_run_badge_awards';
 end if;
end $$;

-- SYB circuit badges can be featured in the member's five-slot Badge Cabinet.
alter table public.rch_badge_cabinet_pins
 drop constraint if exists rch_badge_cabinet_pins_badge_kind_check;
alter table public.rch_badge_cabinet_pins
 add constraint rch_badge_cabinet_pins_badge_kind_check
 check(badge_kind in ('skill','world','location','achievement','run'));

create or replace function public.rch_set_badge_cabinet_pin(
 p_badge_kind text,p_badge_key text,p_slot smallint,p_pinned boolean
) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_key uuid;v_journey jsonb;v_earned boolean:=false;
begin
 if v_user is null then raise exception 'Sign in to manage your badge showcase';end if;
 if p_badge_kind not in ('skill','world','location','achievement','run')
    or p_badge_key is null or char_length(p_badge_key) not between 1 and 120
 then raise exception 'Invalid badge selection';end if;
 if not p_pinned then
  delete from public.rch_badge_cabinet_pins
   where profile_id=v_user and badge_kind=p_badge_kind and badge_key=p_badge_key;
  return;
 end if;
 if p_slot is null or p_slot not between 1 and 5 then raise exception 'Choose a showcase slot from 1 to 5';end if;

 if p_badge_kind='skill' then
  select exists(select 1 from public.get_rch_skill_mastery(v_user) s
    where s.badge_code=p_badge_key and s.tier_index>0) into v_earned;
 elsif p_badge_kind='world' then
  if p_badge_key not in ('first_battle','first_win','five_verified_games','three_arenas','ten_verified_wins','crown_defender')
  then raise exception 'Unknown World milestone';end if;
  v_journey:=public.get_rch_world_journey();
  v_earned:=coalesce((v_journey->'milestones'->>p_badge_key)::boolean,false);
 elsif p_badge_kind='location' then
  begin v_key:=p_badge_key::uuid;exception when invalid_text_representation then raise exception 'Invalid location award';end;
  select exists(select 1 from public.rch_place_badge_awards a
    where a.id=v_key and a.profile_id=v_user) into v_earned;
 elsif p_badge_kind='achievement' then
  begin v_key:=p_badge_key::uuid;exception when invalid_text_representation then raise exception 'Invalid achievement';end;
  select exists(select 1 from public.fan_badges b where b.badge_id=v_key and b.profile_id=v_user)
    or exists(select 1 from public.coach_badges b where b.badge_id=v_key and b.profile_id=v_user)
    or exists(select 1 from public.player_badges b join public.players p on p.id=b.player_id
      where b.badge_id=v_key and p.profile_id=v_user and p.is_active)
  into v_earned;
 elsif p_badge_kind='run' then
  select exists(select 1 from public.rch_run_badge_awards a
    where a.profile_id=v_user and a.badge_code=p_badge_key) into v_earned;
 end if;
 if not v_earned then raise exception 'Only a badge already earned by this profile can be featured';end if;

 delete from public.rch_badge_cabinet_pins
  where profile_id=v_user and (slot=p_slot or (badge_kind=p_badge_kind and badge_key=p_badge_key));
 insert into public.rch_badge_cabinet_pins(profile_id,badge_kind,badge_key,slot)
 values(v_user,p_badge_kind,p_badge_key,p_slot);
end $$;
revoke all on function public.rch_set_badge_cabinet_pin(text,text,smallint,boolean) from public,anon,authenticated;
grant execute on function public.rch_set_badge_cabinet_pin(text,text,smallint,boolean) to authenticated;
comment on function public.rch_set_badge_cabinet_pin(text,text,smallint,boolean) is
 'Owner-only five-slot featured badge setter. Verifies earned skill, World, location, Run, or legacy member awards before saving.';

commit;
