-- RCH Sites Stripe subscription reconciliation, staged only. 
-- Separate from personal RCH membership, RCH Network promotions, and tenant PayPal.
-- Apply on an isolated/staging DB and verify before any production deployment.
alter table public.rch_site_subscriptions
  add column provider_customer_ref text,
  add column provider_price_ref text,
  add column billing_interval text check (billing_interval in ('monthly','annual')),
  add column current_period_end timestamptz,
  add column cancel_at_period_end boolean not null default false;
create unique index rch_sites_provider_customer_unique
  on public.rch_site_subscriptions(provider_customer_ref)
  where provider_customer_ref is not null;
create unique index rch_sites_provider_subscription_unique
  on public.rch_site_subscriptions(provider_subscription_ref)
  where provider_subscription_ref is not null;

-- All payment writes occur exclusively through a signed, server-side webhook.
-- No browser, anon, or signed-in member can inspect or alter provider identifiers.
create table public.rch_site_billing_events (
  id text primary key,
  event_type text not null,
  processing_status text not null default 'processing'
    check (processing_status in ('processing','processed','ignored','failed')),
  organization_id uuid references public.network_organizations(id) on delete set null,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index rch_site_billing_events_org_idx
  on public.rch_site_billing_events(organization_id,created_at desc);
alter table public.rch_site_billing_events enable row level security;
revoke all on public.rch_site_billing_events from public,anon,authenticated;
comment on table public.rch_site_billing_events is
  'Private, idempotent Stripe events exclusively for RCH Website Creator subscription billing.';

-- Existing booking quota enforcement remains OFF and is not enabled here.
