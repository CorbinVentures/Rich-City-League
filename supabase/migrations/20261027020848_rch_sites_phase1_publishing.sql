-- RCH Sites Phase 1: isolated, minimal public website + private draft storage.
-- No new privileges to RCH platform settings, financial data or official league tools.
-- Public can ONLY see published snapshots; drafts are never exposed to anon.

create table if not exists public.rch_site_drafts (
  organization_id uuid primary key references public.network_organizations(id) on delete cascade,
  slug text not null unique,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rch_site_draft_slug check (char_length(slug) between 3 and 48 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint rch_site_draft_config check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 8192)
);

create table if not exists public.rch_sites (
  organization_id uuid primary key references public.network_organizations(id) on delete cascade,
  slug text not null unique,
  config jsonb not null,
  status text not null default 'published'
    check (status in ('published','unpublished','suspended')),
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint rch_site_slug check (char_length(slug) between 3 and 48 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint rch_site_config check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 8192)
);

create index if not exists rch_sites_public_idx on public.rch_sites(status,slug);
create index if not exists rch_site_drafts_updated_idx on public.rch_site_drafts(updated_at desc);

drop trigger if exists rch_site_drafts_updated_at on public.rch_site_drafts;
create trigger rch_site_drafts_updated_at before update on public.rch_site_drafts
for each row execute function public.set_updated_at();

drop trigger if exists rch_sites_updated_at on public.rch_sites;
create trigger rch_sites_updated_at before update on public.rch_sites
for each row execute function public.set_updated_at();

alter table public.rch_site_drafts enable row level security;
alter table public.rch_sites enable row level security;

-- Only service-role, server-verified API routes can mutate either table.
-- Even an authenticated direct Data API call is read-only.
revoke all on public.rch_site_drafts from public, anon, authenticated;
revoke all on public.rch_sites from public, anon, authenticated;
grant select on public.rch_site_drafts to authenticated;
grant select on public.rch_sites to anon, authenticated;

drop policy if exists "site draft owner read" on public.rch_site_drafts;
create policy "site draft owner read"
on public.rch_site_drafts for select to authenticated
using (
  exists (
    select 1 from public.network_organization_members m
    where m.organization_id = rch_site_drafts.organization_id
      and m.profile_id = (select auth.uid())
      and m.status = 'active'
      and m.member_role in ('owner','manager','editor')
  )
);

drop policy if exists "only published sites public" on public.rch_sites;
create policy "only published sites public"
on public.rch_sites for select to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1 from public.network_organizations o
    where o.id = rch_sites.organization_id
      and o.status = 'active'
      and o.is_claimed = true
      and o.is_verified = true
      and o.network_tier <> 'flagship'
  )
);

comment on table public.rch_site_drafts is 'Private RCH Sites builder drafts; no anonymous permissions or direct customer writes.';
comment on table public.rch_sites is 'Sanitized published site snapshots; no direct customer writes, no private athlete records.';
