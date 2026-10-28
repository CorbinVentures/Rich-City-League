-- Preserve plan interval preference for Get Started only. This is NOT a charge
-- or subscription enrollment, and provides no entitlement to paid features.
alter table public.rch_site_starter_drafts
  add column preferred_billing_interval text not null default 'monthly'
  check (preferred_billing_interval in ('monthly','annual'));

comment on column public.rch_site_starter_drafts.preferred_billing_interval is
  'Display preference only. No active billing, founding offer reservation, payment method, renewal or price lock.';
