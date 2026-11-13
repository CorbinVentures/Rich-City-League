-- RCH Sites: organization-owned EXTERNAL PayPal Business payment links.
-- RCH never holds merchant login details, PayPal access tokens, API keys or customer proceeds.
-- An offsite payment DOES NOT confirm an RCH appointment or prove funds settled.
create table if not exists public.rch_site_paypal_offerings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  title text not null check(char_length(title) between 3 and 90),
  description text not null default '' check(char_length(description) <= 350),
  amount_cents integer not null check(amount_cents between 100 and 1000000),
  currency text not null default 'USD' check(currency='USD'),
  payment_url text not null check(
    payment_url ~ '^https://www[.]paypal[.]com/ncp/payment/[A-Za-z0-9-]{8,64}$'
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rch_site_paypal_offerings_live_idx
  on public.rch_site_paypal_offerings(organization_id,active,created_at);
drop trigger if exists rch_site_paypal_offerings_updated on public.rch_site_paypal_offerings;
create trigger rch_site_paypal_offerings_updated before update on public.rch_site_paypal_offerings
for each row execute function public.set_updated_at();

alter table public.rch_site_paypal_offerings enable row level security;
revoke all on public.rch_site_paypal_offerings from public,anon,authenticated;
grant select on public.rch_site_paypal_offerings to anon,authenticated;
drop policy if exists "public paypal links only on approved published site" on public.rch_site_paypal_offerings;
create policy "public paypal links only on approved published site"
on public.rch_site_paypal_offerings for select to anon,authenticated
using (
  active and exists (
    select 1 from public.rch_sites s
    where s.organization_id=rch_site_paypal_offerings.organization_id
      and s.status='published'
  )
);
comment on table public.rch_site_paypal_offerings is
'External PayPal-owned fixed checkout links only; RCH cannot verify transaction completion.';
