-- Support cascade deletes and joins on foreign-key columns for locked game lineups.
create index if not exists fantasy_game_locks_game_idx
  on private.fantasy_game_locks (game_id);
create index if not exists fantasy_game_starters_player_idx
  on private.fantasy_game_starters (player_id);
