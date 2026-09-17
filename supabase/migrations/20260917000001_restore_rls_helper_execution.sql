-- Restore EXECUTE for SECURITY DEFINER authorization helpers used directly by RLS.
-- SECURITY DEFINER controls the privileges used inside the helper; PostgreSQL still
-- requires the requesting role to have EXECUTE when the RLS policy calls it.
-- Keep anonymous execution revoked; protected RLS paths require authentication.

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_coach_of_team(uuid) to authenticated;
grant execute on function public.is_commissioner(uuid) to authenticated;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;
