drop policy if exists profile_exposure_dedupe_no_client_access on public.profile_exposure_dedupe;
create policy profile_exposure_dedupe_no_client_access
on public.profile_exposure_dedupe
for all
to anon, authenticated
using (false)
with check (false);

create index if not exists member_spotlight_requests_reviewed_by_idx on public.member_spotlight_requests(reviewed_by) where reviewed_by is not null;
