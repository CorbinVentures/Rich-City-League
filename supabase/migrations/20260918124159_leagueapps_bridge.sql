-- LeagueApps integration bridge.
-- LeagueApps remains the operational source of truth; RCL stores external IDs and
-- raw sync payloads so records can be reconciled without duplicate manual entry.

create table if not exists public.leagueapps_sync_state (
  resource text primary key,
  last_updated bigint not null default 0,
  last_id bigint not null default 0,
  last_synced_at timestamptz,
  records_synced integer not null default 0,
  status text not null default 'never',
  last_error text
);

create table if not exists public.leagueapps_records (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  external_id text not null,
  last_updated bigint,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (resource, external_id)
);

create index if not exists leagueapps_records_resource_idx
  on public.leagueapps_records (resource, synced_at desc);

create index if not exists leagueapps_records_external_idx
  on public.leagueapps_records (external_id);

alter table public.leagueapps_sync_state enable row level security;
alter table public.leagueapps_records enable row level security;

drop policy if exists "admins view LeagueApps sync state" on public.leagueapps_sync_state;
create policy "admins view LeagueApps sync state"
  on public.leagueapps_sync_state
  for select
  using (public.is_admin());

drop policy if exists "admins manage LeagueApps sync state" on public.leagueapps_sync_state;
create policy "admins manage LeagueApps sync state"
  on public.leagueapps_sync_state
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins view LeagueApps records" on public.leagueapps_records;
create policy "admins view LeagueApps records"
  on public.leagueapps_records
  for select
  using (public.is_admin());

drop policy if exists "admins manage LeagueApps records" on public.leagueapps_records;
create policy "admins manage LeagueApps records"
  on public.leagueapps_records
  for all
  using (public.is_admin())
  with check (public.is_admin());
