-- RCH TV's four editorial destinations are distinct from general RCH media.
-- Existing league/team uploads stay uncategorized until an administrator curates them.
BEGIN;
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS rch_tv_category text NOT NULL DEFAULT 'general';

ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_rch_tv_category_check;
ALTER TABLE public.media
  ADD CONSTRAINT media_rch_tv_category_check
  CHECK (rch_tv_category IN ('general','live_games','the_pulse','movies','original_content'));

-- Ordinary member uploads may not self-publish into curated TV channels.
-- This keeps an arbitrary team upload from appearing as a film or RCH original.
ALTER POLICY "authenticated media upload" ON public.media
  WITH CHECK (
    uploader_id = (select auth.uid())
    AND (team_id IS NULL OR public.is_coach_of_team(team_id) OR public.is_staff_or_admin())
    AND (rch_tv_category = 'general' OR public.is_admin())
  );

CREATE INDEX IF NOT EXISTS media_rch_tv_published_category_idx
  ON public.media (rch_tv_category,created_at DESC)
  WHERE status='published' AND rch_tv_category <> 'general';

COMMENT ON COLUMN public.media.rch_tv_category IS
  'Editorial RCH TV lane. General league uploads must not silently become licensed movies or official programming.';
COMMIT;
