create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type public.app_role as enum ('player', 'coach', 'staff', 'admin');
create type public.season_status as enum ('draft', 'registration', 'active', 'completed', 'archived');
create type public.registration_status as enum ('pending', 'approved', 'waitlisted', 'rejected', 'cancelled');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'waived');
create type public.game_status as enum ('scheduled', 'live', 'completed', 'cancelled', 'postponed');
create type public.content_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  bio text,
  phone text,
  role public.app_role not null default 'player',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  city text not null default 'Richmond',
  state text not null default 'VA',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null,
  slug text not null unique,
  start_date date not null,
  end_date date not null,
  status public.season_status not null default 'draft',
  registration_open boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  age_group text,
  gender text,
  max_teams integer,
  created_at timestamptz not null default now(),
  unique (season_id, name)
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  amenities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null,
  slug text not null unique,
  short_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  city text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, name)
);

create table public.team_seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete set null,
  seed integer,
  created_at timestamptz not null default now(),
  unique (team_id, season_id)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  jersey_number text,
  position text,
  height_inches integer,
  date_of_birth date,
  hometown text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_coaches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Coach',
  created_at timestamptz not null default now(),
  unique (team_id, profile_id)
);

create table public.rosters (
  id uuid primary key default gen_random_uuid(),
  team_season_id uuid not null references public.team_seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  jersey_number text,
  is_captain boolean not null default false,
  joined_at date not null default current_date,
  left_at date,
  created_at timestamptz not null default now(),
  unique (team_season_id, player_id)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete set null,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete set null,
  scheduled_at timestamptz not null,
  status public.game_status not null default 'scheduled',
  home_score integer not null default 0 check (home_score >= 0),
  away_score integer not null default 0 check (away_score >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table public.player_game_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  minutes numeric(5,2) default 0,
  points integer not null default 0,
  rebounds integer not null default 0,
  assists integer not null default 0,
  steals integer not null default 0,
  blocks integer not null default 0,
  turnovers integer not null default 0,
  fouls integer not null default 0,
  field_goals_made integer not null default 0,
  field_goals_attempted integer not null default 0,
  three_pointers_made integer not null default 0,
  three_pointers_attempted integer not null default 0,
  free_throws_made integer not null default 0,
  free_throws_attempted integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, player_id)
);

create table public.team_game_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  points integer not null default 0,
  rebounds integer not null default 0,
  assists integer not null default 0,
  turnovers integer not null default 0,
  fouls integer not null default 0,
  unique (game_id, team_id)
);

create table public.standings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  wins integer not null default 0,
  losses integer not null default 0,
  ties integer not null default 0,
  points_for integer not null default 0,
  points_against integer not null default 0,
  streak text,
  rank integer,
  updated_at timestamptz not null default now(),
  unique (season_id, division_id, team_id)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  applicant_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email citext not null,
  date_of_birth date,
  emergency_contact jsonb not null default '{}'::jsonb,
  status public.registration_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  notes text
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status public.payment_status not null default 'pending',
  provider text,
  provider_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  media_urls jsonb not null default '[]'::jsonb,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  body text not null,
  cover_image_url text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  storage_path text not null,
  media_type text not null,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now()
);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  description text,
  awarded_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  title text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index games_season_scheduled_at_idx on public.games (season_id, scheduled_at);
create index rosters_player_idx on public.rosters (player_id);
create index posts_author_created_at_idx on public.posts (author_id, created_at desc);
create index news_status_published_at_idx on public.news (status, published_at desc);

create or replace function public.is_staff_or_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.profiles
  where id = auth.uid() and role in ('staff', 'admin')
) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.profiles where id = auth.uid() and role = 'admin'
) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles (id, username, first_name, last_name, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), new.email)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at = now(); return new; end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','leagues','seasons','teams','players','games','player_game_stats','posts','news'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.seasons enable row level security;
alter table public.divisions enable row level security;
alter table public.venues enable row level security;
alter table public.teams enable row level security;
alter table public.team_seasons enable row level security;
alter table public.players enable row level security;
alter table public.team_coaches enable row level security;
alter table public.rosters enable row level security;
alter table public.games enable row level security;
alter table public.player_game_stats enable row level security;
alter table public.team_game_stats enable row level security;
alter table public.standings enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.news enable row level security;
alter table public.media enable row level security;
alter table public.awards enable row level security;
alter table public.staff enable row level security;

create policy "published leagues are public" on public.leagues for select using (is_active);
create policy "published seasons are public" on public.seasons for select using (status in ('registration','active','completed'));
create policy "public league data" on public.divisions for select using (true);
create policy "staff manage divisions" on public.divisions
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "public venues" on public.venues for select using (true);
create policy "staff manage venues" on public.venues
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "public teams" on public.teams for select using (is_active);
create policy "public team seasons" on public.team_seasons for select using (true);
create policy "public players" on public.players for select using (is_active);
create policy "public coaches" on public.team_coaches for select using (true);
create policy "public rosters" on public.rosters for select using (left_at is null);
create policy "public games" on public.games for select using (true);
create policy "public stats" on public.player_game_stats for select using (true);
create policy "public team stats" on public.team_game_stats for select using (true);
create policy "public standings" on public.standings for select using (true);
create policy "public profiles" on public.profiles for select using (is_active);
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "public posts" on public.posts for select using (status = 'published' or author_id = auth.uid() or public.is_staff_or_admin());
create policy "users create posts" on public.posts for insert with check (author_id = auth.uid());
create policy "authors update posts" on public.posts for update using (author_id = auth.uid() or public.is_staff_or_admin());
create policy "authors delete posts" on public.posts for delete using (author_id = auth.uid() or public.is_staff_or_admin());
create policy "public comments" on public.comments for select using (true);
create policy "users create comments" on public.comments for insert with check (author_id = auth.uid());
create policy "comment owners manage comments" on public.comments for delete using (author_id = auth.uid() or public.is_staff_or_admin());
create policy "public likes" on public.likes for select using (true);
create policy "users manage own likes" on public.likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "public follows" on public.follows for select using (true);
create policy "users manage own follows" on public.follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());
create policy "published news" on public.news for select using (status = 'published' or public.is_staff_or_admin());
create policy "staff manage news" on public.news for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "published media" on public.media for select using (status = 'published' or uploader_id = auth.uid() or public.is_staff_or_admin());
create policy "authenticated media upload" on public.media for insert with check (uploader_id = auth.uid());
create policy "staff manage media" on public.media for update using (public.is_staff_or_admin());
create policy "public awards" on public.awards for select using (true);
create policy "staff manage awards" on public.awards
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage league data" on public.leagues for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage seasons" on public.seasons for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage teams" on public.teams for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage games" on public.games for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage stats" on public.player_game_stats for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage team stats" on public.team_game_stats for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage standings" on public.standings for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "users view own registrations" on public.registrations for select using (applicant_id = auth.uid() or public.is_staff_or_admin());
create policy "users submit registrations" on public.registrations for insert with check (applicant_id = auth.uid() or applicant_id is null);
create policy "staff manage registrations" on public.registrations for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "users view own payments" on public.payments for select using (
  exists (select 1 from public.registrations r where r.id = registration_id and r.applicant_id = auth.uid())
  or public.is_staff_or_admin()
);
create policy "staff manage payments" on public.payments for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage players" on public.players for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage rosters" on public.rosters for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage coaches" on public.team_coaches for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff view staff records" on public.staff for select using (public.is_staff_or_admin() or profile_id = auth.uid());
create policy "admins manage staff records" on public.staff for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('media', 'media', true), ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "public avatar/media reads" on storage.objects for select
using (bucket_id in ('avatars', 'media'));
create policy "authenticated uploads" on storage.objects for insert
to authenticated with check (bucket_id in ('avatars', 'media', 'documents') and owner_id = auth.uid()::text);
create policy "owners update files" on storage.objects for update
to authenticated using (owner_id = auth.uid()::text) with check (owner_id = auth.uid()::text);
create policy "owners delete files" on storage.objects for delete
to authenticated using (owner_id = auth.uid()::text);
