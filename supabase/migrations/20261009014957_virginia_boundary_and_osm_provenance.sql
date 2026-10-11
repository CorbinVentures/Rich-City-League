begin;
create extension if not exists postgis with schema extensions;

-- GIS import reference area; outside public Data API schemas.
create schema if not exists rch_geo;
revoke all on schema rch_geo from public, anon, authenticated;

create table if not exists rch_geo.virginia_state_boundary (
  id text primary key,
  shape extensions.geometry(MultiPolygon,4326) not null,
  source_url text not null,
  source_date date,
  updated_at timestamptz not null default now()
);
create index if not exists virginia_state_boundary_shape_idx
  on rch_geo.virginia_state_boundary using gist(shape);
revoke all on table rch_geo.virginia_state_boundary from public,anon,authenticated;

-- OpenStreetMap provenance maintained separately to support ODbL compliance.
create table if not exists public.basketball_osm_provenance (
  osm_key text primary key,
  location_slug text not null unique references public.basketball_locations(slug) on update cascade on delete cascade,
  osm_tags jsonb not null default '{}'::jsonb,
  attribution text not null default '© OpenStreetMap contributors (ODbL 1.0)',
  source_url text not null,
  imported_at timestamptz not null default now()
);
alter table public.basketball_osm_provenance enable row level security;
revoke all on table public.basketball_osm_provenance from public,anon,authenticated;
grant select on table public.basketball_osm_provenance to anon,authenticated;
drop policy if exists "public reads OSM provenance" on public.basketball_osm_provenance;
create policy "public reads OSM provenance" on public.basketball_osm_provenance for select
to anon,authenticated using (true);

commit;