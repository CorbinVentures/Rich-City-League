-- Tighten the admin-only outreach table after adding contact fields.
-- RLS remains the row boundary; authenticated users only receive the CRUD verbs the admin UI needs.

revoke all on table public.network_acquisition_prospects from anon, authenticated;
grant select, insert, update, delete on table public.network_acquisition_prospects to authenticated;

revoke all on function public.import_network_acquisition_prospects(jsonb) from public, anon;
grant execute on function public.import_network_acquisition_prospects(jsonb) to authenticated;
