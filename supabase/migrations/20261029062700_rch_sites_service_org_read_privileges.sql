-- Reproducible server-side organization verification in fresh Supabase databases.
-- Production may inherit these privileges from old default grants; disposable
-- local databases must not depend on implicit service_role table ACLs.
-- Authenticated users continue using their existing row-level membership policy.
grant select on table public.network_organizations to service_role;
grant select on table public.network_organization_members to service_role;
