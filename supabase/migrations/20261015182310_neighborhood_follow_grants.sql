-- SECURITY INVOKER endpoints need explicit table grants on clean databases.
-- Existing follows RLS still limits writes to auth.uid() as follower_id.
grant select, insert on table public.follows to authenticated;
