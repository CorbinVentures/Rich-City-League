-- Reconcile all asynchronous transactional notifications without resending email.
-- "accepted" describes the provider API response, not guaranteed inbox delivery.
BEGIN;

ALTER TABLE public.notification_email_deliveries
  DROP CONSTRAINT IF EXISTS notification_email_deliveries_status_check;
ALTER TABLE public.notification_email_deliveries
  ADD CONSTRAINT notification_email_deliveries_status_check
  CHECK (status IN ('queued','accepted','skipped','error','unconfirmed'));

CREATE OR REPLACE FUNCTION public.reconcile_notification_email_deliveries()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  processed integer := 0;
  unknown_count integer := 0;
BEGIN
  WITH responses AS (
    SELECT d.id, r.status_code,r.error_msg,r.timed_out
    FROM public.notification_email_deliveries d
    JOIN net._http_response r ON r.id=d.request_id
    WHERE d.status='queued'
  ), updated AS (
    UPDATE public.notification_email_deliveries d
    SET status=CASE WHEN r.status_code BETWEEN 200 AND 299 AND NOT COALESCE(r.timed_out,false)
                    THEN 'accepted' ELSE 'error' END,
        detail=CASE WHEN r.status_code BETWEEN 200 AND 299 AND NOT COALESCE(r.timed_out,false)
               THEN 'Accepted by Resend API; consult provider events for actual delivery'
               ELSE left(coalesce(r.error_msg,'Resend request failed: HTTP '||coalesce(r.status_code::text,'unknown')),300) END
    FROM responses r WHERE d.id=r.id
    RETURNING d.id
  )
  SELECT count(*) INTO processed FROM updated;

  -- pg_net retains responses only briefly. Do not invent a delivery result
  -- or automatically resend; mark historical unknowns as unconfirmed.
  WITH expired AS (
    UPDATE public.notification_email_deliveries d
    SET status='unconfirmed',
        detail='Provider response expired; verify delivery in Resend before any manual retry'
    WHERE d.status='queued' AND d.request_id IS NOT NULL
      AND d.created_at < now()-interval '8 hours'
      AND NOT EXISTS (SELECT 1 FROM net._http_response r WHERE r.id=d.request_id)
    RETURNING d.id
  )
  SELECT count(*) INTO unknown_count FROM expired;
  RETURN processed+unknown_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.reconcile_notification_email_deliveries() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule(
  'rch-reconcile-notification-deliveries',
  '*/2 * * * *',
  'select public.reconcile_notification_email_deliveries()'
);

-- All four functions exclusively call pg_catalog functions / NEW fields;
-- explicitly pin their lookup path to prevent mutable search_path abuse.
ALTER FUNCTION public.infer_rep_dimension(text,text) SET search_path='';
ALTER FUNCTION public.touch_conversation_preference_updated_at() SET search_path='';
ALTER FUNCTION public.rcl_age(date) SET search_path='';
ALTER FUNCTION public.rch_email_escape(text) SET search_path='';
COMMIT;
