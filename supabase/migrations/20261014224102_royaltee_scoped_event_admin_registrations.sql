-- Mirror the live Royaltee 18+ registration foundation in repository history.
-- This migration runs before Royaltee's follow-up coach registration RPC migration.

create or replace function public.can_manage_royaltee()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select (select auth.uid()) is not null and (
  coalesce(public.is_admin(),false)
  or exists (
   select 1 from public.network_organization_members m
   join public.network_organizations o on o.id=m.organization_id
   where o.slug='royaltee-steppas' and m.profile_id=(select auth.uid())
    and m.status='active' and m.member_role in ('owner','manager')
  )
  or exists (
   select 1 from public.rcl_staff_assignments s
   where s.profile_id=(select auth.uid()) and s.role_code='cheerleading_coach'
    and s.active=true and s.revoked_at is null and s.approved_by is not null
  )
 );
$$;
revoke all on function public.can_manage_royaltee() from public;
grant execute on function public.can_manage_royaltee() to authenticated;

alter table public.rcl_royaltee_events
 add column if not exists registration_fee_cents integer not null default 0,
 add column if not exists registration_open boolean not null default false,
 add column if not exists capacity integer;
alter table public.rcl_royaltee_events
 add constraint rcl_royaltee_events_fee_bounds check(registration_fee_cents between 0 and 1000000);
alter table public.rcl_royaltee_events
 add constraint rcl_royaltee_events_capacity_positive check(capacity is null or capacity>=1);

create table if not exists public.rcl_royaltee_event_registrations (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.rcl_royaltee_events(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'registered' check(status in ('registered','checked_in','cancelled')),
 payment_status text not null default 'unpaid' check(payment_status in ('unpaid','paid','waived')),
 fee_cents_snapshot integer not null default 0 check(fee_cents_snapshot>=0),
 checked_in_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(event_id,profile_id)
);
create index if not exists royaltee_registrations_by_event on public.rcl_royaltee_event_registrations(event_id,created_at desc);
create index if not exists royaltee_registrations_by_member on public.rcl_royaltee_event_registrations(profile_id,created_at desc);
alter table public.rcl_royaltee_event_registrations enable row level security;

create policy "royaltee registration self or manager read"
on public.rcl_royaltee_event_registrations for select to authenticated
using (profile_id=(select auth.uid()) or public.can_manage_royaltee());
create policy "royaltee manager registration update"
on public.rcl_royaltee_event_registrations for update to authenticated
using(public.can_manage_royaltee()) with check(public.can_manage_royaltee());

revoke all on public.rcl_royaltee_event_registrations from anon,authenticated;
grant select on public.rcl_royaltee_event_registrations to authenticated;
grant select on public.rcl_royaltee_events to anon,authenticated;
grant update(registration_fee_cents,registration_open,capacity) on public.rcl_royaltee_events to authenticated;

create or replace function public.register_royaltee_event(p_event_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_user uuid:=auth.uid();v_event public.rcl_royaltee_events%rowtype;
 v_count integer; v_existing public.rcl_royaltee_event_registrations%rowtype;v_id uuid;
begin
 if v_user is null then raise exception 'Sign in to register';end if;
 if not exists(select 1 from public.profiles p where p.id=v_user and p.is_active=true
  and p.onboarding_complete=true and p.date_of_birth is not null
  and p.date_of_birth <= (current_date-interval '18 years')::date)
 then raise exception 'Adult (18+) completed profile required';end if;
 select * into v_event from public.rcl_royaltee_events where id=p_event_id for update;
 if not found or v_event.status<>'published' or not v_event.registration_open
  or v_event.starts_at<=now() or v_event.min_age<18
 then raise exception 'Event registration is unavailable';end if;
 select * into v_existing from public.rcl_royaltee_event_registrations
  where event_id=p_event_id and profile_id=v_user;
 if found and v_existing.status in ('registered','checked_in') then return v_existing.id;end if;
 if v_event.capacity is not null then
  select count(*) into v_count from public.rcl_royaltee_event_registrations
   where event_id=p_event_id and status in ('registered','checked_in');
  if v_count>=v_event.capacity then raise exception 'This event is full';end if;
 end if;
 insert into public.rcl_royaltee_event_registrations
  (event_id,profile_id,status,payment_status,fee_cents_snapshot,checked_in_at,updated_at)
 values(p_event_id,v_user,'registered','unpaid',v_event.registration_fee_cents,null,now())
 on conflict(event_id,profile_id) do update
  set status='registered',checked_in_at=null,updated_at=now(),
  payment_status=public.rcl_royaltee_event_registrations.payment_status,
  fee_cents_snapshot=case when public.rcl_royaltee_event_registrations.payment_status='unpaid'
    then excluded.fee_cents_snapshot else public.rcl_royaltee_event_registrations.fee_cents_snapshot end
 returning id into v_id;
 return v_id;
end;$$;

create or replace function public.withdraw_royaltee_event(p_event_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 update public.rcl_royaltee_event_registrations r set status='cancelled',updated_at=now()
 where r.event_id=p_event_id and r.profile_id=auth.uid()
  and r.status='registered'
  and exists(select 1 from public.rcl_royaltee_events e where e.id=r.event_id and e.starts_at>now());
 if not found then raise exception 'No active registration can be withdrawn';end if;
end;$$;

create or replace function public.get_royaltee_event_registration_roster(p_event_id uuid)
returns table(id uuid,profile_id uuid,display_name text,username text,status text,
 payment_status text,fee_cents_snapshot integer,checked_in_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.can_manage_royaltee() then
  raise exception 'Not authorized for Royaltee administration' using errcode='42501';
 end if;
 return query
 select r.id,r.profile_id,p.display_name::text,p.username::text,r.status,r.payment_status,
  r.fee_cents_snapshot,r.checked_in_at,r.created_at
 from public.rcl_royaltee_event_registrations r
 join public.profiles p on p.id=r.profile_id
 where r.event_id=p_event_id and p.date_of_birth is not null
  and p.date_of_birth<=(current_date-interval '18 years')::date
 order by r.created_at desc;
end;$$;
revoke all on function public.register_royaltee_event(uuid) from public;
revoke all on function public.withdraw_royaltee_event(uuid) from public;
revoke all on function public.get_royaltee_event_registration_roster(uuid) from public;
grant execute on function public.register_royaltee_event(uuid) to authenticated;
grant execute on function public.withdraw_royaltee_event(uuid) to authenticated;
grant execute on function public.get_royaltee_event_registration_roster(uuid) to authenticated;
