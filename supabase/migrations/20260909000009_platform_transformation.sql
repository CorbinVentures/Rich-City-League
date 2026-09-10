-- Alter comments table to support threaded comments
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;

-- Create site_settings table
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create badges table
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  category text not null, -- 'scoring', 'shooting', 'playmaking', 'rebounding', 'defense', 'all-around', 'milestone'
  icon text not null, -- emoji/string
  tier text not null, -- 'bronze', 'silver', 'gold', 'elite'
  requirement_type text not null,
  requirement_value integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create player_badges table
create table if not exists public.player_badges (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (player_id, badge_id, game_id)
);

-- Create coach_badges table
create table if not exists public.coach_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (profile_id, badge_id)
);

-- Create player_of_week table
create table if not exists public.player_of_week (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  week_number integer not null,
  description text not null,
  stats jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, week_number)
);

-- Create reactions table
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('bucket', 'heat', 'strong', 'locked', 'money', 'watch', 'king', 'certified', 'highlight', 'champ')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, type)
);

-- Create audit_logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.site_settings enable row level security;
alter table public.badges enable row level security;
alter table public.player_badges enable row level security;
alter table public.coach_badges enable row level security;
alter table public.player_of_week enable row level security;
alter table public.reactions enable row level security;
alter table public.audit_logs enable row level security;

-- Policies
drop policy if exists "public site_settings" on public.site_settings;
create policy "public site_settings" on public.site_settings for select using (true);

drop policy if exists "staff manage site_settings" on public.site_settings;
create policy "staff manage site_settings" on public.site_settings for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "public badges" on public.badges;
create policy "public badges" on public.badges for select using (true);

drop policy if exists "staff manage badges" on public.badges;
create policy "staff manage badges" on public.badges for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "public player_badges" on public.player_badges;
create policy "public player_badges" on public.player_badges for select using (true);

drop policy if exists "staff manage player_badges" on public.player_badges;
create policy "staff manage player_badges" on public.player_badges for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "public coach_badges" on public.coach_badges;
create policy "public coach_badges" on public.coach_badges for select using (true);

drop policy if exists "staff manage coach_badges" on public.coach_badges;
create policy "staff manage coach_badges" on public.coach_badges for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "public player_of_week" on public.player_of_week;
create policy "public player_of_week" on public.player_of_week for select using (true);

drop policy if exists "staff manage player_of_week" on public.player_of_week;
create policy "staff manage player_of_week" on public.player_of_week for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "public reactions" on public.reactions;
create policy "public reactions" on public.reactions for select using (true);

drop policy if exists "authenticated users manage reactions" on public.reactions;
create policy "authenticated users manage reactions" on public.reactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "staff view audit_logs" on public.audit_logs;
create policy "staff view audit_logs" on public.audit_logs for select using (public.is_staff_or_admin());

drop policy if exists "staff create audit_logs" on public.audit_logs;
create policy "staff create audit_logs" on public.audit_logs
  for insert
  with check (public.is_staff_or_admin() and user_id = auth.uid());

-- Add updated_at triggers
drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings for each row execute procedure public.set_updated_at();

drop trigger if exists badges_updated_at on public.badges;
create trigger badges_updated_at before update on public.badges for each row execute procedure public.set_updated_at();

drop trigger if exists player_of_week_updated_at on public.player_of_week;
create trigger player_of_week_updated_at before update on public.player_of_week for each row execute procedure public.set_updated_at();

-- Seed Site Settings
insert into public.site_settings (key, value) values
('splash_config', '{"enabled": true, "title": "RICH CITY LEAGUE", "subtitle": "THE HOME OF RICHMOND BASKETBALL", "duration": 2.5}'::jsonb),
('homepage_hero', '{"title": "The city''s game.", "subtitle": "Your league.", "description": "Follow Rich City League schedules, scores, standings, teams, and league news in one place."}'::jsonb),
('featured_content', '{"featured_game_id": null, "featured_player_id": null, "featured_team_id": null}'::jsonb)
on conflict (key) do nothing;

-- Seed Badges
insert into public.badges (name, description, category, icon, tier, requirement_type, requirement_value) values
('Bucket Getter', 'Awarded to players who score 100 points in their career.', 'scoring', '🏀', 'bronze', 'career_points', 100),
('Scoring Machine', 'Awarded to players who score 500 points in their career.', 'scoring', '👑', 'gold', 'career_points', 500),
('Heat Check', 'Dropped 20 points in a single game.', 'scoring', '🔥', 'silver', 'game_points', 20),
('30 Piece', 'Dropped 30 points in a single game.', 'scoring', '⚡', 'gold', 'game_points', 30),
('40 Piece', 'Dropped 40 points in a single game.', 'scoring', '🏆', 'elite', 'game_points', 40),
('Sniper', 'Made 4 or more 3-pointers in a single game.', 'shooting', '🎯', 'silver', 'game_three_pointers', 4),
('Sharpshooter', 'Made 8 or more 3-pointers in a single game.', 'shooting', '☄️', 'gold', 'game_three_pointers', 8),
('Green Light', 'Shot 100% from 3PT range with at least 3 attempts.', 'shooting', '🟢', 'elite', 'game_three_point_pct', 100),
('Floor General', 'Dished out 8 or more assists in a single game.', 'playmaking', '🛡️', 'silver', 'game_assists', 8),
('Dime Dealer', 'Dished out 12 or more assists in a single game.', 'playmaking', '🤝', 'gold', 'game_assists', 12),
('Court Vision', 'Recorded 100 career assists.', 'playmaking', '👀', 'bronze', 'career_assists', 100),
('Glass Cleaner', 'Pulled down 10 or more rebounds in a single game.', 'rebounding', '🧼', 'bronze', 'game_rebounds', 10),
('Board Beast', 'Pulled down 15 or more rebounds in a single game.', 'rebounding', '🐗', 'gold', 'game_rebounds', 15),
('Paint Presence', 'Recorded 100 career rebounds.', 'rebounding', '🌲', 'silver', 'career_rebounds', 100),
('Lockdown', 'Recorded 4 or more steals in a single game.', 'defense', '🧱', 'silver', 'game_steals', 4),
('Pickpocket', 'Recorded 50 career steals.', 'defense', '🕵️', 'bronze', 'career_steals', 50),
('Rim Protector', 'Recorded 4 or more blocks in a single game.', 'defense', '🛡️', 'gold', 'game_blocks', 4),
('Defensive Anchor', 'Recorded 50 career blocks.', 'defense', '⚓', 'gold', 'career_blocks', 50),
('Triple Threat', 'Recorded 15+ points, 5+ rebounds, and 5+ assists in a single game.', 'all-around', '💯', 'gold', 'game_triple_threat', 15),
('Two-Way Player', 'Recorded 15+ points and 4+ steals/blocks in a single game.', 'all-around', '🔄', 'silver', 'game_two_way', 15),
('Double-Double Club', 'Recorded a double-double in a single game.', 'all-around', '📊', 'gold', 'game_double_double', 1),
('Triple-Double Club', 'Recorded a triple-double in a single game.', 'all-around', '📈', 'elite', 'game_triple_double', 1)
on conflict (name) do nothing;

-- Create helper to write audit logs
create or replace function public.log_action(target_user_id uuid, action_text text, details_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (user_id, action, details)
  values (target_user_id, action_text, details_text);
end;
$$;

-- Upgrade handle_new_user to assign admin to info@rich-city-league.com
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles (id, username, first_name, last_name, display_name, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), new.email),
    case when new.email = 'info@rich-city-league.com' then 'admin'::public.app_role else 'player'::public.app_role end
  );
  return new;
end $$;

-- Assign admin role if they exist already
update public.profiles
set role = 'admin'
where id in (
  select id from auth.users where email = 'info@rich-city-league.com'
);

-- Recreate public_players view to include height_inches. Dropping first keeps
-- PostgreSQL from treating the inserted column as a renamed existing column.
drop view if exists public.public_players;
create view public.public_players
with (security_invoker = false)
as
select
  id,
  first_name,
  last_name,
  jersey_number,
  position,
  height_inches,
  hometown,
  photo_url,
  is_active
from public.players
where is_active;

grant select on public.public_players to anon, authenticated;
