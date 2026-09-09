-- Restrict trigger-only functions while preserving RLS and authentication behavior.

alter function public.set_updated_at()
  set search_path = pg_catalog;

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.protect_profile_privileged_fields() from public;
