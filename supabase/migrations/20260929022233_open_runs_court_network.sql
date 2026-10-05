begin;

-- RCL Open Runs 2.0: verified court directory, social/competitive run types,
-- attendance check-ins, run badges, and bonus REP for posted highlights.

create table if not exists public.basketball_locations (
  slug text primary key,
  name text not null,
  address text not null,
  locality text not null default 'Richmond',
  region text not null default 'VA',
  postal_code text,
  area text not null default 'Richmond',
  venue_type text not null default 'outdoor' check (venue_type in ('outdoor','indoor','mixed')),
  access_type text not null default 'public' check (access_type in ('public','free_pass','membership','reservation','varies')),
  court_count integer,
  lights boolean,
  latitude double precision,
  longitude double precision,
  hours_text text,
  open_gym_text text,
  open_gym_schedule jsonb not null default '[]'::jsonb,
  source_label text,
  source_url text,
  last_verified_on date,
  verification_status text not null default 'official' check (verification_status in ('official','provider','community')),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.basketball_locations enable row level security;
drop policy if exists "public reads basketball locations" on public.basketball_locations;
create policy "public reads basketball locations" on public.basketball_locations for select using (is_active=true);
drop policy if exists "staff manages basketball locations" on public.basketball_locations;
create policy "staff manages basketball locations" on public.basketball_locations
  for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.runs
  add column if not exists location_slug text references public.basketball_locations(slug) on update cascade on delete set null,
  add column if not exists run_type text not null default 'competitive' check (run_type in ('competitive','social','training')),
  add column if not exists allow_fan_checkin boolean not null default true;

create index if not exists runs_location_slug_idx on public.runs(location_slug,starts_at asc);
create index if not exists basketball_locations_area_idx on public.basketball_locations(area,venue_type,is_active);

create table if not exists public.run_checkins (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(run_id,profile_id)
);

create table if not exists public.run_highlight_claims (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  rep_awarded integer not null default 35,
  created_at timestamptz not null default now(),
  unique(run_id,profile_id,post_id)
);

alter table public.run_checkins enable row level security;
alter table public.run_highlight_claims enable row level security;

drop policy if exists "members view own run checkins" on public.run_checkins;
create policy "members view own run checkins" on public.run_checkins for select to authenticated
using (profile_id=auth.uid() or exists(select 1 from public.runs r where r.id=run_id and r.host_id=auth.uid()) or public.is_staff_or_admin());

drop policy if exists "members view own run highlight claims" on public.run_highlight_claims;
create policy "members view own run highlight claims" on public.run_highlight_claims for select to authenticated
using (profile_id=auth.uid() or exists(select 1 from public.runs r where r.id=run_id and r.host_id=auth.uid()) or public.is_staff_or_admin());

create or replace function public.award_run_rep(actor uuid, reward integer, reason_name text, source_name text, source_uuid uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare inserted_rows integer:=0;
begin
  if actor is null or reward<=0 then return false; end if;
  insert into public.user_levels(profile_id) values(actor) on conflict do nothing;
  insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id)
  values(actor,reward,reason_name,source_name,source_uuid)
  on conflict do nothing;
  get diagnostics inserted_rows=row_count;
  if inserted_rows=0 then return false; end if;
  update public.user_levels
    set xp=xp+reward,level=public.level_for_xp(xp+reward),updated_at=now()
    where profile_id=actor;
  return true;
end $$;
revoke execute on function public.award_run_rep(uuid,integer,text,text,uuid) from public,anon,authenticated;

-- Run-specific achievement catalog. fan_badges is the universal profile badge join table.
insert into public.badges(name,description,category,icon,tier,requirement_type,requirement_value,is_active)
values
  ('Checked In','Checked in at an RCL run or basketball meetup.','community','📍','bronze','run_checkins',1,true),
  ('Run Regular','Checked in to five RCL runs or basketball meetups.','community','🏀','silver','run_checkins',5,true),
  ('Gym Rat','Checked in to fifteen RCL runs or basketball meetups.','community','💪','gold','run_checkins',15,true),
  ('Run Tested','A player checked in to three competitive RCL runs.','basketball','⚔️','silver','player_run_checkins',3,true),
  ('Open Run Veteran','A player checked in to ten competitive RCL runs.','basketball','🏆','gold','player_run_checkins',10,true),
  ('Courtside Scout','A fan checked in to three RCL basketball events.','community','👀','silver','fan_run_checkins',3,true),
  ('Community Regular','A fan checked in to ten RCL basketball events.','community','🤝','gold','fan_run_checkins',10,true),
  ('Highlight Reel','Posted a verified media highlight from an RCL run.','media','🎥','silver','run_highlights',1,true),
  ('Run Content Creator','Posted five verified media highlights from RCL runs.','media','📹','gold','run_highlights',5,true)
on conflict(name) do update set
  description=excluded.description,category=excluded.category,icon=excluded.icon,tier=excluded.tier,
  requirement_type=excluded.requirement_type,requirement_value=excluded.requirement_value,is_active=true,updated_at=now();

create or replace function public.unlock_run_badges(target_profile uuid)
returns void language plpgsql security definer set search_path=public as $$
declare total_checkins integer:=0; competitive_checkins integer:=0; highlight_total integer:=0; profile_role text;
begin
  select coalesce(role,'fan') into profile_role from public.profiles where id=target_profile;
  select count(*)::integer into total_checkins from public.run_checkins where profile_id=target_profile;
  select count(*)::integer into competitive_checkins
    from public.run_checkins c join public.runs r on r.id=c.run_id
    where c.profile_id=target_profile and r.run_type='competitive';
  select count(*)::integer into highlight_total from public.run_highlight_claims where profile_id=target_profile;

  insert into public.fan_badges(profile_id,badge_id)
  select target_profile,b.id from public.badges b
  where b.is_active=true and (
    (b.requirement_type='run_checkins' and total_checkins>=b.requirement_value)
    or (b.requirement_type='run_highlights' and highlight_total>=b.requirement_value)
    or (profile_role='player' and b.requirement_type='player_run_checkins' and competitive_checkins>=b.requirement_value)
    or (profile_role='fan' and b.requirement_type='fan_run_checkins' and total_checkins>=b.requirement_value)
  ) on conflict(profile_id,badge_id) do nothing;
end $$;
revoke execute on function public.unlock_run_badges(uuid) from public,anon,authenticated;

create or replace function public.check_in_to_run(p_run uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); r public.runs%rowtype; checkin_id uuid; awarded boolean;
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
  awarded:=public.award_run_rep(actor,15,'run_checkin','run_checkin',checkin_id);
  perform public.unlock_run_badges(actor);
  return case when awarded then 15 else 0 end;
end $$;
grant execute on function public.check_in_to_run(uuid) to authenticated;

create or replace function public.claim_latest_run_highlight(p_run uuid)
returns table(rep_awarded integer,post_id uuid) language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); r public.runs%rowtype; chosen uuid; claim_id uuid; awarded boolean;
begin
  if actor is null then raise exception 'Sign in to claim a highlight'; end if;
  select * into r from public.runs where id=p_run;
  if r.id is null then raise exception 'Run not found'; end if;
  if actor<>r.host_id and not exists(select 1 from public.run_players rp where rp.run_id=p_run and rp.profile_id=actor) then
    raise exception 'Join the run before claiming a player highlight';
  end if;
  select p.id into chosen
    from public.posts p
    where p.author_id=actor and p.status='published'
      and jsonb_typeof(p.media_urls)='array' and jsonb_array_length(p.media_urls)>0
      and p.created_at between r.starts_at - interval '2 hours' and r.starts_at + interval '72 hours'
      and not exists(select 1 from public.run_highlight_claims h where h.run_id=p_run and h.profile_id=actor and h.post_id=p.id)
    order by p.created_at desc limit 1;
  if chosen is null then raise exception 'Post a photo or video highlight from this run first'; end if;
  insert into public.run_highlight_claims(run_id,profile_id,post_id) values(p_run,actor,chosen)
    returning id into claim_id;
  awarded:=public.award_run_rep(actor,35,'run_highlight','run_highlight',claim_id);
  perform public.unlock_run_badges(actor);
  return query select case when awarded then 35 else 0 end,chosen;
end $$;
grant execute on function public.claim_latest_run_highlight(uuid) to authenticated;

-- Verified public Richmond basketball courts. City inventory reports 73 courts across these sites.
insert into public.basketball_locations(slug,name,address,locality,postal_code,area,venue_type,access_type,latitude,longitude,hours_text,source_label,source_url,last_verified_on,verification_status)
values
('alice-fitz-park','Alice Fitz Park','1301 Perry Street','Richmond','23224','Richmond','outdoor','public',37.5229971,-77.4496380,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('battery-park','Battery Park Community Center','2803 Dupont Circle','Richmond','23222','Richmond','outdoor','public',37.5694122,-77.4435567,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('bellemeade','Bellemeade Community Center','1800 Lynhaven Avenue','Richmond','23224','Richmond','outdoor','public',37.4963147,-77.4431713,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('bill-robinson','Bill Robinson Playground','721 North 35th Street','Richmond','23223','Richmond','outdoor','public',37.5301139,-77.4059217,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('blackwell','Blackwell Community Center','300 East 15th Street','Richmond','23224','Richmond','outdoor','public',37.5166451,-77.4465412,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('broad-rock-community','Broad Rock Community Center','4615 Ferguson Lane','Richmond','23234','Richmond','outdoor','public',37.4777051,-77.4818840,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('broad-rock-sports','Broad Rock Sports Complex','4825 Old Warwick Road','Richmond','23224','Richmond','outdoor','public',37.4838077,-77.4798149,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('chandler-playground','Chandler Playground','201 East Brookland Park Boulevard','Richmond','23222','Richmond','outdoor','public',37.5708993,-77.4320819,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('chimborazo','Chimborazo Playground','2900 East Grace Street','Richmond','23223','Richmond','outdoor','public',37.5257088,-77.4142906,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('creighton-court','Creighton Court Community Center','2101 Creighton Road','Richmond','23223','Richmond','outdoor','public',37.5445762,-77.3987537,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('fonticello','Fonticello Park','2813 Bainbridge Street','Richmond','23225','Richmond','outdoor','public',37.5149245,-77.4631454,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('hickory-hill','Hickory Hill Community Center','3000 Belt Boulevard','Richmond','23234','Richmond','outdoor','public',37.4797652,-77.4640497,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('holly-street','Holly Street Playground','819 Holly Street','Richmond','23220','Richmond','outdoor','public',37.5363040,-77.4548590,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('hotchkiss','Hotchkiss Field Community Center','701 East Brookland Park Boulevard','Richmond','23222','Richmond','outdoor','public',37.5698351,-77.4250284,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('humphrey-calder','Humphrey Calder Community Center','414 North Thompson Street','Richmond','23221','Richmond','outdoor','public',37.5625435,-77.4870414,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('marion-mashore','Marion Mashore Playground','2310 Decatur Street','Richmond','23224','Richmond','outdoor','public',37.5141090,-77.4552510,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('mary-munford','Mary Munford Playground','211 Westmoreland Street','Richmond','23226','Richmond','outdoor','public',37.5641778,-77.5018052,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('montrose-heights','Montrose Heights Playground','2022 Fenton Street','Richmond','23231','Richmond','outdoor','public',37.5230019,-77.3962451,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('oak-grove','Oak Grove Playground','2200 Gordon Avenue','Richmond','23224','Richmond','outdoor','public',37.5073169,-77.4464881,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('lucks-field','Lucks Field Park','1926 T Street','Richmond','23223','Richmond','outdoor','public',37.5444835,-77.4172485,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('pine-camp','Pine Camp Arts & Community Center','4901 Old Brook Road','Richmond','23227','Richmond','outdoor','public',37.5994593,-77.4479511,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('pocosham','Pocosham Park','2800 Templeton Road','Richmond','23225','Richmond','outdoor','public',37.4718218,-77.5060652,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('powhatan','Powhatan Community Center','5051 Northampton Street','Richmond','23231','Richmond','outdoor','public',37.5150787,-77.4068819,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('providence','Providence Park','460 Hunt Avenue','Richmond','23222','Richmond','outdoor','public',37.5806729,-77.4282914,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('randolph','Randolph Community Center','1415 Grayland Avenue','Richmond','23220','Richmond','outdoor','public',37.5439032,-77.4628317,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('swansboro','Swansboro Playground','3001 Logandale Avenue','Richmond','23225','Richmond','outdoor','public',37.5067027,-77.4599688,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('thomas-b-smith','Thomas B. Smith Community Center','2015 Ruffin Road','Richmond','23234','Richmond','mixed','public',37.4798739,-77.4389450,'Outdoor court: sunrise to sunset; center schedule varies','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('westwood','Westwood Playground','5409 Marion Street','Richmond','23226','Richmond','outdoor','public',37.5792230,-77.5118900,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official'),
('whitcomb-court','Whitcomb Court Community Center','2302 Carmine Street','Richmond','23223','Richmond','outdoor','public',37.5549085,-77.4180332,'Sunrise to sunset','City of Richmond PRCF','https://rva.gov/parks-recreation/about-department','2026-09-08','official')
on conflict(slug) do update set name=excluded.name,address=excluded.address,area=excluded.area,venue_type=excluded.venue_type,access_type=excluded.access_type,latitude=excluded.latitude,longitude=excluded.longitude,hours_text=excluded.hours_text,source_label=excluded.source_label,source_url=excluded.source_url,last_verified_on=excluded.last_verified_on,verification_status=excluded.verification_status,is_active=true,updated_at=now();

-- Regional indoor/open-gym and county court anchors. Schedules are shown only where a current provider schedule was found; otherwise users are told to confirm availability.
insert into public.basketball_locations(slug,name,address,locality,postal_code,area,venue_type,access_type,court_count,lights,hours_text,open_gym_text,open_gym_schedule,source_label,source_url,last_verified_on,verification_status,notes)
values
('deep-run-rec','Deep Run Park & Recreation Center','9900 Ridgefield Parkway','Henrico','23233','Henrico','mixed','free_pass',null,null,'Park dawn to dusk; recreation center hours vary by day','Recurring drop-in basketball: Adults 18+ Sunday 3-5 PM; teen basketball Tue/Thu 3-5 PM; youth basketball Monday 5:30-8 PM. Confirm the live Henrico OAP calendar before travel.',jsonb_build_array(jsonb_build_object('day','Sunday','label','Basketball 18+','time','3:00-5:00 PM'),jsonb_build_object('day','Tuesday','label','Teen Basketball 12-17','time','3:00-5:00 PM'),jsonb_build_object('day','Thursday','label','Teen Basketball 12-17','time','3:00-5:00 PM')),'Henrico Recreation & Parks','https://henrico.gov/rec/places/deep-run/','2026-09-28','official','Drop-in programs use a free access pass; provider calendar can change for closures.'),
('eastern-henrico-rec','Eastern Henrico Recreation Center','1440 N. Laburnum Avenue','Henrico','23223','Henrico','mixed','free_pass',null,null,'Mon-Thu 7 AM-9 PM; Fri 7 AM-8 PM; Sat 8 AM-5 PM; Sun 1-5 PM','Recurring drop-in basketball: Basketball 30+ Monday and Wednesday 5:30-8 PM; teen basketball Saturday 1-3 PM except first Saturday. Confirm the live Henrico OAP calendar before travel.',jsonb_build_array(jsonb_build_object('day','Monday','label','Basketball 30+','time','5:30-8:00 PM'),jsonb_build_object('day','Wednesday','label','Basketball 30+','time','5:30-8:00 PM'),jsonb_build_object('day','Saturday','label','Teen Basketball 12-17','time','1:00-3:00 PM')),'Henrico Recreation & Parks','https://henrico.gov/rec/places/ehrc/','2026-09-28','official','Drop-in programs use a free access pass; provider calendar can change for closures.'),
('beulah-rec','Beulah Recreation Center','6901 Hopkins Road','North Chesterfield','23234','Chesterfield','indoor','varies',null,null,'Daily 8:30 AM-10 PM','Open gym is offered; basketball availability varies with programming. Confirm with the center before travel.','[]'::jsonb,'Chesterfield County Parks & Recreation','https://www.chesterfield.gov/Facilities/Facility/Details/-408','2026-09-28','official',null),
('huguenot-park','Huguenot Park','10901 Robious Road','North Chesterfield','23235','Chesterfield','outdoor','public',null,null,'Park hours; confirm seasonal access',null,'[]'::jsonb,'Chesterfield County Parks & Recreation','https://www.chesterfield.gov/facilities/facility/details/Huguenot-Park-53','2026-09-28','official','Public basketball courts.'),
('harry-daniel-park','Harry G. Daniel Park at Iron Bridge','6600 Whitepine Road','North Chesterfield','23237','Chesterfield','outdoor','public',null,null,'Park hours; confirm seasonal access',null,'[]'::jsonb,'Chesterfield County Parks & Recreation','https://www.chesterfield.gov/Facilities/Facility/Details/Harry-G-Daniel-Park-at-Iron-Bridge-47','2026-09-28','official','Public basketball courts.'),
('matoaca-park','Matoaca Park','19900 Halloway Avenue','South Chesterfield','23803','Chesterfield','outdoor','public',2,true,'Park hours; confirm seasonal access',null,'[]'::jsonb,'Chesterfield County Parks & Recreation','https://www.chesterfield.gov/facilities/facility/details/Matoaca-Park-58','2026-09-28','official','Two lighted basketball courts.'),
('cogbill-park','Cogbill Park','6700 Cogbill Road','Chesterfield','23832','Chesterfield','outdoor','public',1,null,'First come, first use',null,'[]'::jsonb,'Chesterfield County Parks & Recreation','https://www.chesterfield.gov/Facilities/Facility/Details/Cogbill-Park-451','2026-09-28','official','Full-size basketball court.'),
('ettrick-park','Ettrick Park','20621 Woodpecker Road','South Chesterfield','23803','Chesterfield','outdoor','public',2,true,'Park hours; confirm seasonal access',null,'[]'::jsonb,'Chesterfield County Parks & Recreation','https://www.chesterfield.gov/Facilities/Facility/Details/Ettrick-Park-39','2026-09-28','official','Two lighted basketball courts.'),
('dodd-park','R. Garland Dodd Park at Point of Rocks','201 Enon Church Road','Chester','23836','Chesterfield','outdoor','public',2,true,'Park hours; confirm seasonal access',null,'[]'::jsonb,'Chesterfield County Parks & Recreation','https://www.chesterfield.gov/Facilities/Facility/Details/R-Garland-Dodd-Park-at-Point-of-Rocks-60','2026-09-28','official','Two lighted basketball courts.'),
('rockwood-park','Rockwood Park','3401 Courthouse Road','North Chesterfield','23236','Chesterfield','outdoor','public',3,true,'Park hours; confirm seasonal access',null,'[]'::jsonb,'Chesterfield County Parks & Recreation','https://www.chesterfield.gov/Facilities/Facility/Details/Rockwood-Park-70','2026-09-28','official','Three lighted basketball courts.'),
('virginia-randolph','Virginia Randolph Recreation Area','2175 Mountain Road','Glen Allen','23060','Henrico','outdoor','public',null,null,'Dawn to dusk',null,'[]'::jsonb,'Henrico Recreation & Parks','https://henrico.gov/rec/places/virginia-randolph-recreation-area/','2026-09-28','official','Outdoor public basketball courts.'),
('robinson-park-henrico','Robinson Park','214 Westover Avenue','Henrico','23223','Henrico','outdoor','public',null,null,'Dawn to dusk',null,'[]'::jsonb,'Henrico Recreation & Parks','https://henrico.gov/rec/places/robinson/','2026-09-28','official','Neighborhood park with basketball courts.'),
('downtown-ymca','Downtown YMCA','2 West Franklin Street','Richmond','23220','Richmond','indoor','membership',null,null,'Mon-Thu 5:30 AM-9 PM; Fri 5:30 AM-8 PM; Sat-Sun 8 AM-6 PM','Gymnasium access is membership/guest based; check the YMCA Richmond app for the daily gym schedule.','[]'::jsonb,'YMCA of Greater Richmond','https://www.ymcarichmond.org/locations/downtown-ymca/','2026-09-28','provider','Daily court availability changes with programs.'),
('chester-family-ymca','Chester Family YMCA','3011 W Hundred Road','Chester','23831','Chesterfield','mixed','membership',null,null,'Branch hours vary by day','Gymnasium and outdoor basketball court; check the YMCA Richmond app for daily availability.','[]'::jsonb,'YMCA of Greater Richmond','https://www.ymcarichmond.org/locations/chester-family-ymca/','2026-09-28','provider','Membership/guest access.'),
('chickahominy-ymca','Chickahominy Family YMCA','5401 Whiteside Road','Sandston','23150','Henrico','outdoor','membership',null,null,'Branch hours vary by day','Outdoor basketball court; check YMCA Richmond app for current access and programming.','[]'::jsonb,'YMCA of Greater Richmond','https://www.ymcarichmond.org/locations/chickahominy-family-ymca/','2026-09-28','provider','Membership/guest access.')
on conflict(slug) do update set name=excluded.name,address=excluded.address,locality=excluded.locality,postal_code=excluded.postal_code,area=excluded.area,venue_type=excluded.venue_type,access_type=excluded.access_type,court_count=excluded.court_count,lights=excluded.lights,hours_text=excluded.hours_text,open_gym_text=excluded.open_gym_text,open_gym_schedule=excluded.open_gym_schedule,source_label=excluded.source_label,source_url=excluded.source_url,last_verified_on=excluded.last_verified_on,verification_status=excluded.verification_status,notes=excluded.notes,is_active=true,updated_at=now();

commit;
