begin;

-- RCH Runs Partner HQ: a vetted organization layer above the existing Runs,
-- queue, verified-score, REP and badge systems. No third-party brand is seeded
-- or represented as a partner without its own approved application.
create table public.rch_runs_partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 5 and 96),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 3 and 120),
  city text not null check (char_length(city) between 2 and 100),
  description text not null default '' check (char_length(description)<=1200),
  instagram_url text,
  logo_url text,
  brand_color text not null default '#3b82f6' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  status text not null default 'pending'
    check (status in ('pending','approved','declined','suspended')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rch_runs_partner_instagram_https check (instagram_url is null or instagram_url ~* '^https://(www[.])?instagram[.]com/[a-z0-9_.]+/?$'),
  constraint rch_runs_partner_logo_https check (logo_url is null or logo_url ~* '^https://[^[:space:]]+$')
);
create index rch_runs_partners_owner_idx on public.rch_runs_partners(owner_id,status);
create index rch_runs_partners_directory_idx on public.rch_runs_partners(status,city,name);

create table public.rch_runs_partner_members (
  partner_id uuid not null references public.rch_runs_partners(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('manager','scorekeeper')),
  appointed_by uuid not null references public.profiles(id),
  appointed_at timestamptz not null default now(),
  primary key(partner_id,profile_id)
);
create index rch_runs_partner_members_profile_idx on public.rch_runs_partner_members(profile_id,role);

create table public.rch_runs_partner_sessions (
  run_id uuid primary key references public.runs(id) on delete cascade,
  partner_id uuid not null references public.rch_runs_partners(id) on delete restrict,
  experience text not null check (experience in ('park','rec')),
  price_cents integer not null default 0 check (price_cents between 0 and 50000),
  session_notes text not null default '' check (char_length(session_notes)<=600),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index rch_partner_sessions_by_partner on public.rch_runs_partner_sessions(partner_id,created_at desc);

alter table public.rch_runs_partners enable row level security;
alter table public.rch_runs_partner_members enable row level security;
alter table public.rch_runs_partner_sessions enable row level security;
revoke all on public.rch_runs_partners,public.rch_runs_partner_members,
  public.rch_runs_partner_sessions from public,anon,authenticated;
grant select on public.rch_runs_partners,public.rch_runs_partner_sessions to anon,authenticated;
grant select on public.rch_runs_partner_members to authenticated;

-- Partner approval is a specific, human-reviewed claim. A suspended/expired
-- host credential removes the public badge even if the partner row remains.
create policy rch_partner_public_or_owner_read on public.rch_runs_partners
 for select to anon,authenticated using (
  (status='approved' and exists(
    select 1 from public.rch_verified_run_hosts h
    where h.profile_id=owner_id and h.verification_status='approved' and h.expires_at>now()))
  or owner_id=(select auth.uid())
  or coalesce(public.is_staff_or_admin(),false)
 );
create policy rch_partner_member_scoped_read on public.rch_runs_partner_members
 for select to authenticated using (
  profile_id=(select auth.uid())
  or exists (select 1 from public.rch_runs_partners p
    where p.id=partner_id and p.owner_id=(select auth.uid()))
  or coalesce(public.is_staff_or_admin(),false)
 );
create policy rch_partner_sessions_scoped_read on public.rch_runs_partner_sessions
 for select to anon,authenticated using (
  exists (select 1 from public.rch_runs_partners p
    where p.id=partner_id and (
      (p.status='approved' and exists(select 1 from public.rch_verified_run_hosts h
        where h.profile_id=p.owner_id and h.verification_status='approved' and h.expires_at>now()))
      or p.owner_id=(select auth.uid())
      or coalesce(public.is_staff_or_admin(),false)))
 );

create or replace function public.rch_apply_runs_partner(
 p_name text,p_city text,p_description text,p_instagram text default null,
 p_logo text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();v_id uuid;v_slug text;
begin
 if a is null or not exists(select 1 from public.profiles x
     where x.id=a and x.is_active and not coalesce(x.is_system_account,false))
 then raise exception 'A current member profile is required'; end if;
 if char_length(trim(coalesce(p_name,''))) not between 3 and 120
   or char_length(trim(coalesce(p_city,''))) not between 2 and 100
   or char_length(trim(coalesce(p_description,'')))>1200
 then raise exception 'Enter a name, city, and description within the limits'; end if;
 if nullif(trim(coalesce(p_instagram,'')),'') is not null
    and trim(p_instagram) !~* '^https://(www[.])?instagram[.]com/[a-z0-9_.]+/?$'
 then raise exception 'Enter an Instagram profile URL'; end if;
 if nullif(trim(coalesce(p_logo,'')),'') is not null
    and (trim(p_logo) !~* '^https://[^[:space:]]+$' or length(trim(p_logo))>500)
 then raise exception 'Logo must be an HTTPS image URL'; end if;
 if (select count(*) from public.rch_runs_partners p
     where p.owner_id=a and p.created_at>now()-interval '90 days')>=4
 then raise exception 'Too many new partner requests'; end if;
 v_slug:=left(trim(both '-' from lower(regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','-','g'))),72)
         ||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8);
 insert into public.rch_runs_partners(slug,owner_id,name,city,description,instagram_url,logo_url)
 values(v_slug,a,trim(p_name),trim(p_city),trim(coalesce(p_description,'')),
 nullif(trim(coalesce(p_instagram,'')),''),nullif(trim(coalesce(p_logo,'')),''))
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.rch_review_runs_partner(
 p_partner uuid,p_decision text,p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();p public.rch_runs_partners%rowtype;
begin
 if a is null or not coalesce(public.is_staff_or_admin(),false)
 then raise exception 'RCH operations staff only'; end if;
 if p_decision not in ('approved','declined','suspended')
    or char_length(trim(coalesce(p_note,''))) not between 8 and 500
 then raise exception 'Valid decision and review note (8–500 characters) required'; end if;
 select * into p from public.rch_runs_partners where id=p_partner for update;
 if p.id is null then raise exception 'Partner not found'; end if;
 if p.owner_id=a then raise exception 'You cannot approve your own organization'; end if;
 if p_decision='approved' and not exists(select 1 from public.rch_verified_run_hosts h
   where h.profile_id=p.owner_id and h.verification_status='approved' and h.expires_at>now())
 then raise exception 'Partner owner must first become a verified Runs host'; end if;
 update public.rch_runs_partners
 set status=p_decision,review_note=trim(p_note),reviewed_by=a,reviewed_at=now(),updated_at=now()
 where id=p_partner;
end $$;

create or replace function public.rch_update_runs_partner(
 p_partner uuid,p_name text,p_city text,p_description text,p_instagram text,
 p_logo text,p_color text
) returns void language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();p public.rch_runs_partners%rowtype;
begin
 if a is null then raise exception 'Sign in'; end if;
 select * into p from public.rch_runs_partners where id=p_partner for update;
 if p.id is null or not (
    p.owner_id=a or exists(select 1 from public.rch_runs_partner_members m
    where m.partner_id=p.id and m.profile_id=a and m.role='manager'))
 then raise exception 'Partner management access required'; end if;
 if p.status='approved' and trim(coalesce(p_name,''))<>p.name
 then raise exception 'Changing an approved organization name requires fresh RCH review'; end if;
 if char_length(trim(coalesce(p_name,''))) not between 3 and 120
    or char_length(trim(coalesce(p_city,''))) not between 2 and 100
    or char_length(trim(coalesce(p_description,'')))>1200
    or p_color !~ '^#[0-9a-fA-F]{6}$'
 then raise exception 'Check your branding fields'; end if;
 if nullif(trim(coalesce(p_instagram,'')),'') is not null
    and trim(p_instagram) !~* '^https://(www[.])?instagram[.]com/[a-z0-9_.]+/?$'
 then raise exception 'Invalid Instagram profile URL'; end if;
 if nullif(trim(coalesce(p_logo,'')),'') is not null
    and (trim(p_logo) !~* '^https://[^[:space:]]+$' or length(trim(p_logo))>500)
 then raise exception 'Invalid HTTPS logo URL'; end if;
 update public.rch_runs_partners set name=trim(p_name),city=trim(p_city),
  description=trim(coalesce(p_description,'')),
  instagram_url=nullif(trim(coalesce(p_instagram,'')),''),
  logo_url=nullif(trim(coalesce(p_logo,'')),''),
  brand_color=p_color,updated_at=now() where id=p_partner;
end $$;

create or replace function public.rch_manage_runs_partner_member(
 p_partner uuid,p_username text,p_role text,p_enabled boolean
) returns void language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();v_target uuid;
begin
 if a is null or not exists(select 1 from public.rch_runs_partners p
   where p.id=p_partner and p.owner_id=a and p.status='approved')
 then raise exception 'Only the approved partner owner may appoint staff'; end if;
 if p_role not in ('manager','scorekeeper')
    or char_length(trim(coalesce(p_username,''))) not between 2 and 64
 then raise exception 'Enter an RCH username and supported role'; end if;
 select id into v_target from public.profiles
  where lower(username::text)=lower(trim(both '@' from trim(p_username)))
    and is_active and not coalesce(is_system_account,false) limit 1;
 if v_target is null or v_target=a then raise exception 'Choose a different active RCH member'; end if;
 if p_enabled then
  if (select count(*) from public.rch_runs_partner_members where partner_id=p_partner)>=12
    and not exists(select 1 from public.rch_runs_partner_members where partner_id=p_partner and profile_id=v_target)
  then raise exception 'Maximum of 12 staff accounts per partner'; end if;
  insert into public.rch_runs_partner_members(partner_id,profile_id,role,appointed_by)
  values(p_partner,v_target,p_role,a)
  on conflict(partner_id,profile_id) do update set role=excluded.role,
   appointed_by=excluded.appointed_by,appointed_at=now();
 else
  delete from public.rch_runs_partner_members
   where partner_id=p_partner and profile_id=v_target;
 end if;
end $$;

-- Removing or downgrading a delegated manager also revokes the cohost
-- appointment created by the HQ for that person's own published runs.
create or replace function public.rch_partner_revoke_delegated_run_ops()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' or (tg_op='UPDATE' and new.role<>'manager' and old.role='manager') then
  delete from public.rch_run_operators o using public.rch_runs_partner_sessions s
   where s.run_id=o.run_id and s.partner_id=old.partner_id
     and s.created_by=old.profile_id and o.profile_id=old.profile_id
     and o.appointed_by=(select p.owner_id from public.rch_runs_partners p where p.id=old.partner_id)
     and o.role='cohost';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger rch_partner_member_scope_removed
 after delete or update of role on public.rch_runs_partner_members
 for each row execute function public.rch_partner_revoke_delegated_run_ops();
revoke all on function public.rch_partner_revoke_delegated_run_ops() from public,anon,authenticated;

-- Creates a normal Run and links the partner to it in one transaction. Manager
-- access is delegated only for this organization and this newly created run.
-- No submitted results, REP or earned badges are generated here.
create or replace function public.rch_create_runs_partner_session(
 p_partner uuid,p_title text,p_location text,p_starts timestamptz,
 p_format text,p_experience text,p_capacity integer,p_price_cents integer,
 p_description text,p_court_slug text
) returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();p public.rch_runs_partners%rowtype;
 v_court text;v_run uuid;v_owner uuid;
begin
 if a is null then raise exception 'Sign in to schedule a Run'; end if;
 select * into p from public.rch_runs_partners where id=p_partner for update;
 if p.id is null or p.status<>'approved'
   or not (p.owner_id=a or exists(select 1 from public.rch_runs_partner_members m
       where m.partner_id=p_partner and m.profile_id=a and m.role='manager'))
 then raise exception 'Approved Runs partner manager access required'; end if;
 if not exists(select 1 from public.rch_verified_run_hosts h
   where h.profile_id=p.owner_id and h.verification_status='approved' and h.expires_at>now())
 then raise exception 'Partner host verification is not currently active'; end if;
 if char_length(trim(coalesce(p_title,''))) not between 5 and 120
    or char_length(trim(coalesce(p_location,''))) not between 5 and 300
    or char_length(trim(coalesce(p_description,'')))>1600
    or p_starts is null or p_starts<now()+interval '10 minutes'
    or p_starts>now()+interval '180 days'
    or p_format not in ('1v1','2v2','3v3','4v4','5v5')
    or p_experience not in ('park','rec')
    or p_capacity not between 2 and 50
    or p_price_cents not between 0 and 50000
 then raise exception 'Check the title, location, future date, format, capacity and price'; end if;
 if nullif(trim(coalesce(p_court_slug,'')),'') is not null then
  select name into v_court from public.basketball_locations
   where slug=p_court_slug and is_active;
  if v_court is null then raise exception 'Choose an active mapped court or leave it unlinked'; end if;
 end if;
 insert into public.runs(host_id,title,description,run_type,skill_level,court_name,
  location,starts_at,capacity,max_players,status,game_format,location_slug,allow_fan_checkin)
 values(p.owner_id,trim(p_title),nullif(trim(coalesce(p_description,'')),''),
  'competitive','all',coalesce(v_court,left(trim(p_location),160)),
  trim(p_location),p_starts,p_capacity,p_capacity,'open',p_format,
  nullif(trim(coalesce(p_court_slug,'')),''),true)
 returning id into v_run;
 insert into public.rch_runs_partner_sessions(run_id,partner_id,experience,price_cents,created_by)
 values(v_run,p_partner,p_experience,p_price_cents,a);
 if a<>p.owner_id then
  insert into public.rch_run_operators(run_id,profile_id,role,appointed_by)
  values(v_run,a,'cohost',p.owner_id);
 end if;
 return v_run;
end $$;

create or replace function public.rch_partner_hq_metrics(p_partner uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a uuid:=auth.uid();v_result jsonb;
begin
 if a is null or not (
   exists(select 1 from public.rch_runs_partners p where p.id=p_partner and p.owner_id=a)
   or exists(select 1 from public.rch_runs_partner_members m where m.partner_id=p_partner and m.profile_id=a)
   or coalesce(public.is_staff_or_admin(),false))
 then raise exception 'This partner dashboard is private'; end if;
 select pg_catalog.jsonb_build_object(
  'total_sessions',(select count(*) from public.rch_runs_partner_sessions s where s.partner_id=p_partner),
  'upcoming_sessions',(select count(*) from public.rch_runs_partner_sessions s
      join public.runs r on r.id=s.run_id where s.partner_id=p_partner
      and r.starts_at>now() and r.status in ('open','full')),
  'total_checkins',(select count(*) from public.run_checkins c
      join public.rch_runs_partner_sessions s on s.run_id=c.run_id where s.partner_id=p_partner),
  'unique_attendees',(select count(distinct c.profile_id) from public.run_checkins c
      join public.rch_runs_partner_sessions s on s.run_id=c.run_id where s.partner_id=p_partner),
  'repeat_attendees',(select count(*) from (
     select c.profile_id from public.run_checkins c
     join public.rch_runs_partner_sessions s on s.run_id=c.run_id
     where s.partner_id=p_partner group by c.profile_id having count(distinct c.run_id)>=2
   ) repeat_players),
  'verified_matches',(select count(*) from public.run_ranked_matches m
      join public.rch_runs_partner_sessions s on s.run_id=m.run_id
      where s.partner_id=p_partner and m.status='verified'),
  'waiting_players',(select count(*) from public.rch_run_queue q
      join public.rch_runs_partner_sessions s on s.run_id=q.run_id
      where s.partner_id=p_partner and q.status in ('waiting','called'))
 ) into v_result;
 return v_result;
end $$;

revoke all on function public.rch_apply_runs_partner(text,text,text,text,text),
 public.rch_review_runs_partner(uuid,text,text),
 public.rch_update_runs_partner(uuid,text,text,text,text,text,text),
 public.rch_manage_runs_partner_member(uuid,text,text,boolean),
 public.rch_create_runs_partner_session(uuid,text,text,timestamptz,text,text,integer,integer,text,text),
 public.rch_partner_hq_metrics(uuid)
 from public,anon,authenticated;
grant execute on function public.rch_apply_runs_partner(text,text,text,text,text),
 public.rch_review_runs_partner(uuid,text,text),
 public.rch_update_runs_partner(uuid,text,text,text,text,text,text),
 public.rch_manage_runs_partner_member(uuid,text,text,boolean),
 public.rch_create_runs_partner_session(uuid,text,text,timestamptz,text,text,integer,integer,text,text),
 public.rch_partner_hq_metrics(uuid)
 to authenticated;
commit;
