-- Small, measured optimizations for the highest-traffic member paths.
-- Do not blanket-index all reported foreign keys or rewrite complex RLS policies.
BEGIN;
CREATE INDEX IF NOT EXISTS community_members_profile_lookup_idx
  ON public.community_members (profile_id,community_id);
CREATE INDEX IF NOT EXISTS conversation_members_profile_lookup_idx
  ON public.conversation_members (profile_id,conversation_id);
CREATE INDEX IF NOT EXISTS comments_post_recent_idx
  ON public.comments (post_id,created_at DESC);
CREATE INDEX IF NOT EXISTS comments_author_recent_idx
  ON public.comments (author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_recipient_idx
  ON public.notifications (recipient_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS basketball_locations_locality_active_idx
  ON public.basketball_locations (locality,name) WHERE is_active=true;

-- Equivalent access control with one per-query evaluation of auth.uid().
ALTER POLICY "own profile update" ON public.profiles
  USING (id=(select auth.uid()))
  WITH CHECK (id=(select auth.uid()));
ALTER POLICY "users create posts" ON public.posts
  WITH CHECK (author_id=(select auth.uid()));
ALTER POLICY "users view own notifications" ON public.notifications
  USING (recipient_id=(select auth.uid()));
ALTER POLICY "users mark own notifications" ON public.notifications
  USING (recipient_id=(select auth.uid()))
  WITH CHECK (recipient_id=(select auth.uid()));
ALTER POLICY "users delete own notifications" ON public.notifications
  USING (recipient_id=(select auth.uid()));

-- These two entrypoints should never be called by anonymous users.
-- Keep RLS authorization helpers and public leaderboards callable as designed.
REVOKE EXECUTE ON FUNCTION public.claim_weekly_mission(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_weekly_mission(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_conversation_on_message() FROM PUBLIC,anon,authenticated;
COMMIT;
