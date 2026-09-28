alter view public.public_players set (security_invoker = false);
alter view public.public_player_iq set (security_invoker = false);

revoke all on public.public_players from anon, authenticated;
revoke all on public.public_player_iq from anon, authenticated;
grant select on public.public_players to anon, authenticated;
grant select on public.public_player_iq to anon, authenticated;
