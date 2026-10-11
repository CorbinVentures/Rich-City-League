-- Correlate asynchronous pg_net responses to the one-time registration
-- email queue; "accepted" means the provider accepted the request, not inbox delivery.
BEGIN;
ALTER TABLE public.registration_welcome_deliveries
  DROP CONSTRAINT IF EXISTS registration_welcome_deliveries_status_check;
ALTER TABLE public.registration_welcome_deliveries
  ADD CONSTRAINT registration_welcome_deliveries_status_check
  CHECK (status IN ('queued','accepted','error'));

CREATE OR REPLACE FUNCTION public.reconcile_registration_welcome_email()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE processed integer;
BEGIN
  WITH responses AS (
    SELECT d.user_id, r.status_code, r.timed_out, r.error_msg
    FROM public.registration_welcome_deliveries d
    JOIN net._http_response r ON r.id = d.request_id
    WHERE d.status='queued'
  ), updated AS (
    UPDATE public.registration_welcome_deliveries d
    SET status=CASE WHEN r.status_code BETWEEN 200 AND 299
                        AND NOT COALESCE(r.timed_out,false) THEN 'accepted'
                    ELSE 'error' END,
        detail=CASE WHEN r.status_code BETWEEN 200 AND 299
                         AND NOT COALESCE(r.timed_out,false)
                    THEN 'Accepted by Resend API; inbox delivery is tracked by the email provider'
                    ELSE left(coalesce(r.error_msg,'Resend rejected request: HTTP '||coalesce(r.status_code::text,'unknown')),300)
               END
    FROM responses r WHERE d.user_id=r.user_id
    RETURNING d.user_id
  )
  SELECT count(*) INTO processed FROM updated;
  RETURN processed;
END;
$function$;
REVOKE ALL ON FUNCTION public.reconcile_registration_welcome_email() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule(
  'rch-reconcile-registration-welcome',
  '*/2 * * * *',
  'select public.reconcile_registration_welcome_email()'
);
COMMIT;
