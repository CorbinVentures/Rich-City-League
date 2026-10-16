begin;

-- PERMANENT COURT MASTER TITLES, DISTINCT FROM RATING LEADERBOARD.
-- Three separate crowns: 1v1, 2v2, 3v3. No title changes without a
-- real, independently confirmed ranked match at that specific court.

create table public.rch_court_master_titles (
 court_slug text not null references public.basketball_locations(slug) on delete cascade,
 division text not null check (division in ('1v1','2v2','3v3')),
 holder_id uuid not null references public.profiles(id) on delete restrict,
 since_at timestamptz not null default now(),
 last_defended_at timestamptz,
 defenses integer not null default 0 check (defenses>=0),
 awarded_by_match uuid references public.run_ranked_matches(id) on delete restrict,
 primary key(court_slug,division)
);

create table public.rch_court_master_challenges (
 id uuid primary key default gen_random_uuid(),
 court_slug text not null references public.basketball_locations(slug) on delete restrict,
 division text not null check (division in ('1v1','2v2','3v3')),
 run_id uuid not null references public.runs(id) on delete restrict,
 challenger_id uuid not null references public.profiles(id) on delete restrict,
 defender_id uuid not null references public.profiles(id) on delete restrict,
 status text not null default 'requested'
  check(status in ('requested','accepted','declined','resolved','cancelled','expired')),
 accepted_at timestamptz,
 resolved_match_id uuid unique references public.run_ranked_matches(id) on delete restrict,
 winner_id uuid references public.profiles(id),
 requested_at timestamptz not null default now(),
 resolved_at timestamptz,
 check (challenger_id<>defender_id)
);
create unique index rch_master_one_open_challenge on public.rch_court_master_challenges(court_slug,division)
 where status in ('requested','accepted');
create index rch_master_challenges_run_status_idx on public.rch_court_master_challenges(run_id,status);

create table public.rch_court_master_attestations (
 match_id uuid primary key references public.run_ranked_matches(id) on delete restrict,
 challenge_id uuid not null unique references public.rch_court_master_challenges(id) on delete restrict,
 official_id uuid not null references public.profiles(id),
 challenger_id uuid not null references public.profiles(id),
 defender_id uuid not null references public.profiles(id),
 home_score integer not null,
 away_score integer not null,
 attested_at timestamptz not null default now()
);

create table public.rch_court_master_history (
 id uuid primary key default gen_random_uuid(),
 court_slug text not null references public.basketball_locations(slug) on delete restrict,
 division text not null check(division in ('1v1','2v2','3v3')),
 match_id uuid unique not null references public.run_ranked_matches(id) on delete restrict,
 former_holder_id uuid not null references public.profiles(id),
 winner_id uuid not null references public.profiles(id),
 event_type text not null check(event_type in ('title_defense','title_takeover')),
 occurred_at timestamptz not null default now()
);
create index rch_court_master_history_court_idx on public.rch_court_master_history(court_slug,division,occurred_at desc);

alter table public.rch_court_master_titles enable row level security;
alter table public.rch_court_master_challenges enable row level security;
alter table public.rch_court_master_attestations enable row level security;
alter table public.rch_court_master_history enable row level security;
revoke all on public.rch_court_master_titles,public.rch_court_master_challenges,
 public.rch_court_master_attestations,public.rch_court_master_history from public,anon,authenticated;
grant select on public.rch_court_master_titles,public.rch_court_master_challenges,
 public.rch_court_master_history to anon,authenticated;
grant select on public.rch_court_master_attestations to authenticated;

create policy rch_master_title_public on public.rch_court_master_titles for select to anon,authenticated
 using(exists(select 1 from public.profiles p where p.id=holder_id and p.is_active
   and coalesce(p.profile_visibility,'public') not in ('private','only_me')));
create policy rch_master_challenge_public on public.rch_court_master_challenges for select to anon,authenticated
 using(exists(select 1 from public.profiles p where p.id=challenger_id and p.is_active
   and coalesce(p.profile_visibility,'public') not in ('private','only_me'))
 and exists(select 1 from public.profiles p where p.id=defender_id and p.is_active
   and coalesce(p.profile_visibility,'public') not in ('private','only_me')));
create policy rch_master_attestation_involved on public.rch_court_master_attestations for select to authenticated
 using(official_id=(select auth.uid()) or challenger_id=(select auth.uid()) or defender_id=(select auth.uid())
   or coalesce(public.is_staff_or_admin(),false));
create policy rch_master_history_public on public.rch_court_master_history for select to anon,authenticated
 using(exists(select 1 from public.profiles p where p.id=winner_id and p.is_active
   and coalesce(p.profile_visibility,'public') not in ('private','only_me')));

create or replace function public.get_rch_court_master_belts(p_court text)
returns table(division text,holder_id uuid,player_name text,since_at timestamptz,
 defenses integer,last_defended_at timestamptz)
language sql stable security definer set search_path='' as $$
 select t.division,t.holder_id,
   coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player')::text,
   t.since_at,t.defenses,t.last_defended_at
 from public.rch_court_master_titles t
 join public.profiles p on p.id=t.holder_id
 where t.court_slug=p_court and p.is_active
   and coalesce(p.profile_visibility,'public') not in ('private','only_me')
 order by t.division
$$;

-- Eligible contenders must be local top-three players with at least
-- three real games across two separately verified Run sessions.
create or replace function public.rch_request_court_master_duel(
 p_court text,p_division text,p_run uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_run public.runs%rowtype;
 v_holder uuid;v_eligible boolean;v_id uuid;v_dynamic uuid;
begin
 if v_actor is null then raise exception 'Sign in to challenge a Court Master'; end if;
 if p_division not in ('1v1','2v2','3v3') then raise exception 'Select a title format'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_court||':'||p_division),79744);
 select * into v_run from public.runs where id=p_run;
 if v_run.id is null or v_run.location_slug is distinct from p_court
   or v_run.game_format<>p_division or v_run.run_type<>'competitive'
   or v_run.status not in ('open','full')
   or v_run.starts_at<now()-interval '2 hours'
   or v_run.starts_at>now()+interval '30 days'
 then raise exception 'Select an upcoming competitive Run at the same court and format'; end if;
 if not exists(select 1 from public.run_players rp
     where rp.run_id=p_run and rp.profile_id=v_actor)
 then raise exception 'Join the selected Run before requesting a title challenge'; end if;
 select (exists(select 1 from public.get_rch_court_masters(p_court) m
   where m.division=p_division and m.profile_id=v_actor and m.rank<=3 and m.games>=3)
  and (select count(distinct m.run_id) from public.run_ranked_match_players mp
    join public.run_ranked_matches m on m.id=mp.match_id and m.status='verified'
    join public.runs r on r.id=m.run_id
    where mp.profile_id=v_actor and r.location_slug=p_court and m.game_format=p_division)>=2)
 into v_eligible;
 if not coalesce(v_eligible,false) then
   raise exception 'Court challengers must rank in the top three with three verified games across two Runs'; end if;
 -- Bootstrap only from an independently verified qualifying public Master.
 select m.profile_id into v_dynamic from public.get_rch_court_masters(p_court) m
  where m.division=p_division and m.is_master limit 1;
 if v_dynamic is not null then
  insert into public.rch_court_master_titles(court_slug,division,holder_id)
    values(p_court,p_division,v_dynamic) on conflict do nothing;
 end if;
 select t.holder_id into v_holder from public.rch_court_master_titles t
  where t.court_slug=p_court and t.division=p_division for update;
 if v_holder is null then raise exception 'This court has no qualifying Master yet'; end if;
 if v_holder=v_actor then raise exception 'The title holder cannot challenge themselves'; end if;
 update public.rch_court_master_challenges c set status='expired',resolved_at=now()
  where c.court_slug=p_court and c.division=p_division
    and c.status in ('requested','accepted')
    and exists(select 1 from public.runs r where r.id=c.run_id
      and r.starts_at<now()-interval '48 hours');
 insert into public.rch_court_master_challenges(court_slug,division,run_id,challenger_id,defender_id)
  values(p_court,p_division,p_run,v_actor,v_holder) returning id into v_id;
 return v_id;
end $$;

create or replace function public.rch_answer_court_master_duel(
 p_challenge uuid,p_accept boolean
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();c public.rch_court_master_challenges%rowtype;
begin
 if v_actor is null then raise exception 'Sign in to answer this title challenge'; end if;
 select * into c from public.rch_court_master_challenges where id=p_challenge for update;
 if c.id is null or c.status<>'requested' or c.defender_id<>v_actor then
   raise exception 'Only the reigning Court Master can answer this pending challenge'; end if;
 if not exists(select 1 from public.rch_court_master_titles t
   where t.court_slug=c.court_slug and t.division=c.division and t.holder_id=v_actor)
 then raise exception 'The Court Master has changed since the request'; end if;
 if p_accept and not exists(select 1 from public.run_players rp
   where rp.run_id=c.run_id and rp.profile_id=v_actor)
 then raise exception 'Join the challenged Run before accepting your defense'; end if;
 update public.rch_court_master_challenges
  set status=case when p_accept then 'accepted' else 'declined' end,
   accepted_at=case when p_accept then now() else null end
 where id=p_challenge;
end $$;

create or replace function public.rch_certify_court_master_duel(p_match uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();m public.run_ranked_matches%rowtype;
 c public.rch_court_master_challenges%rowtype;v_court text;
begin
 if v_actor is null then raise exception 'Sign in as an independent title official'; end if;
 select * into m from public.run_ranked_matches where id=p_match for update;
 if m.id is null or m.status<>'pending' then raise exception 'Certify a pending ranked match only'; end if;
 if v_actor=m.submitted_by or v_actor=any(m.home_roster) or v_actor=any(m.away_roster)
 then raise exception 'Neither a competitor nor submitter may certify a title match'; end if;
 if not(coalesce(public.is_staff_or_admin(),false) or exists(
    select 1 from public.rch_run_operators o where o.run_id=m.run_id
      and o.profile_id=v_actor and o.role='official'))
 then raise exception 'An appointed independent official is required'; end if;
 select r.location_slug into v_court from public.runs r where r.id=m.run_id;
 select * into c from public.rch_court_master_challenges x
 where x.run_id=m.run_id and x.court_slug=v_court and x.division=m.game_format
   and x.status='accepted' and x.accepted_at<=m.submitted_at
   and ((x.challenger_id=any(m.home_roster) and x.defender_id=any(m.away_roster))
     or (x.challenger_id=any(m.away_roster) and x.defender_id=any(m.home_roster)))
 order by x.requested_at limit 1 for update;
 if c.id is null then raise exception 'This result is not the accepted title matchup'; end if;
 if not exists(select 1 from public.rch_court_master_titles t where t.court_slug=c.court_slug
   and t.division=c.division and t.holder_id=c.defender_id)
 then raise exception 'The title has changed; a new challenge is required'; end if;
 insert into public.rch_court_master_attestations
   (match_id,challenge_id,official_id,challenger_id,defender_id,home_score,away_score)
 values(m.id,c.id,v_actor,c.challenger_id,c.defender_id,m.home_score,m.away_score)
 on conflict(match_id) do nothing;
end $$;

-- A duel cannot be verified (and hence cannot affect rating/REP/title)
-- without an independent official's score-bound attestation.
create or replace function public.rch_guard_master_duel_verification()
returns trigger language plpgsql security definer set search_path='' as $$
declare c public.rch_court_master_challenges%rowtype;v_court text;
begin
 if new.status='rejected' or (old.status='rejected' and new.status='pending') then
   delete from public.rch_court_master_attestations where match_id=new.id;
 end if;
 if new.status<>'verified' or old.status='verified' then return new; end if;
 select r.location_slug into v_court from public.runs r where r.id=new.run_id;
 select * into c from public.rch_court_master_challenges x
  where x.run_id=new.run_id and x.division=new.game_format and x.court_slug=v_court
   and x.status='accepted' and x.accepted_at<=new.submitted_at
   and ((x.challenger_id=any(new.home_roster) and x.defender_id=any(new.away_roster))
     or (x.challenger_id=any(new.away_roster) and x.defender_id=any(new.home_roster)))
  order by x.requested_at limit 1;
 if c.id is not null then
  if not exists(select 1 from public.rch_court_master_attestations a
    where a.match_id=new.id and a.challenge_id=c.id
     and a.challenger_id=c.challenger_id and a.defender_id=c.defender_id
     and a.home_score=new.home_score and a.away_score=new.away_score)
  then raise exception 'Court Master matches require independent score-bound official certification'; end if;
  if not exists(select 1 from public.rch_court_master_titles t
    where t.court_slug=c.court_slug and t.division=c.division and t.holder_id=c.defender_id)
  then raise exception 'The current title holder changed before final verification'; end if;
 end if;
 return new;
end $$;

-- The ownership and history update is transactional with the verified match.
create or replace function public.rch_record_court_master_result()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_court text;v_initial uuid;v_holder uuid;
 c public.rch_court_master_challenges%rowtype;v_winner uuid;
begin
 if new.status<>'verified' or old.status='verified' or new.game_format not in ('1v1','2v2','3v3')
 then return new; end if;
 select r.location_slug into v_court from public.runs r where r.id=new.run_id;
 if v_court is null then return new; end if;
 -- A court crown is first established only by historical verified on-court results.
 select m.profile_id into v_initial from public.get_rch_court_masters(v_court) m
  where m.division=new.game_format and m.is_master limit 1;
 if v_initial is not null then
  insert into public.rch_court_master_titles(court_slug,division,holder_id,awarded_by_match)
   values(v_court,new.game_format,v_initial,new.id) on conflict do nothing;
 end if;
 select * into c from public.rch_court_master_challenges x where x.run_id=new.run_id
   and x.court_slug=v_court and x.division=new.game_format and x.status='accepted'
   and x.accepted_at<=new.submitted_at
   and ((x.challenger_id=any(new.home_roster) and x.defender_id=any(new.away_roster))
     or (x.challenger_id=any(new.away_roster) and x.defender_id=any(new.home_roster)))
   order by x.requested_at limit 1 for update;
 if c.id is null then return new; end if;
 select t.holder_id into v_holder from public.rch_court_master_titles t
  where t.court_slug=v_court and t.division=new.game_format for update;
 if v_holder is distinct from c.defender_id then raise exception 'Title changed before this duel'; end if;
 v_winner:=case
  when new.home_score>new.away_score then
    case when c.challenger_id=any(new.home_roster) then c.challenger_id else c.defender_id end
  else
    case when c.challenger_id=any(new.away_roster) then c.challenger_id else c.defender_id end
 end;
 update public.rch_court_master_titles set
   holder_id=v_winner,
   since_at=case when v_winner=v_holder then since_at else now() end,
   last_defended_at=case when v_winner=v_holder then now() else null end,
   defenses=case when v_winner=v_holder then defenses+1 else 0 end,
   awarded_by_match=new.id
 where court_slug=v_court and division=new.game_format;
 update public.rch_court_master_challenges set status='resolved',winner_id=v_winner,
   resolved_match_id=new.id,resolved_at=now() where id=c.id;
 insert into public.rch_court_master_history
   (court_slug,division,match_id,former_holder_id,winner_id,event_type)
 values(v_court,new.game_format,new.id,v_holder,v_winner,
   case when v_winner=v_holder then 'title_defense' else 'title_takeover' end);
 return new;
end $$;

drop trigger if exists rch_before_master_duel_verification on public.run_ranked_matches;
create trigger rch_before_master_duel_verification before update of status on public.run_ranked_matches
for each row execute function public.rch_guard_master_duel_verification();
drop trigger if exists rch_after_master_duel_verification on public.run_ranked_matches;
create trigger rch_after_master_duel_verification after update of status on public.run_ranked_matches
for each row when(new.status='verified' and old.status is distinct from new.status)
 execute function public.rch_record_court_master_result();

revoke all on function public.get_rch_court_master_belts(text),
 public.rch_request_court_master_duel(text,text,uuid),
 public.rch_answer_court_master_duel(uuid,boolean),
 public.rch_certify_court_master_duel(uuid),
 public.rch_guard_master_duel_verification(),
 public.rch_record_court_master_result()
 from public,anon,authenticated;
grant execute on function public.get_rch_court_master_belts(text) to anon,authenticated;
grant execute on function public.rch_request_court_master_duel(text,text,uuid),
 public.rch_answer_court_master_duel(uuid,boolean),
 public.rch_certify_court_master_duel(uuid) to authenticated;

commit;