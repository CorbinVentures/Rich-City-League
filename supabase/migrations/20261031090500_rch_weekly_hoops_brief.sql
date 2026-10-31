-- Opt-in weekly basketball digest with verified activity, labeled sponsors and one-click opt-out.
-- The sender stays disabled until a verified business mailing address is configured.
BEGIN;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS weekly_digest boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.rch_weekly_digest_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  postal_address text,
  sponsor_segments_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.rch_weekly_digest_settings(singleton) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.rch_weekly_digest_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rch_weekly_digest_settings FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.rch_weekly_digest_deliveries (
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  recipient_email text NOT NULL,
  request_id bigint,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','accepted','error','unconfirmed')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(recipient_id, week_start)
);
CREATE INDEX IF NOT EXISTS rch_weekly_digest_deliveries_status_idx ON public.rch_weekly_digest_deliveries(status, created_at);
ALTER TABLE public.rch_weekly_digest_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rch_weekly_digest_deliveries FROM PUBLIC, anon, authenticated;

-- The choice is made at sign-up. A missing value is NOT consent.
-- Profiles are created after auth.users contains the sign-up metadata.
CREATE OR REPLACE FUNCTION public.rch_signup_weekly_digest_preference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
BEGIN
  IF NOT COALESCE(NEW.is_system_account, false)
    AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = NEW.id AND u.raw_user_meta_data->>'weekly_digest_opt_in' = 'true'
    )
  THEN
    INSERT INTO public.notification_preferences(profile_id, weekly_digest)
    VALUES (NEW.id,true)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.rch_signup_weekly_digest_preference() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS rch_signup_weekly_digest_preference_trigger ON public.profiles;
CREATE TRIGGER rch_signup_weekly_digest_preference_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.rch_signup_weekly_digest_preference();

-- A high-entropy per-email token enables an unsubscribe WITHOUT signing in.
-- Never unsubscribe on a GET: the page requires a deliberate button click,
-- preventing email security scanners from opting out the member.
CREATE OR REPLACE FUNCTION public.rch_unsubscribe_weekly_digest(p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE did_change boolean;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{48}$' THEN RETURN false; END IF;
  UPDATE public.notification_preferences p
     SET weekly_digest=false, updated_at=now()
    FROM public.rch_weekly_digest_deliveries d
   WHERE d.recipient_id=p.profile_id
     AND d.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  GET DIAGNOSTICS did_change = ROW_COUNT;
  RETURN did_change;
END;
$function$;
REVOKE ALL ON FUNCTION public.rch_unsubscribe_weekly_digest(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rch_unsubscribe_weekly_digest(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rch_reconcile_weekly_digest_deliveries()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE processed integer:=0; expired integer:=0;
BEGIN
  WITH responses AS (
    SELECT d.recipient_id,d.week_start,r.status_code,r.timed_out,r.error_msg
    FROM public.rch_weekly_digest_deliveries d
    JOIN net._http_response r ON r.id=d.request_id
    WHERE d.status='queued'
  ), updated AS (
    UPDATE public.rch_weekly_digest_deliveries d
       SET status=CASE WHEN r.status_code BETWEEN 200 AND 299
                         AND NOT COALESCE(r.timed_out,false) THEN 'accepted' ELSE 'error' END,
           detail=CASE WHEN r.status_code BETWEEN 200 AND 299
                         AND NOT COALESCE(r.timed_out,false)
                       THEN 'Accepted by provider API; inbox delivery is not guaranteed'
                       ELSE left(COALESCE(r.error_msg,'Resend HTTP '||r.status_code::text),300) END
      FROM responses r
     WHERE d.recipient_id=r.recipient_id AND d.week_start=r.week_start
    RETURNING d.recipient_id
  )
  SELECT count(*) INTO processed FROM updated;

  WITH stale AS (
    UPDATE public.rch_weekly_digest_deliveries d
       SET status='unconfirmed',detail='Provider response expired; manual investigation required before retry'
     WHERE d.status='queued' AND d.created_at<now()-interval '8 hours'
       AND NOT EXISTS (SELECT 1 FROM net._http_response r WHERE r.id=d.request_id)
    RETURNING d.recipient_id
  )
  SELECT count(*) INTO expired FROM stale;
  RETURN processed+expired;
END;
$function$;
REVOKE ALL ON FUNCTION public.rch_reconcile_weekly_digest_deliveries() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.rch_send_weekly_digest_batch(p_limit integer DEFAULT 25)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  sender public.notification_email_config%ROWTYPE;
  settings public.rch_weekly_digest_settings%ROWTYPE;
  member RECORD;
  week_monday date;
  base_url text;
  api_key text;
  recipient_name text;
  item RECORD;
  event_html text;
  event_text text;
  news_html text;
  news_text text;
  sponsor_html text;
  sponsor_text text;
  personal_text text;
  html_body text;
  plain_body text;
  unsubscribe_url text;
  token text;
  delivery_id uuid;
  http_request bigint;
  runs_attended integer;
  rep_earned bigint;
  badges_earned integer;
  level_value integer;
  xp_value integer;
  total integer:=0;
BEGIN
  -- 9 AM local Monday, including correct daylight-saving transitions.
  IF extract(isodow FROM timezone('America/New_York',now()))<>1
     OR extract(hour FROM timezone('America/New_York',now()))<>9
     OR p_limit IS NULL OR p_limit<1 OR p_limit>50 THEN
    RETURN 0;
  END IF;
  SELECT * INTO settings FROM public.rch_weekly_digest_settings WHERE singleton=true;
  SELECT * INTO sender FROM public.notification_email_config WHERE singleton=true;
  IF NOT COALESCE(settings.enabled,false) OR NULLIF(trim(settings.postal_address),'') IS NULL
     OR NOT COALESCE(sender.enabled,false) THEN RETURN 0; END IF;
  SELECT decrypted_secret INTO api_key FROM vault.decrypted_secrets
    WHERE name='rch_resend_api_key' ORDER BY created_at DESC LIMIT 1;
  IF api_key IS NULL OR length(api_key)<20 THEN RETURN 0; END IF;
  week_monday:=date_trunc('week',timezone('America/New_York',now()))::date;
  base_url:=rtrim(sender.site_base_url,'/');

  FOR member IN
    SELECT p.id, p.first_name, p.display_name, u.email
    FROM public.profiles p
    JOIN auth.users u ON u.id=p.id
    JOIN public.notification_preferences prefs ON prefs.profile_id=p.id
    WHERE prefs.weekly_digest AND prefs.email_enabled
      AND u.email_confirmed_at IS NOT NULL
      AND COALESCE(p.onboarding_complete,false)
      AND COALESCE(p.is_active,true) AND NOT COALESCE(p.is_system_account,false)
      AND NOT EXISTS (SELECT 1 FROM public.rch_weekly_digest_deliveries d
                      WHERE d.recipient_id=p.id AND d.week_start=week_monday)
    ORDER BY p.id
    LIMIT p_limit
  LOOP
    delivery_id:=NULL;
    token:=encode(gen_random_bytes(24),'hex');
    INSERT INTO public.rch_weekly_digest_deliveries(recipient_id,week_start,recipient_email,token_hash,status,detail)
    VALUES(member.id,week_monday,member.email,encode(sha256(convert_to(token,'UTF8')),'hex'),'queued','Preparing Weekly Hoops Brief')
    ON CONFLICT (recipient_id,week_start) DO NOTHING
    RETURNING recipient_id INTO delivery_id;
    IF delivery_id IS NULL THEN CONTINUE; END IF;

    BEGIN
      recipient_name:=COALESCE(NULLIF(trim(member.first_name),''),NULLIF(trim(member.display_name),''),'hooper');
      unsubscribe_url:=base_url||'/notifications/unsubscribe?token='||token;

      -- Two verified upcoming event sources, with no draft or cancelled entries.
      SELECT COALESCE(string_agg(
        format('<div style="margin:0 0 12px"><a style="color:#fff;font-weight:700" href="%s">%s</a><div style="color:#94a3b8;font-size:12px">%s ET</div></div>',
          public.rch_email_escape(base_url||link),public.rch_email_escape(title),
          public.rch_email_escape(to_char(timezone('America/New_York',starts_at),'Dy Mon DD, HH12:MI AM'))),
        '' ORDER BY starts_at),'<p style="color:#94a3b8">No confirmed events yet. Browse the latest Runs.</p>'),
        COALESCE(string_agg(title||' - '||to_char(timezone('America/New_York',starts_at),'Mon DD HH12:MI AM'),E'\n' ORDER BY starts_at),'Browse open runs for upcoming activity')
      INTO event_html,event_text
      FROM (
        SELECT title,starts_at,'/runs'::text AS link FROM public.runs
        WHERE status='open' AND starts_at>=now() AND starts_at<now()+interval '8 days'
        UNION ALL
        SELECT title,starts_at,'/discover'::text AS link FROM public.network_events
        WHERE status IN ('published','approved','active')
          AND starts_at>=now() AND starts_at<now()+interval '8 days'
        ORDER BY starts_at LIMIT 4
      ) events;

      SELECT COALESCE(string_agg(
        format('<div style="margin-bottom:12px"><a style="font-weight:700;color:#fff" href="%s">%s</a><div style="color:#94a3b8;font-size:12px">%s</div></div>',
          public.rch_email_escape(base_url||'/news/'||slug),public.rch_email_escape(title),public.rch_email_escape(COALESCE(excerpt,''))),
        '' ORDER BY published_at DESC),'<p style="color:#94a3b8">Catch up on Virginia basketball in the newsroom.</p>'),
        COALESCE(string_agg(title||' - '||base_url||'/news/'||slug,E'\n' ORDER BY published_at DESC),'See the latest RCH news')
      INTO news_html,news_text
      FROM (SELECT title,slug,excerpt,published_at FROM public.news
        WHERE status::text='published' AND published_at >= now()-interval '14 days'
        ORDER BY published_at DESC LIMIT 3) articles;

      SELECT count(DISTINCT run_id)::integer INTO runs_attended FROM public.run_checkins
        WHERE profile_id=member.id AND checked_in_at>=now()-interval '7 days';
      SELECT COALESCE(sum(rep),0)::bigint INTO rep_earned FROM public.rch_run_rep_events
        WHERE profile_id=member.id AND created_at>=now()-interval '7 days';
      SELECT (
        (SELECT count(*) FROM public.rch_run_badge_awards
         WHERE profile_id=member.id AND awarded_at>=now()-interval '7 days')+
        (SELECT count(*) FROM public.rch_run_stat_badges
         WHERE profile_id=member.id AND earned_at>=now()-interval '7 days')
      )::integer INTO badges_earned;
      SELECT level,xp INTO level_value,xp_value FROM public.user_levels WHERE profile_id=member.id;
      personal_text:=format('Verified runs attended: %s | Run REP earned: %s | New badges: %s',
        COALESCE(runs_attended,0),COALESCE(rep_earned,0),COALESCE(badges_earned,0));
      IF level_value IS NOT NULL THEN personal_text:=personal_text||
        format(' | Hooper Level: %s | XP: %s',level_value,COALESCE(xp_value,0)); END IF;

      sponsor_html:=''; sponsor_text:='';
      IF settings.sponsor_segments_enabled THEN
        SELECT format(
          '<div style="margin-top:18px;padding:16px;background:#172235;border:1px solid #374151;border-radius:12px"><div style="font-size:10px;color:#fda56a;letter-spacing:2px;font-weight:800">SPONSORED • COMMUNITY PARTNER</div><p style="font-weight:700;color:#fff">%s</p><a style="color:#9ad4ff" href="%s">Explore partner</a></div>',
          public.rch_email_escape(headline),public.rch_email_escape(destination_url)),
          'Sponsored: '||headline||' - '||destination_url
        INTO sponsor_html,sponsor_text
        FROM public.network_campaigns
        WHERE status IN ('approved','active') AND payment_status='paid'
          AND reviewed_by IS NOT NULL
          AND requested_placement IN ('digest','weekend-guide')
          AND destination_url ~* '^https://[^[:space:]]+$'
          AND requested_starts_at<=now() AND requested_ends_at>=now()
        ORDER BY reviewed_at DESC NULLS LAST LIMIT 1;
      END IF;

      html_body:=format(
        '<!doctype html><html lang="en"><body style="margin:0;background:#080e17;color:#fff;font-family:Arial,sans-serif">'||
        '<table width="100%%" role="presentation" cellspacing="0" style="background:#080e17;padding:24px 10px"><tr><td align="center">'||
        '<table width="100%%" role="presentation" cellspacing="0" style="max-width:600px;background:#0d1829;border:1px solid #253449;border-radius:20px">'||
        '<tr><td style="padding:28px;background:#14253b;border-bottom:3px solid #f97316"><div style="font-size:11px;letter-spacing:2px;font-weight:800;color:#fb923c">RICH CITY HOOPS • WEEKLY BRIEF</div>'||
        '<h1 style="margin:12px 0;font-size:30px;line-height:1.15">Your week in Virginia basketball.</h1><p style="color:#cbd5e1;line-height:1.6">What is happening, what you earned and what is next, %s.</p></td></tr>'||
        '<tr><td style="padding:24px 28px"><h2 style="color:#fb923c;font-size:18px">UPCOMING EVENTS & RUNS</h2>%s'||
        '<h2 style="margin-top:28px;color:#fb923c;font-size:18px">AROUND THE LEAGUE</h2>%s'||
        '<h2 style="margin-top:28px;color:#fb923c;font-size:18px">YOUR COURT RECAP & BADGES</h2><p style="line-height:1.9;color:#dbe4f1">%s</p>'||
        '<a href="%s" style="display:inline-block;background:#f97316;color:#101827;text-decoration:none;font-weight:800;padding:12px 17px;border-radius:9px">ENTER RCH</a>%s</td></tr>'||
        '<tr><td style="padding:24px 28px;border-top:1px solid #263449;font-size:11px;line-height:1.8;color:#94a3b8">You opted in to the RCH Weekly Hoops Brief, including disclosed partner features. %s<br>'||
        '<a href="%s" style="color:#9ad4ff">Unsubscribe from weekly emails</a> • <a href="%s" style="color:#9ad4ff">Manage notifications</a><br>%s</td></tr></table></td></tr></table></body></html>',
        public.rch_email_escape(recipient_name),event_html,news_html,public.rch_email_escape(personal_text),
        public.rch_email_escape(base_url||'/app'),COALESCE(sponsor_html,''),
        'Sender: '||public.rch_email_escape(sender.sender_name),public.rch_email_escape(unsubscribe_url),
        public.rch_email_escape(base_url||'/settings/notifications'),
        public.rch_email_escape(settings.postal_address));
      plain_body:='RICH CITY HOOPS | WEEKLY HOOPS BRIEF'||E'\n\n'||
        'Hi '||recipient_name||E',\n\nUPCOMING EVENTS & RUNS\n'||event_text||
        E'\n\nAROUND THE LEAGUE\n'||news_text||
        E'\n\nYOUR COURT RECAP & BADGES\n'||personal_text||
        E'\n\n'||COALESCE(sponsor_text||E'\n\n','')||
        'Open RCH: '||base_url||'/app'||E'\nUnsubscribe: '||unsubscribe_url||
        E'\nPreferences: '||base_url||'/settings/notifications'||E'\n'||settings.postal_address;

      http_request:=net.http_post(
        url:='https://api.resend.com/emails',
        headers:=jsonb_build_object(
          'Authorization','Bearer '||api_key,'Content-Type','application/json',
          'Idempotency-Key','rch-weekly-'||week_monday::text||'-'||member.id::text),
        body:=jsonb_build_object(
          'from',sender.sender_name||' <'||sender.sender_email||'>',
          'to',jsonb_build_array(member.email),'reply_to',sender.reply_to,
          'subject','Your Weekly Hoops Brief | '||to_char(week_monday,'Mon DD'),
          'html',html_body,'text',plain_body,
          'headers',jsonb_build_object('List-Unsubscribe','<'||unsubscribe_url||'>')),
        timeout_milliseconds:=5000
      );
      UPDATE public.rch_weekly_digest_deliveries
         SET request_id=http_request,detail='Queued with Resend provider'
       WHERE recipient_id=member.id AND week_start=week_monday;
      total:=total+1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.rch_weekly_digest_deliveries
         SET status='error',detail=left(SQLERRM,300)
       WHERE recipient_id=member.id AND week_start=week_monday;
      RAISE WARNING 'RCH weekly digest delivery preparation failed for user %: %',member.id,SQLERRM;
    END;
  END LOOP;
  RETURN total;
END;
$function$;
REVOKE ALL ON FUNCTION public.rch_send_weekly_digest_batch(integer) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('rch-weekly-hoops-brief','* * * * *',
  'select public.rch_send_weekly_digest_batch(25) where extract(isodow from timezone(''America/New_York'',now()))=1 and extract(hour from timezone(''America/New_York'',now()))=9');
SELECT cron.schedule('rch-reconcile-weekly-digest','*/2 * * * *',
  'select public.rch_reconcile_weekly_digest_deliveries()');

COMMIT;
