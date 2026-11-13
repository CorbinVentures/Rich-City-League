-- Registration abuse/retention hardening for the RCH Sites Free toolkit.
-- Keeps raw visitor IP addresses out of Postgres and fails closed if rate setup is missing.
create table public.rch_site_toolkit_registration_rate (
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  visitor_fingerprint text not null check (visitor_fingerprint ~ '^[0-9a-f]{64}$'),
  period text not null check (period in ('hour','day','org_hour')),
  window_start timestamptz not null,
  attempts integer not null default 1 check (attempts between 1 and 1000),
  primary key (organization_id,visitor_fingerprint,period,window_start)
);
create index rch_site_toolkit_rate_cleanup_idx on public.rch_site_toolkit_registration_rate(window_start);
alter table public.rch_site_toolkit_registration_rate enable row level security;
revoke all on public.rch_site_toolkit_registration_rate from public, anon, authenticated;
grant select,insert,update,delete on public.rch_site_toolkit_registration_rate to service_role;

-- Atomic cross-instance limits. The server must supply only a keyed HMAC
-- fingerprint derived from the trusted reverse proxy client IP, never the IP itself.
create function public.rch_site_toolkit_claim_registration_attempt(
  p_organization_id uuid, p_fingerprint text
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_period text;
  v_bucket timestamptz;
  v_limit integer;
  v_fingerprint text;
  v_count integer;
begin
  if p_organization_id is null or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid rate limit input' using errcode='22023';
  end if;
  for v_period,v_bucket,v_limit,v_fingerprint in
    select 'hour'::text,date_trunc('hour',now()),5,p_fingerprint
    union all select 'day',date_trunc('day',now()),12,p_fingerprint
    union all select 'org_hour',date_trunc('hour',now()),60,repeat('0',64)
  loop
    insert into public.rch_site_toolkit_registration_rate as r
      (organization_id,visitor_fingerprint,period,window_start,attempts)
    values (p_organization_id,v_fingerprint,v_period,v_bucket,1)
    on conflict (organization_id,visitor_fingerprint,period,window_start)
    do update set attempts=r.attempts+1 where r.attempts<v_limit
    returning attempts into v_count;
    if v_count is null then return false; end if;
    v_count:=null;
  end loop;
  return true;
end; $$;
revoke all on function public.rch_site_toolkit_claim_registration_attempt(uuid,text)
  from public,anon,authenticated;
grant execute on function public.rch_site_toolkit_claim_registration_attempt(uuid,text)
  to service_role;

-- Adult interest registrations are automatically deleted after 90 days.
-- HMAC-derived anonymous rate counters are removed after 72 hours.
create function public.rch_site_toolkit_privacy_cleanup()
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  delete from public.rch_site_toolkit_registrations
    where created_at < now()-interval '90 days';
  delete from public.rch_site_toolkit_registration_rate
    where window_start < now()-interval '72 hours';
end; $$;
revoke all on function public.rch_site_toolkit_privacy_cleanup()
  from public,anon,authenticated;
grant execute on function public.rch_site_toolkit_privacy_cleanup() to service_role;

-- The privacy contract requires an operating cleanup schedule.
do $$
begin
  if to_regclass('cron.job') is null then
    raise exception 'pg_cron is required for registration retention';
  end if;
  perform cron.schedule('rch-site-toolkit-privacy-cleanup','17 4 * * *',
    'select public.rch_site_toolkit_privacy_cleanup()');
end; $$;
