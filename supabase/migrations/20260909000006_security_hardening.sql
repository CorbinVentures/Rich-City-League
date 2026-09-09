-- Prevent direct access to the privileged standings rebuild function.

revoke execute on function public.rebuild_standings(uuid, uuid) from public;
