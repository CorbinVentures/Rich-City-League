begin;

create index if not exists network_campaigns_created_by_idx
  on public.network_campaigns(created_by);
create index if not exists network_campaigns_event_idx
  on public.network_campaigns(event_id) where event_id is not null;
create index if not exists network_campaigns_reviewed_by_idx
  on public.network_campaigns(reviewed_by) where reviewed_by is not null;

create index if not exists network_event_submissions_published_event_idx
  on public.network_event_submissions(published_event_id) where published_event_id is not null;
create index if not exists network_event_submissions_reviewed_by_idx
  on public.network_event_submissions(reviewed_by) where reviewed_by is not null;
create index if not exists network_event_submissions_submitted_by_idx
  on public.network_event_submissions(submitted_by);

create index if not exists network_exposure_events_network_event_idx
  on public.network_exposure_events(network_event_id) where network_event_id is not null;

create index if not exists network_organization_claims_claimant_idx
  on public.network_organization_claims(claimant_id);
create index if not exists network_organization_claims_reviewed_by_idx
  on public.network_organization_claims(reviewed_by) where reviewed_by is not null;

commit;
