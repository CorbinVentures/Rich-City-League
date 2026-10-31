-- Phase 2A: RCH Sites Amateur adult-only basketball programs, rosters and coaching sessions.
-- Repository migration only. Apply and pgTAP-test in isolated staging before production.
-- A private rollout flag defaults OFF. No Network/PayPal/RCH League tables are modified.
create extension if not exists btree_gist with schema extensions;

create table public.rch_site_amateur_rollout (
 id boolean primary key default true check (id=true),
 enabled boolean not null default false,
 pilot_organization_id uuid references public.network_organizations(id)
);
insert into public.rch_site_amateur_rollout(id,enabled) values(true,false);

create table public.rch_site_amateur_programs (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.network_organizations(id) on delete cascade,
 name text not null check (char_length(name) between 3 and 90),
 kind text not null check(kind in ('training','team','tryout','camp')),
 capacity integer not null check (capacity between 1 and 100),
 status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now(),
 unique(id,organization_id)
);
create index rch_site_amateur_programs_org_idx on public.rch_site_amateur_programs(organization_id,status,kind);

create table public.rch_site_amateur_registrations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 program_id uuid not null,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'registered' check(status in ('registered','withdrawn')),
 registered_at timestamptz not null default now(),
 unique(program_id,profile_id),
 foreign key(program_id,organization_id) references public.rch_site_amateur_programs(id,organization_id) on delete cascade
);
create index rch_site_amateur_registrations_org_idx
 on public.rch_site_amateur_registrations(organization_id,status,program_id);

create table public.rch_site_amateur_sessions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 program_id uuid not null,
 coach_profile_id uuid not null references public.profiles(id) on delete restrict,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 status text not null default 'scheduled' check (status in ('scheduled','cancelled')),
 created_at timestamptz not null default now(),
 foreign key(program_id,organization_id) references public.rch_site_amateur_programs(id,organization_id) on delete cascade,
 check (ends_at>starts_at and ends_at<=starts_at+interval '4 hours')
);
alter table public.rch_site_amateur_sessions add constraint rch_site_amateur_coach_no_overlap
 exclude using gist (organization_id with =,coach_profile_id with =,tstzrange(starts_at,ends_at,'[)') with &&)
 where(status='scheduled');
create index rch_site_amateur_sessions_org_idx on public.rch_site_amateur_sessions(organization_id,starts_at);

-- Lock the PRIVATE dedicated website subscription row; never accept a plan from a request.
-- This serializes quota checks for concurrent program and distinct adult roster writes.
create function public.rch_site_amateur_verify_paid(p_org uuid)
returns text language plpgsql security invoker set search_path=public,pg_temp as $$
declare t text; s text; paid_until timestamptz;
begin
 if not coalesce((select enabled and pilot_organization_id=p_org
  from public.rch_site_amateur_rollout where id=true),false) then
   raise exception 'Amateur operations are not yet enabled' using errcode='23514';
 end if;
 select tier,billing_status,current_period_end into t,s,paid_until
   from public.rch_site_subscriptions where organization_id=p_org for update;
 if not found or t not in ('amateur','professional') or s<>'active'
     or paid_until is null or paid_until<=now() then
   raise exception 'An active paid website plan is required' using errcode='23514';
 end if;
 if not exists (
   select 1 from public.network_organizations o where o.id=p_org and o.status='active'
   and o.is_verified=true and o.is_claimed=true and o.network_tier<>'flagship'
   and o.organization_type in ('training','program','team','tournament','league','facility')
 ) then raise exception 'Organization not eligible' using errcode='23514'; end if;
 return t;
end; $$;

create function public.rch_site_amateur_program_guard()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare t text; used bigint; allowed integer;
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.organization_id<>old.organization_id or new.kind<>old.kind
    then raise exception 'Program identity is immutable' using errcode='23514'; end if;
  if old.status='open' and new.status='closed' then return new; end if;
 end if;
 t:=public.rch_site_amateur_verify_paid(new.organization_id);
 if tg_op='INSERT' then
   if new.kind='team' then allowed:=case when t='amateur' then 5 else 40 end;
   else allowed:=case when t='amateur' then 3 else 20 end; end if;
   select count(*) into used from public.rch_site_amateur_programs
    where organization_id=new.organization_id and status='open'
       and (kind='team')=(new.kind='team');
   if used>=allowed then raise exception 'Program allowance reached' using errcode='P0001'; end if;
 end if;
 return new;
end; $$;
create trigger rch_site_amateur_program_guard_trigger before insert or update
 on public.rch_site_amateur_programs for each row
 execute function public.rch_site_amateur_program_guard();

create function public.rch_site_amateur_registration_guard()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.rch_site_amateur_programs%rowtype; t text; used bigint; allowed integer;
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.organization_id<>old.organization_id or new.program_id<>old.program_id
   or new.profile_id<>old.profile_id then
    raise exception 'Registration identity is immutable' using errcode='23514'; end if;
  if old.status='registered' and new.status='withdrawn' then return new; end if;
 end if;
 t:=public.rch_site_amateur_verify_paid(new.organization_id);
 select * into p from public.rch_site_amateur_programs where id=new.program_id
  and organization_id=new.organization_id for update;
 if not found or p.status<>'open' then
   raise exception 'Program registration is closed' using errcode='23514'; end if;
 if not exists(select 1 from public.profiles pr where pr.id=new.profile_id
   and pr.is_active=true and pr.onboarding_complete=true
   and pr.date_of_birth is not null
   and pr.date_of_birth <= (current_date - interval '18 years')::date) then
   raise exception 'Adult RCH profile required' using errcode='23514'; end if;
 select count(*) into used from public.rch_site_amateur_registrations
   where program_id=p.id and status='registered' and id<>new.id;
 if used>=p.capacity then raise exception 'Program is full' using errcode='P0001'; end if;
 allowed:=case when t='amateur' then 100 else 500 end;
 if not exists(select 1 from public.rch_site_amateur_registrations
   where organization_id=new.organization_id and profile_id=new.profile_id and status='registered'
     and id<>new.id) then
  select count(distinct profile_id) into used from public.rch_site_amateur_registrations
   where organization_id=new.organization_id and status='registered' and id<>new.id;
  if used>=allowed then raise exception 'Adult participant allowance reached' using errcode='P0001'; end if;
 end if;
 return new;
end; $$;
create trigger rch_site_amateur_registration_guard_trigger
 before insert or update on public.rch_site_amateur_registrations
 for each row execute function public.rch_site_amateur_registration_guard();

create function public.rch_site_amateur_session_guard()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare t text; used bigint; allowed integer;
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.organization_id<>old.organization_id or new.program_id<>old.program_id
   or new.coach_profile_id<>old.coach_profile_id or new.starts_at<>old.starts_at
   or new.ends_at<>old.ends_at then
    raise exception 'Session identity is immutable' using errcode='23514'; end if;
  if old.status='scheduled' and new.status='cancelled' then return new; end if;
 end if;
 t:=public.rch_site_amateur_verify_paid(new.organization_id);
 -- Serialize scheduled-session quotas with the website subscription row lock.
 allowed:=case when t='amateur' then 150 else 600 end;
 select count(*) into used from public.rch_site_amateur_sessions
   where organization_id=new.organization_id and status='scheduled'
     and starts_at>now() and id<>new.id;
 if used>=allowed then raise exception 'Future session allowance reached' using errcode='P0001'; end if;
 if new.starts_at<=now()+interval '2 hours'
  or new.starts_at>now()+interval '180 days' then
  raise exception 'Sessions must be scheduled 2 hours to 180 days ahead' using errcode='23514';
 end if;
 if not exists(select 1 from public.rch_site_amateur_programs
   where id=new.program_id and organization_id=new.organization_id and status='open') then
  raise exception 'Choose an open program' using errcode='23514'; end if;
 if not exists(select 1 from public.network_organization_members m
   join public.profiles p on p.id=m.profile_id
   where m.organization_id=new.organization_id and m.profile_id=new.coach_profile_id
     and m.status='active' and m.member_role in ('owner','manager','editor')
     and p.is_active=true and p.date_of_birth <= (current_date-interval '18 years')::date) then
  raise exception 'Choose an authorized adult coach' using errcode='23514'; end if;
 return new;
end; $$;
create trigger rch_site_amateur_session_guard_trigger before insert or update
 on public.rch_site_amateur_sessions for each row
 execute function public.rch_site_amateur_session_guard();

-- Defense in depth: no browser Data API access, even for reading private rosters.
do $$
declare t text;
begin
 foreach t in array array[
  'rch_site_amateur_rollout','rch_site_amateur_programs',
  'rch_site_amateur_registrations','rch_site_amateur_sessions'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end; $$;
revoke all on function public.rch_site_amateur_verify_paid(uuid) from public,anon,authenticated;
revoke all on function public.rch_site_amateur_program_guard() from public,anon,authenticated;
revoke all on function public.rch_site_amateur_registration_guard() from public,anon,authenticated;
revoke all on function public.rch_site_amateur_session_guard() from public,anon,authenticated;
grant execute on function public.rch_site_amateur_verify_paid(uuid) to service_role;
grant execute on function public.rch_site_amateur_program_guard() to service_role;
grant execute on function public.rch_site_amateur_registration_guard() to service_role;
grant execute on function public.rch_site_amateur_session_guard() to service_role;

comment on table public.rch_site_amateur_rollout is
 'Private switch OFF by default; when enabled it applies only to the selected approved pilot organization.';
comment on table public.rch_site_amateur_registrations is
 'Adults-only registrations; no DOB stored here, private roster visible solely to an authorized manager.';
