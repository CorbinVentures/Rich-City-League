-- RCH Sites Free Basketball Toolkit: tenant-isolated private tool documents.
-- Migration is intentionally NOT applied by this PR; release flag defaults OFF.
create table public.rch_site_toolkit (
  organization_id uuid primary key references public.network_organizations(id) on delete cascade,
  teams jsonb not null default '[]'::jsonb check (jsonb_typeof(teams)='array' and pg_column_size(teams)<40000),
  games jsonb not null default '[]'::jsonb check (jsonb_typeof(games)='array' and pg_column_size(games)<50000),
  schedule_public boolean not null default false,
  form jsonb not null default '{"title":"Basketball Registration","open":false}'::jsonb
    check (jsonb_typeof(form)='object' and pg_column_size(form)<3000),
  budget jsonb not null default '{}'::jsonb check (jsonb_typeof(budget)='object' and pg_column_size(budget)<5000),
  revision integer not null default 1 check (revision>0),
  updated_at timestamptz not null default now()
);
create table public.rch_site_toolkit_registrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.rch_site_toolkit(organization_id) on delete cascade,
  name text not null check (char_length(name) between 2 and 90),
  email text not null check (char_length(email) between 5 and 254),
  adult_attested_at timestamptz not null default now(),
  privacy_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index rch_site_toolkit_registration_email_unique
  on public.rch_site_toolkit_registrations(organization_id, lower(email));
create index rch_site_toolkit_registrations_created
  on public.rch_site_toolkit_registrations(organization_id, created_at desc);
alter table public.rch_site_toolkit enable row level security;
alter table public.rch_site_toolkit_registrations enable row level security;
-- Read/write only through authenticated, tenant-verified server API. No direct Data API access.
revoke all on public.rch_site_toolkit from public, anon, authenticated;
revoke all on public.rch_site_toolkit_registrations from public, anon, authenticated;
grant select, insert, update, delete on public.rch_site_toolkit to service_role;
grant select, insert, update, delete on public.rch_site_toolkit_registrations to service_role;
comment on table public.rch_site_toolkit is
  'Private basketball operations documents. No public Data API grants. Pilot-gated server access.';
comment on table public.rch_site_toolkit_registrations is
  'Adult-only contact submissions; accessible only to verified organization managers.';

-- Serialized per-organization monthly submissions; never allow concurrent writes past Free's 100 limit.
create function public.rch_site_toolkit_registration_limit()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 0));
  select count(*) into used from public.rch_site_toolkit_registrations
    where organization_id=new.organization_id
      and created_at>=date_trunc('month',now());
  if used>=100 then raise exception 'Monthly registration limit reached' using errcode='P0001'; end if;
  return new;
end; $$;
create trigger rch_site_toolkit_registration_quota
before insert on public.rch_site_toolkit_registrations
for each row execute function public.rch_site_toolkit_registration_limit();
revoke all on function public.rch_site_toolkit_registration_limit() from public, anon, authenticated;
grant execute on function public.rch_site_toolkit_registration_limit() to service_role;
