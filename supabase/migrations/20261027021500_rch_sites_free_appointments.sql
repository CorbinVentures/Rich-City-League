-- RCH Sites Phase 2: FREE appointment booking, without payment processing.
-- Explicit host-created sessions, one attendee per session, private identities.
-- Bookings never change core RCH leagues or network events.
create extension if not exists btree_gist with schema extensions;

create table if not exists public.rch_site_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 90),
  description text not null default '' check (char_length(description) <= 500),
  duration_minutes integer not null check (duration_minutes in (30,45,60,90,120)),
  price_cents integer not null default 0 check (price_cents = 0), -- Paid checkout is not ready.
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,organization_id)
);
create index if not exists rch_site_services_org_idx
on public.rch_site_services(organization_id,status);

create table if not exists public.rch_site_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  service_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  constraint rch_site_slots_service_organization foreign key (service_id,organization_id)
    references public.rch_site_services(id,organization_id) on delete restrict,
  constraint rch_site_slots_range check (ends_at > starts_at and ends_at <= starts_at + interval '2 hours'),
  constraint rch_site_slots_start_unique unique (service_id,starts_at),
  constraint rch_site_slots_id_org_unique unique (id,organization_id)
);
-- Prevent organizers from creating overlapping bookable sessions, even across services.
alter table public.rch_site_slots add constraint rch_site_slots_org_no_overlap
  exclude using gist (organization_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
  where (status = 'open');
create index if not exists rch_site_slots_org_time_idx
  on public.rch_site_slots(organization_id,starts_at,status);
create index if not exists rch_site_slots_service_idx
  on public.rch_site_slots(service_id,starts_at);

create table if not exists public.rch_site_bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  service_id uuid not null,
  slot_id uuid not null,
  client_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key uuid not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint rch_site_bookings_service_org foreign key (service_id,organization_id)
    references public.rch_site_services(id,organization_id) on delete restrict,
  constraint rch_site_bookings_slot_org foreign key (slot_id,organization_id)
    references public.rch_site_slots(id,organization_id) on delete restrict,
  constraint rch_site_bookings_idempotency unique (client_id,idempotency_key)
);
-- Primary concurrency guarantee: only ONE active confirmed booking per slot.
create unique index if not exists rch_site_bookings_exclusive_slot
  on public.rch_site_bookings(slot_id) where (status='confirmed');
create index if not exists rch_site_bookings_client_idx
  on public.rch_site_bookings(client_id,status,booked_at desc);
create index if not exists rch_site_bookings_org_idx
  on public.rch_site_bookings(organization_id,status);

-- Serialize booking vs closing under a row lock. Keep this INVOKER trigger, not an exposed SECURITY DEFINER RPC.
create or replace function public.rch_site_booking_validate()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_slot public.rch_site_slots%rowtype;
begin
  if tg_op = 'INSERT' and new.status='confirmed' then
    select * into v_slot from public.rch_site_slots where id=new.slot_id for update;
    if not found or v_slot.status <> 'open' or v_slot.organization_id <> new.organization_id
       or v_slot.service_id <> new.service_id or v_slot.starts_at <= now()+interval '1 hour' then
      raise exception 'This appointment is unavailable' using errcode='23514';
    end if;
    if not exists (
      select 1 from public.rch_site_services svc
      join public.rch_sites site on site.organization_id=svc.organization_id
      where svc.id=new.service_id and svc.organization_id=new.organization_id
        and svc.status='active' and site.status='published'
    ) then
      raise exception 'This service is not published' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.rch_site_booking_validate() from public,anon,authenticated;
drop trigger if exists rch_site_booking_guard on public.rch_site_bookings;
create trigger rch_site_booking_guard before insert on public.rch_site_bookings
for each row execute function public.rch_site_booking_validate();

create or replace function public.rch_site_slot_close_validate()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.status='closed' and old.status='open' and exists (
    select 1 from public.rch_site_bookings b where b.slot_id=old.id and b.status='confirmed'
  ) then
    raise exception 'Booked appointments must not be closed' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.rch_site_slot_close_validate() from public,anon,authenticated;
drop trigger if exists rch_site_slot_close_guard on public.rch_site_slots;
create trigger rch_site_slot_close_guard before update of status on public.rch_site_slots
for each row execute function public.rch_site_slot_close_validate();

drop trigger if exists rch_site_services_updated on public.rch_site_services;
create trigger rch_site_services_updated before update on public.rch_site_services
for each row execute function public.set_updated_at();

alter table public.rch_site_services enable row level security;
alter table public.rch_site_slots enable row level security;
alter table public.rch_site_bookings enable row level security;
-- Mutations are server-validated only: no anonymous or browser-side changes.
revoke all on public.rch_site_services from public,anon,authenticated;
revoke all on public.rch_site_slots from public,anon,authenticated;
revoke all on public.rch_site_bookings from public,anon,authenticated;
grant select on public.rch_site_services to anon,authenticated;
grant select on public.rch_site_slots to anon,authenticated;
grant select on public.rch_site_bookings to authenticated;

create policy "site services published read"
on public.rch_site_services for select to anon,authenticated
using (
  status='active' and exists (
    select 1 from public.rch_sites s
    where s.organization_id=rch_site_services.organization_id and s.status='published'
  )
);
create policy "site slots published read"
on public.rch_site_slots for select to anon,authenticated
using (
  status='open' and exists (
    select 1 from public.rch_site_services svc
    where svc.id=rch_site_slots.service_id
      and svc.organization_id=rch_site_slots.organization_id
      and svc.status='active'
  )
);
create policy "site bookings client read"
on public.rch_site_bookings for select to authenticated
using (client_id=(select auth.uid()));

comment on table public.rch_site_services is 'RCH Sites organization-owned zero-cost service offerings; paid services deferred.';
comment on table public.rch_site_slots is 'Host-selected session slots. Exclusion constraint prohibits overlap inside one organization.';
comment on table public.rch_site_bookings is 'Private RCH Site confirmed/cancelled reservations; only server mutates, clients see their own.';
