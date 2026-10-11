begin;
create table if not exists rch_geo.virginia_localities (
  gis_id integer primary key,
  locality_name text not null,
  shape extensions.geometry(MultiPolygon,4326) not null,
  source_url text not null,
  updated_at timestamptz not null default now()
);
create index if not exists virginia_localities_shape_idx on rch_geo.virginia_localities using gist(shape);
revoke all on rch_geo.virginia_localities from public,anon,authenticated;
commit;