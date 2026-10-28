-- RCH Sites subscription billing: separate from RCH Network ads, RCH member plans,
-- and the organization's own external PayPal Business customer payments.
-- This migration is inert while RCH_SITES_BILLING_ENABLED != "true".
-- No grants for anon/authenticated and no payment provider secrets in tables.

alter table public.rch_site_subscriptions
  add column if not exists provider_customer_id text,
  add column if not exists provider_price_id text,
  add column if not exists billing_interval text
    check (billing_interval in ('monthly','annual')),
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists last_reconciled_at timestamptz;

create unique index if not exists rch_site_subscriptions_provider_subscription_unique
  on public.rch_site_subscriptions(provider_subscription_ref)
  where provider_subscription_ref is not null;
create unique index if not exists rch_site_subscriptions_provider_customer_unique
  on public.rch_site_subscriptions(provider_customer_id)
  where provider_customer_id is not null;

create table public.rch_site_billing_intents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  initiated_by uuid not null references public.profiles(id),
  tier text not null check (tier in ('amateur','professional')),
  billing_interval text not null check (billing_interval in ('monthly','annual')),
  stripe_price_id text not null check (stripe_price_id ~ '^price_[a-zA-Z0-9_]+$'),
  stripe_session_id text unique,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text not null default 'pending'
    check (status in ('pending','checkout_ready','completed','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rch_site_billing_intents_org_time
  on public.rch_site_billing_intents(organization_id,created_at desc);
create unique index rch_site_billing_intents_subscription_unique
  on public.rch_site_billing_intents(stripe_subscription_id)
  where stripe_subscription_id is not null;
create trigger rch_site_billing_intents_updated_at
  before update on public.rch_site_billing_intents
  for each row execute function public.set_updated_at();

create table public.rch_site_billing_events (
  event_id text primary key check (event_id ~ '^evt_[a-zA-Z0-9_]+$'),
  event_type text not null,
  stripe_subscription_id text,
  processing_status text not null check
    (processing_status in ('processing','processed','ignored','failed')),
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.rch_site_billing_intents enable row level security;
alter table public.rch_site_billing_events enable row level security;
revoke all on public.rch_site_billing_intents from public,anon,authenticated;
revoke all on public.rch_site_billing_events from public,anon,authenticated;
grant select,insert,update on public.rch_site_billing_intents to service_role;
grant select,insert,update on public.rch_site_billing_events to service_role;
grant select,insert,update on public.rch_site_subscriptions to service_role;

comment on table public.rch_site_billing_intents is
  'Server-created RCH Sites Checkout lineage. No organization can change another tenant or mint payment status via Data API.';
comment on table public.rch_site_billing_events is
  'Verified Stripe webhook event reconciliation log. Event replay is safe; no browser access.';
comment on column public.rch_site_subscriptions.provider_price_id is
  'Stripe price ID verified against the operator allowlist; never accepted as an entitlement from client input.';
