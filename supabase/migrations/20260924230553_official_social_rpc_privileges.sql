begin;

-- Explicitly remove PostgreSQL's default PUBLIC execute grant from privileged
-- RCL RPCs. Regrant only the roles that are intentionally supported.

revoke execute on function public.configure_system_account(uuid,text,text) from public,anon,authenticated;
grant execute on function public.configure_system_account(uuid,text,text) to authenticated;

revoke execute on function public.publish_official_social_post(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.publish_official_social_post(text,text,text,uuid) to authenticated;

revoke execute on function public.ensure_referral_code(uuid) from public,anon,authenticated;
grant execute on function public.ensure_referral_code(uuid) to authenticated;

revoke execute on function public.referral_stats(uuid) from public,anon,authenticated;
grant execute on function public.referral_stats(uuid) to authenticated;

-- claim_referral was already hardened, but keep its intended ACL explicit.
revoke execute on function public.claim_referral(text) from public,anon;
grant execute on function public.claim_referral(text) to authenticated;

commit;
