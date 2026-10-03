-- RCH TV acquisition pipeline for independent films, documentaries and creator programming.

create table if not exists public.rch_tv_acquisitions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 180),
  project_type text not null default 'documentary' check (project_type in ('film','documentary','series','short','special','other')),
  filmmaker_or_company text,
  rights_owner text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website_url text,
  trailer_url text,
  screener_url text,
  source_url text,
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes between 1 and 600),
  release_year integer check (release_year is null or release_year between 1900 and 2100),
  status text not null default 'prospect' check (status in ('prospect','contacted','screening','rights_review','negotiating','licensed','published','declined','archived')),
  territory text not null default 'United States',
  rights_type text not null default 'svod' check (rights_type in ('svod','avod','tvod','free_streaming','mixed','other')),
  exclusivity text not null default 'non-exclusive' check (exclusivity in ('non-exclusive','exclusive','unknown')),
  compensation_model text not null default 'revenue_share' check (compensation_model in ('revenue_share','flat_fee','hybrid','no_fee','undecided')),
  revenue_share_percent numeric(5,2) check (revenue_share_percent is null or (revenue_share_percent >= 0 and revenue_share_percent <= 100)),
  flat_fee_cents integer check (flat_fee_cents is null or flat_fee_cents >= 0),
  term_start date,
  term_end date,
  rights_verified boolean not null default false,
  license_document_url text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  published_media_id uuid references public.media(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (term_end is null or term_start is null or term_end >= term_start)
);

create index if not exists rch_tv_acquisitions_status_idx
  on public.rch_tv_acquisitions(status, updated_at desc);

create index if not exists rch_tv_acquisitions_follow_up_idx
  on public.rch_tv_acquisitions(next_follow_up_at)
  where next_follow_up_at is not null and status not in ('published','declined','archived');

alter table public.rch_tv_acquisitions enable row level security;

revoke all on public.rch_tv_acquisitions from anon, authenticated;
grant select, insert, update, delete on public.rch_tv_acquisitions to authenticated;

drop policy if exists "rch tv admins read acquisitions" on public.rch_tv_acquisitions;
create policy "rch tv admins read acquisitions"
on public.rch_tv_acquisitions for select to authenticated
using ((select public.is_admin()));

drop policy if exists "rch tv admins create acquisitions" on public.rch_tv_acquisitions;
create policy "rch tv admins create acquisitions"
on public.rch_tv_acquisitions for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists "rch tv admins update acquisitions" on public.rch_tv_acquisitions;
create policy "rch tv admins update acquisitions"
on public.rch_tv_acquisitions for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "rch tv admins delete acquisitions" on public.rch_tv_acquisitions;
create policy "rch tv admins delete acquisitions"
on public.rch_tv_acquisitions for delete to authenticated
using ((select public.is_admin()));

drop trigger if exists rch_tv_acquisitions_set_updated_at on public.rch_tv_acquisitions;
create trigger rch_tv_acquisitions_set_updated_at
before update on public.rch_tv_acquisitions
for each row execute function public.set_updated_at();

comment on table public.rch_tv_acquisitions is
'Internal RCH TV rights-acquisition pipeline. Records prospects, screenings, rights review, negotiations, licenses and publication.';
