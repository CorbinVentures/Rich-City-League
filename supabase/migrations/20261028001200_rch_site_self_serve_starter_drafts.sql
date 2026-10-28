-- RCH Sites: real self-serve website draft BEFORE organization verification.
-- These records belong to the authenticated adult account, not to an
-- organization tenant. Only approved organization owners can later import.
-- Publishing, entitlement upgrades and Network membership are unaffected.
create table public.rch_site_starter_drafts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_name text not null
    check (char_length(organization_name) between 2 and 140),
  desired_slug text not null
    check (char_length(desired_slug) between 3 and 48
      and desired_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  preferred_tier text not null default 'free'
    check (preferred_tier in ('free','amateur','professional')),
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config)='object' and octet_length(config::text)<=8192),
  verification_inquiry_id uuid unique
    references public.network_partner_inquiries(id) on delete set null,
  verification_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rch_site_starter_verification_idx
on public.rch_site_starter_drafts(verification_requested_at)
where verification_inquiry_id is not null;

create trigger rch_site_starter_updated_at
before update on public.rch_site_starter_drafts
for each row execute function public.set_updated_at();

alter table public.rch_site_starter_drafts enable row level security;
revoke all on public.rch_site_starter_drafts from public,anon,authenticated;
grant select on public.rch_site_starter_drafts to authenticated;

create policy "website starter owner private read"
on public.rch_site_starter_drafts
for select to authenticated
using(profile_id=(select auth.uid()));

comment on table public.rch_site_starter_drafts is
 'Private per-account starter designs, independent of Network claims. Server-only mutations; cannot publish until verified tenant-owner import.';
