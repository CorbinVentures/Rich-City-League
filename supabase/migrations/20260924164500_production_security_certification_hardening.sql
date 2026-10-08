-- Production security certification hardening
-- Reconciles verified production security changes into source control.

drop policy if exists "users join runs" on public.run_players;

alter view public.public_players set (security_invoker = true);
alter view public.public_player_iq set (security_invoker = true);
alter view public.leagueapps_mens_registrations set (security_invoker = true);

alter function public.rep_progress(integer) set search_path = public, pg_catalog;
alter function public.rep_status_for_level(integer) set search_path = public, pg_catalog;
alter function public.xp_for_level(integer) set search_path = public, pg_catalog;

revoke execute on function public.notify_comment() from public;
revoke execute on function public.notify_follow() from public;
revoke execute on function public.notify_friend_request() from public;
revoke execute on function public.notify_profile_wall_post() from public;
revoke execute on function public.notify_reaction() from public;
revoke execute on function public.protect_vip_profile_fields() from public;

revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_staff_or_admin() from anon;

revoke execute on function public.complete_lab_session(uuid) from public;
revoke execute on function public.refresh_lab_proof(uuid) from public;
revoke execute on function public.register_for_tryout(uuid, uuid) from public;
revoke execute on function public.share_lab_achievement(text, text) from public;

grant execute on function public.complete_lab_session(uuid) to authenticated, service_role;
grant execute on function public.refresh_lab_proof(uuid) to authenticated, service_role;
grant execute on function public.register_for_tryout(uuid, uuid) to authenticated, service_role;
grant execute on function public.share_lab_achievement(text, text) to authenticated, service_role;

revoke execute on function public.rebuild_game_stats(uuid) from authenticated;
revoke execute on function public.award_xp(uuid, integer, text, text, uuid) from authenticated;
revoke execute on function public.materialize_leagueapps_players() from authenticated;
revoke execute on function public.materialize_leagueapps_structure() from authenticated;
