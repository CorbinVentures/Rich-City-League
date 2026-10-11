-- Block direct member edits of system-account identity and earned referral counts.
-- Existing profile triggers already protect role, active status and VIP status.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_profile_system_and_referral_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trusted boolean;
BEGIN
  -- SECURITY DEFINER changes current_user to the function owner. Use
  -- session_user instead to distinguish direct privileged DB sessions from
  -- PostgREST's authenticator session.
  v_trusted := session_user IN ('postgres','supabase_admin')
    OR coalesce(auth.role(), '') = 'service_role'
    OR public.is_admin();

  IF NOT v_trusted AND (
    NEW.is_system_account IS DISTINCT FROM OLD.is_system_account
    OR NEW.system_account_key IS DISTINCT FROM OLD.system_account_key
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE='42501',
      MESSAGE='Only administrators can change system-account identity';
  END IF;

  -- Referral qualification is maintained by the trusted
  -- sync_qualified_referral_growth AFTER trigger on public.referrals.
  -- That nested update enters this profile trigger with depth > 1.
  -- Reject direct modifications coming from the client at depth 1.
  IF NOT v_trusted
     AND NEW.qualified_referral_count IS DISTINCT FROM OLD.qualified_referral_count
     AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION USING
      ERRCODE='42501',
      MESSAGE='Referral totals are computed by the server';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_system_and_referral_fields()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_profile_system_and_referral_fields ON public.profiles;
CREATE TRIGGER guard_profile_system_and_referral_fields
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_system_and_referral_fields();
COMMENT ON FUNCTION public.guard_profile_system_and_referral_fields()
IS 'Protect system-account identity and earned referral count from client-side profile updates while allowing server-controlled referral triggers.';
COMMIT;
