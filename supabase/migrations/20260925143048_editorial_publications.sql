begin;

create table if not exists public.editorial_publications (
  id uuid primary key default gen_random_uuid(),
  account_key text not null check (account_key in ('rcl-business','rva-hoops')),
  fingerprint text not null unique,
  title text not null,
  source_name text not null,
  source_url text not null,
  source_published_at timestamptz,
  post_id uuid not null unique references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.editorial_publications enable row level security;
revoke all on table public.editorial_publications from anon, authenticated;

create index if not exists editorial_publications_account_created_idx
  on public.editorial_publications(account_key, created_at desc);

commit;
