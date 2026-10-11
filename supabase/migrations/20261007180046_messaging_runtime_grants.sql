begin;

-- Supabase preview branches are rebuilt from repository migrations and do not
-- inherit dashboard-era table grants from production. RLS still remains the
-- authorization boundary; these grants only expose the operations the client
-- messaging surfaces actually use.

grant select on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;

grant select, insert, update on table public.messages to authenticated;

grant select, insert, update on table public.conversation_preferences to authenticated;
grant select, insert, delete on table public.message_reactions to authenticated;

grant select, update on table public.notifications to authenticated;
grant select on table public.user_levels to authenticated;

-- Notification settings are part of the messaging experience and are edited
-- directly by the signed-in member under their existing RLS policy.
grant select, insert, update on table public.notification_preferences to authenticated;

commit;
