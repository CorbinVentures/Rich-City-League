-- Private, read-only member data for the in-PWA Weekly Hoops Brief.
-- No member parameters: the authenticated user can only retrieve their own recap.
BEGIN;
CREATE OR REPLACE FUNCTION public.rch_get_member_weekly_brief()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  viewer uuid := auth.uid();
  member public.profiles%ROWTYPE;
  since_at timestamptz := now()-interval '7 days';
  until_at timestamptz := now()+interval '7 days';
  snapshot jsonb;
BEGIN
  IF viewer IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO member FROM public.profiles
  WHERE id=viewer AND COALESCE(is_active,true) AND NOT COALESCE(is_system_account,false);
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'week_of', to_char(timezone('America/New_York',now()),'Mon DD, YYYY'),
    'name', COALESCE(NULLIF(trim(member.first_name),''),NULLIF(trim(member.display_name),''),'Hooper'),
    'events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',e.id,'title',e.title,'time',e.starts_at,'location',e.location,'type','run') ORDER BY e.starts_at)
      FROM (SELECT id,title,starts_at,location FROM public.runs
        WHERE status='open' AND starts_at>=now() AND starts_at<until_at
        ORDER BY starts_at LIMIT 4) e
    ),'[]'::jsonb),
    'community_events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',e.id,'title',e.title,'time',e.starts_at,'city',e.city,'slug',e.slug) ORDER BY e.starts_at)
      FROM (SELECT id,title,starts_at,city,slug FROM public.network_events
        WHERE status IN ('published','approved','active') AND starts_at>=now() AND starts_at<until_at
        ORDER BY starts_at LIMIT 3) e
    ),'[]'::jsonb),
    'news', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'slug',n.slug,
        'excerpt',n.excerpt,'published_at',n.published_at) ORDER BY n.published_at DESC)
      FROM (SELECT id,title,slug,excerpt,published_at FROM public.news
        WHERE status::text='published' AND published_at>=now()-interval '14 days'
        ORDER BY published_at DESC LIMIT 4) n
    ),'[]'::jsonb),
    'run_checkins', (SELECT count(DISTINCT run_id) FROM public.run_checkins
                     WHERE profile_id=viewer AND checked_in_at>=since_at),
    'earned_rep', (SELECT COALESCE(sum(rep),0) FROM public.rch_run_rep_events
                   WHERE profile_id=viewer AND created_at>=since_at),
    'unlocked_badges', (SELECT count(*) FROM public.rch_run_badge_awards
                         WHERE profile_id=viewer AND awarded_at>=since_at)
                       +(SELECT count(*) FROM public.rch_run_stat_badges
                         WHERE profile_id=viewer AND earned_at>=since_at),
    'level', (SELECT level FROM public.user_levels WHERE profile_id=viewer),
    'xp', (SELECT xp FROM public.user_levels WHERE profile_id=viewer),
    'sponsor', (SELECT jsonb_build_object(
       'headline',c.headline,'url',c.destination_url,'label','Sponsored • Community Partner')
       FROM public.network_campaigns c
       WHERE c.status IN ('approved','active') AND c.payment_status='paid' AND c.reviewed_by IS NOT NULL
         AND c.requested_placement IN ('digest','weekend-guide')
         AND c.destination_url ~* '^https://[^[:space:]]+$'
         AND c.requested_starts_at<=now() AND c.requested_ends_at>=now()
       ORDER BY c.reviewed_at DESC NULLS LAST LIMIT 1)
  ) INTO snapshot;
  RETURN snapshot;
END;
$function$;
REVOKE ALL ON FUNCTION public.rch_get_member_weekly_brief() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rch_get_member_weekly_brief() TO authenticated;
COMMIT;
