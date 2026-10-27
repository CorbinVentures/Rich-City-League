-- RCH Sites Organization Hub v1: adult-only interest inbox, not athlete registration.
-- No youth records, payment state, profile updates or global organization writes.
create table if not exists public.rch_site_inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.rch_sites(organization_id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  contact_email text not null check (
    char_length(contact_email) between 3 and 254
    and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  purpose text not null check (purpose in ('training','program','event','general')),
  contact_consent boolean not null default false check (contact_consent = true),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  submitted_on date not null default (timezone('utc',now()))::date,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  constraint rch_site_inquiries_once_daily unique (organization_id,requester_id,submitted_on),
  constraint rch_site_inquiry_review_consistency check (
    (status = 'new' and reviewed_at is null and reviewed_by is null)
    or (status in ('contacted','closed') and reviewed_at is not null and reviewed_by is not null)
  )
);
create index if not exists rch_site_inquiries_org_time
  on public.rch_site_inquiries(organization_id,submitted_at desc);
create index if not exists rch_site_inquiries_requester_time
  on public.rch_site_inquiries(requester_id,submitted_at desc);

alter table public.rch_site_inquiries enable row level security;
revoke all on public.rch_site_inquiries from public,anon,authenticated;
-- No client-readable policy: authenticated members must go through server-side
-- tenant-verified routes. Service role may perform controlled operations.
comment on table public.rch_site_inquiries is
'Private consented adult interest inquiries for one organization. No minors, roster, medical info, or payment confirmation.';
