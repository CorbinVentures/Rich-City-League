-- RCL badge expansion: badges are now designed around Richmond culture and basketball participation.
create table if not exists public.fan_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (profile_id, badge_id)
);

alter table public.fan_badges enable row level security;
drop policy if exists "public fan_badges" on public.fan_badges;
create policy "public fan_badges" on public.fan_badges for select using (true);
drop policy if exists "staff manage fan_badges" on public.fan_badges;
create policy "staff manage fan_badges" on public.fan_badges for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

insert into public.badges (name, description, category, icon, tier, requirement_type, requirement_value) values
('804 Native', 'Welcome to the RCL community in the 804.', 'richmond', '🏙️', 'bronze', 'fan_joined', 1),
('River City Regular', 'Followed the RCL community through three game-day experiences.', 'richmond', '🌊', 'silver', 'games_attended', 3),
('James River Run', 'Attended five RCL game-day experiences.', 'richmond', '🌉', 'gold', 'games_attended', 5),
('804 Hooper', 'Earned by a player who records an official RCL appearance.', 'basketball', '🏀', 'bronze', 'career_games', 1),
('City Buckets', 'Scored 100 official RCL career points.', 'basketball', '🪣', 'silver', 'career_points', 100),
('804 Sniper', 'Made 25 official RCL career three-pointers.', 'basketball', '🎯', 'gold', 'career_three_pointers', 25),
('River City Lock', 'Recorded 25 official RCL career steals or blocks.', 'basketball', '🔒', 'gold', 'career_defensive_plays', 25),
('RCL Ironman', 'Appeared in 20 official RCL games.', 'basketball', '💪', 'elite', 'career_games', 20),
('Sixth Man Energy', 'A fan recognized for consistent game-day support.', 'community', '📣', 'silver', 'fan_games_attended', 10),
('Courtside 804', 'A fan who has attended 20 RCL game-day experiences.', 'community', '🎟️', 'gold', 'fan_games_attended', 20)
on conflict (name) do nothing;

create index if not exists fan_badges_profile_idx on public.fan_badges(profile_id, earned_at desc);
create index if not exists fan_badges_badge_idx on public.fan_badges(badge_id);
