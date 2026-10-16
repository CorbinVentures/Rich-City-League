begin;

-- Verified Hosts are a human-reviewed operations credential, NOT a background
-- check, guarantee of personal safety, or competitive ranking advantage.
create table public.rch_run_host_applications (
 id uuid primary key default gen_random_uuid(),
 applicant_id uuid not null references public.profiles(id) on delete cascade,
 organization_name text not null check(char_length(organization_name) between 2 and 120),
 locality text not null check(char_length(locality) between 2 and 120),
 organizer_experience text not null check(char_length(organizer_experience) between 40 and 1600),
 public_website text check(public_website is null or char_length(public_website)<=350),
 status text not null default 'pending' check(status in ('pending','approved','declined','needs_info')),
 reviewed_by uuid references public.profiles(id),
 review_note text,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index rch_one_pending_verified_host_application
 on public.rch_run_host_applications(applicant_id) where status='pending';
create index rch_verified_host_applications_review_idx
 on public.rch_run_host_applications(status,created_at);

create table public.rch_verified_run_hosts (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 verification_status text not null check(verification_status in ('approved','suspended')),
 verified_by uuid not null references public.profiles(id),
 verified_at timestamptz not null default now(),
 expires_at timestamptz not null,
 suspended_at timestamptz,
 updated_at timestamptz not null default now()
);
create index rch_verified_hosts_status_idx on public.rch_verified_run_hosts(verification_status,expires_at);

-- Community court locations can become eligible after an authorized physical
-- review; source-imported community status alone never guarantees access.
create table public.rch_court_site_reviews (
 court_slug text primary key references public.basketball_locations(slug) on delete cascade,
 approved boolean not null default false,
 reviewed_by uuid not null references public.profiles(id),
 note text not null check(char_length(note) between 12 and 600),
 reviewed_at timestamptz not null default now(),
 expires_at timestamptz not null
);
create index rch_site_reviews_active_idx on public.rch_court_site_reviews(approved,expires_at);

create table public.rch_run_verifications (
 run_id uuid primary key references public.runs(id) on delete cascade,
 verification_status text not null default 'verified' check(verification_status in ('verified','revoked')),
 verified_by uuid not null references public.profiles(id),
 verified_at timestamptz not null default now(),
 revoked_at timestamptz,
 revoked_by uuid references public.profiles(id),
 review_note text not null check(char_length(review_note)<=500)
);
create index rch_run_verifications_status_idx on public.rch_run_verifications(verification_status,verified_at desc);

alter table public.rch_run_host_applications enable row level security;
alter table public.rch_verified_run_hosts enable row level security;
alter table public.rch_court_site_reviews enable row level security;
alter table public.rch_run_verifications enable row level security;
revoke all on public.rch_run_host_applications,public.rch_verified_run_hosts,
 public.rch_court_site_reviews,public.rch_run_verifications from public,anon,authenticated;
grant select on public.rch_run_host_applications,public.rch_verified_run_hosts,
 public.rch_court_site_reviews,public.rch_run_verifications to authenticated;
grant select on public.rch_verified_run_hosts,public.rch_run_verifications to anon;

create policy rch_host_application_private on public.rch_run_host_applications
 for select to authenticated
 using(applicant_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));
create policy rch_verified_host_public on public.rch_verified_run_hosts
 for select to anon,authenticated
 using((verification_status='approved' and expires_at>now()
   and exists(select 1 from public.profiles p where p.id=profile_id and p.is_active
      and coalesce(p.profile_visibility,'public') not in ('private','only_me')))
   or profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));
create policy rch_court_review_staff_read on public.rch_court_site_reviews
 for select to authenticated using(coalesce(public.is_staff_or_admin(),false));
create policy rch_verified_run_public on public.rch_run_verifications
 for select to anon,authenticated
 using(verification_status='verified'
  or exists(select 1 from public.runs r where r.id=run_id and r.host_id=(select auth.uid()))
  or coalesce(public.is_staff_or_admin(),false));

create or replace function public.rch_apply_verified_run_host(
 p_organization text,p_locality text,p_experience text,p_website text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_id uuid;
begin
 if v_actor is null then raise exception 'Sign in as a member to apply'; end if;
 if not exists(select 1 from public.profiles p where p.id=v_actor and p.is_active
   and not coalesce(p.is_system_account,false))
 then raise exception 'A current member profile is required'; end if;
 if char_length(trim(coalesce(p_organization,''))) not between 2 and 120
   or char_length(trim(coalesce(p_locality,''))) not between 2 and 120
   or char_length(trim(coalesce(p_experience,''))) not between 40 and 1600
   or char_length(coalesce(p_website,''))>350
 then raise exception 'Provide your organization, Virginia locality and 40 to 1600 characters of hosting experience'; end if;
 if p_website is not null and trim(p_website)<>'' and p_website !~* '^https://[a-z0-9][a-z0-9.-]+(/[^ ]*)?$'
 then raise exception 'Use an HTTPS public website URL, or leave it empty'; end if;
 if exists(select 1 from public.rch_verified_run_hosts h
    where h.profile_id=v_actor and h.verification_status='approved' and h.expires_at>now())
 then raise exception 'Your hosting credential is already active'; end if;
 if (select count(*) from public.rch_run_host_applications a
   where a.applicant_id=v_actor and a.created_at>=now()-interval '90 days')>=3
 then raise exception 'Limit of three applications in 90 days'; end if;
 insert into public.rch_run_host_applications(
  applicant_id,organization_name,locality,organizer_experience,public_website)
 values(v_actor,trim(p_organization),trim(p_locality),trim(p_experience),
   nullif(trim(coalesce(p_website,'')),''))
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.rch_review_verified_run_host(
 p_application uuid,p_decision text,p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_app public.rch_run_host_applications%rowtype;
begin
 if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
   raise exception 'Only RCH operations staff may approve host credentials'; end if;
 if p_decision not in ('approved','declined','needs_info') or
   char_length(trim(coalesce(p_note,''))) not between 8 and 500
 then raise exception 'Choose a valid decision and enter 8-500 characters of review evidence'; end if;
 select * into v_app from public.rch_run_host_applications where id=p_application for update;
 if v_app.id is null or v_app.status<>'pending' then raise exception 'Only pending applications may be reviewed'; end if;
 update public.rch_run_host_applications set status=p_decision,
  review_note=trim(p_note),reviewed_by=v_actor,reviewed_at=now() where id=p_application;
 if p_decision='approved' then
  insert into public.rch_verified_run_hosts(profile_id,verification_status,verified_by,expires_at)
   values(v_app.applicant_id,'approved',v_actor,now()+interval '365 days')
   on conflict(profile_id) do update set verification_status='approved',
     verified_by=excluded.verified_by,verified_at=now(),
     expires_at=excluded.expires_at,suspended_at=null,updated_at=now();
 end if;
end $$;

create or replace function public.rch_review_court_for_runs(
 p_court text,p_approved boolean,p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
   raise exception 'Only RCH operations staff can validate court conditions'; end if;
 if char_length(trim(coalesce(p_note,''))) not between 12 and 600 then
   raise exception 'Document the court review in 12-600 characters'; end if;
 if not exists(select 1 from public.basketball_locations l where l.slug=p_court and l.is_active)
 then raise exception 'Select an active Virginia court'; end if;
 insert into public.rch_court_site_reviews(court_slug,approved,reviewed_by,note,expires_at)
 values(p_court,coalesce(p_approved,false),v_actor,trim(p_note),now()+interval '180 days')
 on conflict(court_slug) do update set
  approved=excluded.approved,reviewed_by=excluded.reviewed_by,
  note=excluded.note,reviewed_at=now(),expires_at=excluded.expires_at;
end $$;

create or replace function public.rch_certify_verified_run(
 p_run uuid,p_approve boolean,p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_run public.runs%rowtype;
begin
 if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
   raise exception 'Only RCH operations staff can certify a verified Run'; end if;
 if char_length(trim(coalesce(p_note,''))) not between 8 and 500 then
   raise exception 'Provide 8-500 characters describing the review'; end if;
 select * into v_run from public.runs where id=p_run for update;
 if v_run.id is null then raise exception 'Run not found'; end if;
 if p_approve then
  if v_run.status not in ('open','full') or v_run.starts_at<now()-interval '2 hours'
    or v_run.starts_at>now()+interval '30 days'
  then raise exception 'Only upcoming Runs can receive active verification'; end if;
  if not exists(select 1 from public.rch_verified_run_hosts h
    where h.profile_id=v_run.host_id and h.verification_status='approved' and h.expires_at>now())
  then raise exception 'The Run host needs an active, human-approved hosting credential'; end if;
  if v_run.location_slug is null or not exists(
    select 1 from public.basketball_locations l where l.slug=v_run.location_slug and l.is_active
     and (l.verification_status in ('official','provider')
      or exists(select 1 from public.rch_court_site_reviews s
        where s.court_slug=l.slug and s.approved and s.expires_at>now())))
  then raise exception 'This court needs an official/provider source or a current RCH site review'; end if;
  if (select count(*) from public.rch_run_operations o
    where o.run_id=p_run and o.completed
      and o.task_code in ('venue_confirmed','rules_briefed','safety_reviewed'))<>3
  then raise exception 'Confirm venue, rules and safety readiness in Run Operations HQ'; end if;
  if v_run.run_type='competitive' and not exists(
   select 1 from public.rch_run_operators o where o.run_id=p_run and o.role='official')
  then raise exception 'A competitive RCH Verified Run requires an appointed independent official'; end if;
 end if;
 insert into public.rch_run_verifications(run_id,verification_status,verified_by,review_note,revoked_at,revoked_by)
 values(p_run,case when p_approve then 'verified' else 'revoked' end,v_actor,trim(p_note),
   case when p_approve then null else now() end,case when p_approve then null else v_actor end)
 on conflict(run_id) do update set
  verification_status=excluded.verification_status,verified_by=excluded.verified_by,
  verified_at=case when p_approve then now() else public.rch_run_verifications.verified_at end,
  review_note=excluded.review_note,revoked_at=excluded.revoked_at,revoked_by=excluded.revoked_by;
end $$;

-- Changing material facts (including venue and organizer) automatically removes
-- an issued badge; this prevents approval being reused for another event.
create or replace function public.rch_revoke_modified_verified_run()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.host_id is distinct from new.host_id
   or old.location_slug is distinct from new.location_slug
   or old.location is distinct from new.location
   or old.starts_at is distinct from new.starts_at
   or old.game_format is distinct from new.game_format
   or old.run_type is distinct from new.run_type
   or new.status='cancelled'
 then
  update public.rch_run_verifications set verification_status='revoked',
   revoked_at=now(),review_note='Material Run details changed after verification'
   where run_id=new.id and verification_status='verified';
 end if;
 return new;
end $$;
create trigger rch_revoke_modified_verified_run after update on public.runs
 for each row execute function public.rch_revoke_modified_verified_run();

-- Authenticated queue participants now receive genuine realtime Next Up events.
do $$ begin
 if exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime')
  and not exists(select 1 from pg_catalog.pg_publication_tables
     where pubname='supabase_realtime' and schemaname='public'
       and tablename='rch_run_queue')
 then execute 'alter publication supabase_realtime add table public.rch_run_queue'; end if;
end $$;

revoke all on function public.rch_apply_verified_run_host(text,text,text,text),
 public.rch_review_verified_run_host(uuid,text,text),
 public.rch_review_court_for_runs(text,boolean,text),
 public.rch_certify_verified_run(uuid,boolean,text),
 public.rch_revoke_modified_verified_run()
 from public,anon,authenticated;
grant execute on function public.rch_apply_verified_run_host(text,text,text,text),
 public.rch_review_verified_run_host(uuid,text,text),
 public.rch_review_court_for_runs(text,boolean,text),
 public.rch_certify_verified_run(uuid,boolean,text) to authenticated;
commit;