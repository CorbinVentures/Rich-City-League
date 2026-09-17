-- RCL badge expansion: shared basketball + Richmond identity for players and fans.
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
create policy "staff manage fan_badges" on public.fan_badges for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

create index if not exists fan_badges_profile_id_idx on public.fan_badges(profile_id);
create index if not exists fan_badges_badge_id_idx on public.fan_badges(badge_id);

-- Keep the original badge engine intact while adding RCL-specific achievements.
insert into public.badges (name, description, category, icon, tier, requirement_type, requirement_value) values
('804 Hooper', 'Represented Richmond basketball through verified RCL participation.', 'richmond', '🏀', 'bronze', 'rcl_participation', 1),
('James River Runner', 'Earned by showing up and staying active in the RCL community.', 'richmond', '🌊', 'silver', 'community_activity', 10),
('Monument Mindset', 'A Richmond-inspired achievement for consistent community participation.', 'richmond', '🏛️', 'gold', 'community_activity', 25),
('Capital City Certified', 'A signature RCL achievement for players and fans who become part of the city game.', 'richmond', '804', 'elite', 'community_activity', 50),
('Court Rat', 'A basketball-first milestone for people who keep coming back to the gym.', 'basketball', '⛹️', 'bronze', 'games_attended', 5),
('Run It Back', 'Returned for another RCL game-day experience.', 'basketball', '🔁', 'silver', 'games_attended', 10),
('Sixth Player', 'Brought energy from the sideline and supported the RCL game-day experience.', 'basketball', '6️⃣', 'gold', 'games_attended', 25),
('RCL Legend', 'A top-tier community achievement reserved for sustained RCL participation.', 'basketball', '👑', 'elite', 'community_activity', 100)
on conflict (name) do nothing;

-- Public badge catalog is already available through badges RLS; fan awards are now
-- first-class records alongside player_badges and coach_badges.
