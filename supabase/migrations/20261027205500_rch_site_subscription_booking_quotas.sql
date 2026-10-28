-- RCH Sites: dedicated website subscription and booking quota foundation.
-- Staged migration ONLY. Do not apply to production without a local/staging
-- pgTAP + booking regression run, migration backup, and deliberate rollout.
-- This is separate from RCH Network sponsorship/advertising billing.
-- No paid RCH Sites subscriptions or organization PayPal integration are enabled.

create table public.rch_site_plan_limits (
  tier text primary key check (tier in ('free','amateur','professional')),
  booking_services integer not null check (booking_services between 0 and 10000),
  upcoming_slots integer not null check (upcoming_slots between 0 and 100000),
  confirmed_bookings_monthly integer not null check (confirmed_bookings_monthly between 0 and 100000)
);
insert into public.rch_site_plan_limits(tier,booking_services,upcoming_slots,confirmed_bookings_monthly)
values ('free',2,30,25),('amateur',15,150,150),('professional',60,600,600);

-- Operator-only staged enablement; installing this migration must NOT
-- immediately impose smaller Free limits on existing live organizers.
create table public.rch_site_booking_quota_rollout (
  id boolean primary key default true check (id=true),
  enforce_booking boolean not null default false
);
insert into public.rch_site_booking_quota_rollout(id,enforce_booking)
values(true,false);

create table public.rch_site_subscriptions (
  organization_id uuid primary key references public.network_organizations(id) on delete cascade,
  tier text not null default 'free'
    references public.rch_site_plan_limits(tier),
  billing_status text not null default 'none'
    check (billing_status in ('none','active','trialing','past_due','canceled')),
  provider_subscription_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rch_site_subscription_paid_requires_reference check (
    (tier='free' and billing_status='none' and provider_subscription_ref is null)
    or (tier<>'free' and billing_status<>'none'
        and provider_subscription_ref is not null and length(trim(provider_subscription_ref)) between 5 and 200)
  )
);
create index rch_site_subscriptions_status_idx
on public.rch_site_subscriptions(tier,billing_status);
-- Monthly quota counts use booking creation time, not appointment time.
create index rch_site_bookings_org_booked_at_idx
on public.rch_site_bookings(organization_id,booked_at);

-- Seed eligible orgs with free entitlement; never derive website subscriptions
-- from network_tier or public website tier-interest forms.
insert into public.rch_site_subscriptions(organization_id)
select id from public.network_organizations
where status='active' and is_verified=true and is_claimed=true
  and network_tier <> 'flagship'
  and organization_type in ('training','program','team','tournament','league','facility')
on conflict (organization_id) do nothing;

create trigger rch_site_subscription_updated
before update on public.rch_site_subscriptions
for each row execute function public.set_updated_at();

-- No browser/anonymous Data API access to subscriptions or plan limits.
-- Only server-only service_role may read/assign website billing entitlements.
alter table public.rch_site_plan_limits enable row level security;
alter table public.rch_site_subscriptions enable row level security;
alter table public.rch_site_booking_quota_rollout enable row level security;
revoke all on public.rch_site_plan_limits from public,anon,authenticated;
revoke all on public.rch_site_subscriptions from public,anon,authenticated;
revoke all on public.rch_site_booking_quota_rollout from public,anon,authenticated;

-- Called as a regular INVOKER trigger during the already-authorized server
-- write; no SECURITY DEFINER, no exposed RPC and no client bypass.
--
-- Serialize all booking-related creates for the same organization on its
-- private subscription row; count authoritative tables while holding that
-- lock. No stale client-provided usage counters are trusted.
create function public.rch_site_booking_plan_quota_guard()
returns trigger
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_tier text;
  v_status text;
  v_max integer;
  v_used bigint;
  v_key text;
  v_month_start timestamptz;
begin
  -- Quotas activate only after staging tests and an affected-tenant audit.
  -- Until then, legacy API ceilings continue protecting booking creates.
  if not coalesce((select enforce_booking from public.rch_site_booking_quota_rollout where id=true),false) then
    return new;
  end if;
  if tg_op='UPDATE' then
    if new.organization_id is distinct from old.organization_id then
      raise exception 'Cannot transfer site resource ownership'
        using errcode='23514';
    end if;
    if tg_table_name='rch_site_services' and (old.status='active' or new.status<>'active') then
      return new;
    end if;
    -- IMPORTANT: PL/pgSQL can evaluate all AND/OR operands. Never reference
    -- starts_at on the service or booking record type.
    if tg_table_name='rch_site_slots' then
      if new.status<>'open' or (old.status='open' and
         (old.starts_at>now() or new.starts_at<=now())) then
        return new;
      end if;
    end if;
    if tg_table_name='rch_site_bookings' and (old.status='confirmed' or new.status<>'confirmed') then
      return new;
    end if;
  else
    if tg_table_name='rch_site_services' and new.status<>'active' then return new; end if;
    if tg_table_name='rch_site_slots' then
      if new.status<>'open' or new.starts_at<=now() then return new; end if;
    end if;
    if tg_table_name='rch_site_bookings' and new.status<>'confirmed' then return new; end if;
  end if;

  -- New eligible organizations can begin with a free entitlement even if they
  -- were approved after this migration's seed; this never grants a paid tier.
  insert into public.rch_site_subscriptions(organization_id)
  values(new.organization_id)
  on conflict (organization_id) do nothing;

  select tier,billing_status into v_tier,v_status
  from public.rch_site_subscriptions
  where organization_id=new.organization_id
  for update;
  if not found then
    raise exception 'Website entitlement is unavailable' using errcode='23514';
  end if;
  if v_tier<>'free' and v_status<>'active' then
    raise exception 'Website subscription is not active' using errcode='23514';
  end if;

  if tg_table_name='rch_site_services' then
    v_key:='booking_services';
    select count(*) into v_used from public.rch_site_services
    where organization_id=new.organization_id and status='active'
      and id<>new.id;
  elsif tg_table_name='rch_site_slots' then
    v_key:='upcoming_slots';
    select count(*) into v_used from public.rch_site_slots
    where organization_id=new.organization_id and status='open'
      and starts_at>now() and id<>new.id;
  elsif tg_table_name='rch_site_bookings' then
    v_key:='confirmed_bookings_monthly';
    v_month_start := date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
    -- Cancellations still count towards monthly activity; this prevents
    -- cycling canceled reservations to bypass the monthly usage limit.
    select count(*) into v_used from public.rch_site_bookings
    where organization_id=new.organization_id
      and booked_at>=v_month_start
      and booked_at<v_month_start + interval '1 month'
      and id<>new.id;
  else
    raise exception 'Unknown website quota resource' using errcode='23514';
  end if;

  select case v_key
    when 'booking_services' then booking_services
    when 'upcoming_slots' then upcoming_slots
    else confirmed_bookings_monthly end
  into v_max from public.rch_site_plan_limits where tier=v_tier;
  if v_max is null then
    raise exception 'Website plan limits are unavailable' using errcode='23514';
  end if;
  if v_used>=v_max then
    raise exception 'RCH Sites % quota reached',v_key using errcode='P0001';
  end if;

  return new;
end;
$$;
revoke all on function public.rch_site_booking_plan_quota_guard()
from public,anon,authenticated;

create trigger rch_site_services_plan_quota
before insert or update of status,organization_id on public.rch_site_services
for each row execute function public.rch_site_booking_plan_quota_guard();

create trigger rch_site_slots_plan_quota
before insert or update of status,organization_id,starts_at on public.rch_site_slots
for each row execute function public.rch_site_booking_plan_quota_guard();

create trigger rch_site_bookings_plan_quota
before insert or update of status,organization_id on public.rch_site_bookings
for each row execute function public.rch_site_booking_plan_quota_guard();

comment on table public.rch_site_subscriptions is
  'Dedicated RCH Sites plans. No connection to Network advertising or merchant PayPal proceeds.';
comment on table public.rch_site_booking_quota_rollout is
  'Internal emergency kill switch: false by default. Turn on after staged validation and owner review.';
comment on table public.rch_site_plan_limits is
  'Server-only, proposed booking quota limits; validated atomically via booking write triggers.';
comment on function public.rch_site_booking_plan_quota_guard() is
  'Invoker trigger serializes per-org booking writes and rejects exhausted plan quotas.';
