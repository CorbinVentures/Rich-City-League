begin;
-- A legacy SECURITY DEFINER award_xp RPC accepted member-supplied amounts
-- and arbitrary source IDs for self-awards. That permission is unacceptable
-- when XP is convertible into spendable REP. Real domain-event triggers
-- continue to run as the database owner; no browser may invoke award_xp.
revoke all on function public.award_xp(uuid,integer,text,text,uuid)
 from public,anon,authenticated;
-- This does not revoke the verified Run and social-event award triggers.
comment on function public.award_xp(uuid,integer,text,text,uuid) is
 'Internal lifetime XP grant helper only. Untrusted user-supplied XP amounts and fabricated source IDs are forbidden.';
commit;