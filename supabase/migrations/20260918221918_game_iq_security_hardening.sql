-- Security hardening for the Game IQ trigger helper.
revoke execute on function public.enrich_player_game_stat() from public, anon, authenticated;
