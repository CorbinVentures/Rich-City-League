-- Read-only publication-status lookup for RCH Sites server endpoints.
-- Prevents fresh local/staging databases from depending on inherited ACLs.
-- No browser or anonymous grants are changed.
grant select on table public.rch_sites to service_role;
