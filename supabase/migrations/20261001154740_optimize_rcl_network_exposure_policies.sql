begin;

create index if not exists network_promotions_organization_idx on public.network_promotions(organization_id);
create index if not exists network_promotions_event_idx on public.network_promotions(event_id) where event_id is not null;
create index if not exists network_partner_inquiries_pipeline_idx on public.network_partner_inquiries(status, created_at desc);

-- Keep public/admin SELECT behavior in one policy per table, then scope admin writes by action.
drop policy if exists "network organizations admin manage" on public.network_organizations;
create policy "network organizations admin insert" on public.network_organizations for insert to authenticated with check (public.is_admin());
create policy "network organizations admin update" on public.network_organizations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "network organizations admin delete" on public.network_organizations for delete to authenticated using (public.is_admin());

drop policy if exists "network events admin manage" on public.network_events;
create policy "network events admin insert" on public.network_events for insert to authenticated with check (public.is_admin());
create policy "network events admin update" on public.network_events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "network events admin delete" on public.network_events for delete to authenticated using (public.is_admin());

drop policy if exists "network promotions admin manage" on public.network_promotions;
create policy "network promotions admin insert" on public.network_promotions for insert to authenticated with check (public.is_admin());
create policy "network promotions admin update" on public.network_promotions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "network promotions admin delete" on public.network_promotions for delete to authenticated using (public.is_admin());

drop policy if exists "network exposure admin manage" on public.network_exposure_daily;
create policy "network exposure admin insert" on public.network_exposure_daily for insert to authenticated with check (public.is_admin());
create policy "network exposure admin update" on public.network_exposure_daily for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "network exposure admin delete" on public.network_exposure_daily for delete to authenticated using (public.is_admin());

commit;
