begin;

-- Browser route protection alone does not secure direct REST or SDK writes.
-- AAL2 is required on the data plane for role and staff administration.
-- The owner's routine profile edits do not require MFA, but editing another
-- member's profile (the admin capability) always requires an MFA-verified JWT.
create policy "mfa for administrative profile updates"
on public.profiles as restrictive for update to authenticated
using (
  id=(select auth.uid()) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
)
with check (
  id=(select auth.uid()) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
);

create policy "mfa for administrative profile deletion"
on public.profiles as restrictive for delete to authenticated
using (
  id=(select auth.uid()) or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
);

-- Ordinary members can still submit their own pending player/coach/fan
-- applications without MFA. Approvals and privileged grants require AAL2.
create policy "mfa for privileged role inserts"
on public.profile_roles as restrictive for insert to authenticated
with check (
  (
    profile_id=(select auth.uid())
    and status='pending'
    and role in ('fan','player','coach')
  )
  or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
);

create policy "mfa for role updates"
on public.profile_roles as restrictive for update to authenticated
using (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
with check (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');

create policy "mfa for role deletion"
on public.profile_roles as restrictive for delete to authenticated
using (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');

-- Scoped staff records and global settings have broader operational impact
-- than a member's own profile. Select access remains unchanged.
create policy "mfa for staff insert"
on public.staff as restrictive for insert to authenticated
with check (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');
create policy "mfa for staff update"
on public.staff as restrictive for update to authenticated
using (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
with check (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');
create policy "mfa for staff delete"
on public.staff as restrictive for delete to authenticated
using (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');

create policy "mfa for site settings insert"
on public.site_settings as restrictive for insert to authenticated
with check (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');
create policy "mfa for site settings update"
on public.site_settings as restrictive for update to authenticated
using (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2')
with check (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');
create policy "mfa for site settings delete"
on public.site_settings as restrictive for delete to authenticated
using (coalesce((select auth.jwt()->>'aal'),'aal1')='aal2');

commit;
