-- Ensure official scoring marks a scheduled game live on its first recorded play.
-- Uses games (the existing Realtime publication) as the authoritative
-- synchronization signal for RCH public scores and the standalone PWA.
BEGIN;

CREATE OR REPLACE FUNCTION public.rch_scorebook_live_game_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.scorebook_status = 'live'
     AND NEW.status = 'scheduled'::public.game_status
     AND OLD.status = 'scheduled'::public.game_status THEN
    NEW.status := 'live'::public.game_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rch_scorebook_live_game_status ON public.games;
CREATE TRIGGER rch_scorebook_live_game_status
  BEFORE UPDATE OF scorebook_status ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.rch_scorebook_live_game_status();

COMMIT;
