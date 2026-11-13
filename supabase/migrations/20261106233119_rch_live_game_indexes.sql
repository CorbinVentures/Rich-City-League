begin;

create index if not exists run_game_actions_run_recent_idx
  on public.run_game_actions(run_id,created_at desc);
create index if not exists run_game_actions_team_fk_idx
  on public.run_game_actions(team_id);
create index if not exists run_game_actions_player_fk_idx
  on public.run_game_actions(player_id);
create index if not exists run_game_actions_actor_fk_idx
  on public.run_game_actions(created_by);
create index if not exists run_games_home_team_fk_idx
  on public.run_games(home_run_team_id);
create index if not exists run_games_away_team_fk_idx
  on public.run_games(away_run_team_id);
create index if not exists run_games_created_by_fk_idx
  on public.run_games(created_by);

commit;
