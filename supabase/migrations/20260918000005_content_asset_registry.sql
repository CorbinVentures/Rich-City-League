-- Central registry for ADMIN-managed public-site imagery.
create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique,
  title text not null,
  location text not null,
  image_url text,
  storage_path text,
  alt_text text,
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_assets enable row level security;

drop policy if exists "public read active content assets" on public.content_assets;
create policy "public read active content assets"
  on public.content_assets for select
  using (is_active = true or public.is_admin());

drop policy if exists "admin manage content assets" on public.content_assets;
create policy "admin manage content assets"
  on public.content_assets for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists content_assets_updated_at on public.content_assets;
create trigger content_assets_updated_at before update on public.content_assets
for each row execute procedure public.set_updated_at();

insert into public.content_assets (asset_key,title,location,alt_text)
values
 ('homepage.hero','Homepage Hero','Homepage','Rich City League homepage hero'),
 ('homepage.featured','Homepage Featured Content','Homepage','Featured Rich City League content'),
 ('splash.background','Splash Background','Sitewide Splash','Rich City League splash background'),
 ('players.cover','Players Cover','Players','Rich City League players'),
 ('games.cover','Games Cover','Games','Rich City League games'),
 ('league.cover','League Cover','League','Rich City League league experience'),
 ('communities.cover','Communities Cover','Communities','Rich City League communities'),
 ('draft.cover','Draft Platform Cover','Draft Platform','Rich City League draft platform'),
 ('social.cover','Social Cover','RCL Social','Rich City League social community')
on conflict (asset_key) do nothing;
