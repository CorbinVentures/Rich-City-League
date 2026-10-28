-- Website Creator billing period safety.
-- The existing quota trigger must fail closed when the last paid Stripe period
-- has ended, even if a webhook was missed and billing_status remains active.
-- RCH Site Free plans are unchanged. Operator quota rollout state stays OFF.
-- This only replaces the existing SECURITY INVOKER trigger function in-place;
-- no tables, subscriptions, events, users or organization billing are edited.

CREATE OR REPLACE FUNCTION public.rch_site_booking_plan_quota_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_tier text;
  v_status text;
  v_paid_until timestamptz;
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

  select tier,billing_status,current_period_end into v_tier,v_status,v_paid_until
  from public.rch_site_subscriptions
  where organization_id=new.organization_id
  for update;
  if not found then
    raise exception 'Website entitlement is unavailable' using errcode='23514';
  end if;
  if v_tier<>'free' and v_status<>'active' then
    raise exception 'Website subscription is not active' using errcode='23514';
  end if;
  -- If an invoice webhook is delayed or lost, old active status is not paid
  -- coverage. Check the private Stripe-derived period under the same row lock.
  if v_tier<>'free' and (v_paid_until is null or v_paid_until<=now()) then
    raise exception 'Website paid subscription period has expired' using errcode='23514';
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
$function$;

REVOKE ALL ON FUNCTION public.rch_site_booking_plan_quota_guard() FROM PUBLIC, anon, authenticated;
