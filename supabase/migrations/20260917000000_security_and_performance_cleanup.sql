-- Production cleanup discovered during the RCL application/database audit.
-- Keep public business RPCs available where the application intentionally calls them,
-- but do not expose trigger-only SECURITY DEFINER helpers through PostgREST.

revoke execute on function public.ensure_fan_profile_for_active_role() from public, anon, authenticated;
revoke execute on function public.log_action(uuid, text, text, text, uuid, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_new_message() from public, anon, authenticated;
revoke execute on function public.prevent_fantasy_totals_changes() from public, anon, authenticated;
revoke execute on function public.prevent_message_edits() from public, anon, authenticated;
revoke execute on function public.prevent_protected_fan_changes() from public, anon, authenticated;
revoke execute on function public.prevent_protected_profile_changes() from public, anon, authenticated;
revoke execute on function public.sync_verified_profile_role() from public, anon, authenticated;

-- These authorization helpers are used by RLS/functions, not as client-facing RPCs.
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_coach_of_team(uuid) from public, anon, authenticated;
revoke execute on function public.is_commissioner(uuid) from public, anon, authenticated;
revoke execute on function public.is_community_member(uuid) from public, anon, authenticated;
revoke execute on function public.is_conversation_member(uuid) from public, anon, authenticated;
revoke execute on function public.is_staff_or_admin() from public, anon, authenticated;

-- The fantasy calculator is intentionally callable by clients, but its function
-- should use a fixed search_path so future schema objects cannot affect resolution.
alter function public.calculate_fantasy_points(numeric, numeric, numeric, numeric, numeric, numeric, jsonb)
  set search_path = public;
