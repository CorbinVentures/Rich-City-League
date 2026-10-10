-- RCH production hardening: remove elevated public player views while
-- retaining only explicitly published basketball data for anonymous visitors.
-- Sensitive players fields (date_of_birth/profile_id/LeagueApps IDs) remain private.
BEGIN;

CREATE TABLE IF NOT EXISTS public.public_players_cache
  AS SELECT * FROM public.public_players WITH NO DATA;
ALTER TABLE public.public_players_cache
  ADD CONSTRAINT public_players_cache_pkey PRIMARY KEY (id);
ALTER TABLE public.public_players_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_players_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_players_cache TO anon, authenticated;
CREATE POLICY "published player cards only"
  ON public.public_players_cache FOR SELECT TO anon, authenticated
  USING (true);

INSERT INTO public.public_players_cache
  (id,first_name,last_name,jersey_number,"position",height_inches,hometown,photo_url,is_active)
SELECT id,first_name,last_name,jersey_number,"position",height_inches,hometown,photo_url,is_active
FROM public.players WHERE is_active IS TRUE
ON CONFLICT(id) DO UPDATE
SET first_name=EXCLUDED.first_name,
    last_name=EXCLUDED.last_name,
    jersey_number=EXCLUDED.jersey_number,
    "position"=EXCLUDED."position",
    height_inches=EXCLUDED.height_inches,
    hometown=EXCLUDED.hometown,
    photo_url=EXCLUDED.photo_url,
    is_active=EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.sync_published_player_card()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
BEGIN
  IF TG_OP='DELETE' THEN
    DELETE FROM public.public_players_cache WHERE id=OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.is_active IS DISTINCT FROM TRUE THEN
    DELETE FROM public.public_players_cache WHERE id=NEW.id;
    RETURN NEW;
  END IF;
  INSERT INTO public.public_players_cache
    (id,first_name,last_name,jersey_number,"position",height_inches,hometown,photo_url,is_active)
  VALUES
    (NEW.id,NEW.first_name,NEW.last_name,NEW.jersey_number,NEW."position",NEW.height_inches,NEW.hometown,NEW.photo_url,NEW.is_active)
  ON CONFLICT(id) DO UPDATE
  SET first_name=EXCLUDED.first_name,
      last_name=EXCLUDED.last_name,
      jersey_number=EXCLUDED.jersey_number,
      "position"=EXCLUDED."position",
      height_inches=EXCLUDED.height_inches,
      hometown=EXCLUDED.hometown,
      photo_url=EXCLUDED.photo_url,
      is_active=EXCLUDED.is_active;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.sync_published_player_card() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_published_player_card ON public.players;
CREATE TRIGGER sync_published_player_card
AFTER INSERT OR UPDATE OR DELETE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.sync_published_player_card();

-- Keep the existing public API names and column signatures unchanged.
CREATE OR REPLACE VIEW public.public_players
WITH (security_invoker=true)
AS SELECT id,first_name,last_name,jersey_number,"position",height_inches,hometown,photo_url,is_active
   FROM public.public_players_cache;

CREATE OR REPLACE VIEW public.public_player_iq
WITH (security_invoker=true)
AS SELECT p.player_id,p.rcl_rating,p.court_performance_score,p.skill_profile_score,
          p.teammate_grade_score,p.community_popularity_score,p.growth_consistency_score,
          p.exposure_index,p.player_archetype,p.rating_trend,p.previous_rating,
          p.rating_change,p.games_evaluated,p.last_calculated_at
   FROM public.player_iq_profiles p
   JOIN public.public_players_cache player ON player.id=p.player_id;
REVOKE ALL ON public.public_players FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.public_player_iq FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.public_players TO anon,authenticated;
GRANT SELECT ON public.public_player_iq TO anon,authenticated;

COMMENT ON TABLE public.public_players_cache IS 'Published player display fields only. Trigger-synced; never store private player identifiers or date of birth.';
COMMIT;
