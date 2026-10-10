-- Preserve authorized staff system-account configuration, but never allow
-- ordinary members to masquerade as official system accounts.
-- This refines the earlier production profile guard.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_profile_system_and_referral_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_privileged boolean;
  v_staff_manager boolean;
BEGIN
  v_privileged := session_user IN ('postgres','supabase_admin')
    OR coalesce(auth.role(),'')='service_role'
    OR public.is_admin();
  -- configure_system_account() intentionally authorizes staff as well as admins.
  -- Keep that trusted RPC working; ordinary members fail both role checks.
  v_staff_manager := v_privileged OR public.is_staff_or_admin();

  IF NOT v_staff_manager AND (
    NEW.is_system_account IS DISTINCT FROM OLD.is_system_account
    OR NEW.system_account_key IS DISTINCT FROM OLD.system_account_key
  ) THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Only staff can change system-account identity';
  END IF;

  -- Direct profile edits cannot mint referral rewards. Updates invoked by the
  -- trusted referral qualification trigger execute at nesting depth > 1.
  IF NOT v_privileged
    AND NEW.qualified_referral_count IS DISTINCT FROM OLD.qualified_referral_count
    AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Referral totals are computed by the server';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_system_and_referral_fields()
  FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION public.guard_profile_system_and_referral_fields()
IS 'Protect system accounts from member impersonation while preserving authorized staff RPC and server-controlled referral counting.';
COMMIT;
