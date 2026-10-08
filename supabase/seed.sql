insert into public.leagues (id, name, slug, description)
values ('11111111-1111-1111-1111-111111111111', 'Rich City League', 'rich-city-league',
  'Richmond, Virginia basketball league and community.')
on conflict (id) do nothing;

insert into public.seasons (id, league_id, name, slug, start_date, end_date, status, registration_open)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
  '2026 Summer League', '2026-summer', '2026-06-01', '2026-08-31', 'active', false)
on conflict (id) do nothing;

insert into public.divisions (id, season_id, name, age_group, gender)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
  'Open Division', 'Adult', 'Open')
on conflict (id) do nothing;

insert into public.venues (id, name, address, city, state)
values ('44444444-4444-4444-4444-444444444444', 'Rich City Gym', '100 League Way', 'Richmond', 'VA')
on conflict (id) do nothing;

insert into public.teams (id, league_id, name, slug, short_name, primary_color, secondary_color)
values
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'River City Ballers', 'river-city-ballers', 'RCB', '#0f766e', '#fbbf24'),
  ('52222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Capital Hoops', 'capital-hoops', 'CAP', '#1d4ed8', '#f8fafc')
on conflict (id) do nothing;

insert into public.team_seasons (team_id, season_id, division_id)
values
  ('51111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'),
  ('52222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
on conflict (team_id, season_id) do nothing;

insert into public.games (id, season_id, division_id, home_team_id, away_team_id, venue_id, scheduled_at)
values ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333', '51111111-1111-1111-1111-111111111111',
  '52222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444',
  '2026-07-10 19:00:00+00')
on conflict (id) do nothing;
