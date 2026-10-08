begin;

create table if not exists public.network_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 140),
  short_name text check (short_name is null or char_length(short_name) <= 60),
  description text check (description is null or char_length(description) <= 2000),
  organization_type text not null default 'program' check (organization_type in ('league','tournament','program','club','team','media','creator','facility','training','other')),
  region text not null default 'central-virginia' check (region in ('central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','statewide','other')),
  city text,
  state text not null default 'VA',
  website_url text,
  instagram_url text,
  facebook_url text,
  x_url text,
  youtube_url text,
  logo_url text,
  cover_url text,
  is_verified boolean not null default false,
  verification_label text,
  network_tier text not null default 'network' check (network_tier in ('network','amplify','premier','flagship')),
  is_featured boolean not null default false,
  featured_rank integer,
  status text not null default 'active' check (status in ('active','pending','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists network_organizations_region_idx on public.network_organizations(region, status);
create index if not exists network_organizations_featured_idx on public.network_organizations(is_featured, featured_rank nulls last) where status='active';

drop trigger if exists network_organizations_updated_at on public.network_organizations;
create trigger network_organizations_updated_at before update on public.network_organizations for each row execute function public.set_updated_at();

create table if not exists public.network_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 180),
  description text check (description is null or char_length(description) <= 3000),
  event_type text not null default 'other' check (event_type in ('league','tournament','tryout','showcase','camp','run','clinic','media','community','other')),
  venue_name text,
  city text,
  state text not null default 'VA',
  starts_at timestamptz not null,
  ends_at timestamptz,
  external_url text,
  image_url text,
  is_featured boolean not null default false,
  status text not null default 'published' check (status in ('draft','published','cancelled','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index if not exists network_events_upcoming_idx on public.network_events(status, starts_at);
create index if not exists network_events_org_idx on public.network_events(organization_id, starts_at);

drop trigger if exists network_events_updated_at on public.network_events;
create trigger network_events_updated_at before update on public.network_events for each row execute function public.set_updated_at();

create table if not exists public.network_promotions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  event_id uuid references public.network_events(id) on delete cascade,
  placement text not null check (placement in ('network-home','regional-feature','event-spotlight','social-feed','digest','media-feature')),
  headline text,
  disclosure_label text not null default 'Sponsored',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  sort_weight integer not null default 0,
  status text not null default 'active' check (status in ('draft','active','paused','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists network_promotions_active_idx on public.network_promotions(status, placement, starts_at, ends_at);

drop trigger if exists network_promotions_updated_at on public.network_promotions;
create trigger network_promotions_updated_at before update on public.network_promotions for each row execute function public.set_updated_at();

create table if not exists public.network_exposure_daily (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  metric_date date not null,
  impressions integer not null default 0 check (impressions >= 0),
  organization_views integer not null default 0 check (organization_views >= 0),
  event_views integer not null default 0 check (event_views >= 0),
  outbound_clicks integer not null default 0 check (outbound_clicks >= 0),
  follower_growth integer not null default 0,
  shares integer not null default 0 check (shares >= 0),
  media_views integer not null default 0 check (media_views >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, metric_date)
);

drop trigger if exists network_exposure_daily_updated_at on public.network_exposure_daily;
create trigger network_exposure_daily_updated_at before update on public.network_exposure_daily for each row execute function public.set_updated_at();

create table if not exists public.network_partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text not null check (char_length(contact_email) between 3 and 320),
  website_url text,
  region text not null default 'central-virginia' check (region in ('central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','statewide','other')),
  plan_interest text not null default 'network' check (plan_interest in ('network','amplify','premier','unsure')),
  goals text check (goals is null or char_length(goals) <= 3000),
  status text not null default 'new' check (status in ('new','contacted','qualified','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists network_partner_inquiries_updated_at on public.network_partner_inquiries;
create trigger network_partner_inquiries_updated_at before update on public.network_partner_inquiries for each row execute function public.set_updated_at();

alter table public.network_organizations enable row level security;
alter table public.network_events enable row level security;
alter table public.network_promotions enable row level security;
alter table public.network_exposure_daily enable row level security;
alter table public.network_partner_inquiries enable row level security;

revoke all on table public.network_organizations from anon, authenticated;
revoke all on table public.network_events from anon, authenticated;
revoke all on table public.network_promotions from anon, authenticated;
revoke all on table public.network_exposure_daily from anon, authenticated;
revoke all on table public.network_partner_inquiries from anon, authenticated;

grant select on table public.network_organizations to anon, authenticated;
grant select on table public.network_events to anon, authenticated;
grant select on table public.network_promotions to anon, authenticated;
grant select on table public.network_exposure_daily to authenticated;
grant insert on table public.network_partner_inquiries to anon, authenticated;
grant select, update, delete on table public.network_partner_inquiries to authenticated;

create policy "network organizations public read"
on public.network_organizations for select
to anon, authenticated
using (status = 'active' or public.is_admin());

create policy "network organizations admin manage"
on public.network_organizations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "network events public read"
on public.network_events for select
to anon, authenticated
using (status = 'published' or public.is_admin());

create policy "network events admin manage"
on public.network_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "network promotions public read"
on public.network_promotions for select
to anon, authenticated
using (status = 'active' or public.is_admin());

create policy "network promotions admin manage"
on public.network_promotions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "network exposure admin read"
on public.network_exposure_daily for select
to authenticated
using (public.is_admin());

create policy "network exposure admin manage"
on public.network_exposure_daily for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "partner inquiry public create"
on public.network_partner_inquiries for insert
to anon, authenticated
with check (status = 'new');

create policy "partner inquiry admin read"
on public.network_partner_inquiries for select
to authenticated
using (public.is_admin());

create policy "partner inquiry admin update"
on public.network_partner_inquiries for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "partner inquiry admin delete"
on public.network_partner_inquiries for delete
to authenticated
using (public.is_admin());

insert into public.network_organizations (
  slug, name, short_name, description, organization_type, region, city, state,
  website_url, is_verified, verification_label, network_tier, is_featured, featured_rank, status
)
values (
  'rich-city-league',
  'Rich City League',
  'RCL',
  'RCL flagship competition and the anchor basketball property inside the RCL Network.',
  'league',
  'central-virginia',
  'Richmond',
  'VA',
  'https://richcityhoops.com',
  true,
  'RCL Flagship',
  'flagship',
  true,
  0,
  'active'
)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  organization_type = excluded.organization_type,
  region = excluded.region,
  city = excluded.city,
  state = excluded.state,
  website_url = excluded.website_url,
  is_verified = excluded.is_verified,
  verification_label = excluded.verification_label,
  network_tier = excluded.network_tier,
  is_featured = excluded.is_featured,
  featured_rank = excluded.featured_rank,
  status = excluded.status,
  updated_at = now();

commit;
