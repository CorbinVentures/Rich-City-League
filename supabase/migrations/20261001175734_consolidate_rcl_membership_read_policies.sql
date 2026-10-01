drop policy if exists membership_plans_public_read on public.membership_plans;
drop policy if exists membership_plans_admin_read on public.membership_plans;
create policy membership_plans_anon_read
on public.membership_plans for select to anon
using (is_active and is_public);
create policy membership_plans_authenticated_read
on public.membership_plans for select to authenticated
using ((is_active and is_public) or (select public.is_admin()));

drop policy if exists member_subscriptions_self_read on public.member_subscriptions;
drop policy if exists member_subscriptions_admin_read on public.member_subscriptions;
create policy member_subscriptions_authorized_read
on public.member_subscriptions for select to authenticated
using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists member_spotlight_requests_self_read on public.member_spotlight_requests;
drop policy if exists member_spotlight_requests_admin_all on public.member_spotlight_requests;
create policy member_spotlight_requests_authorized_read
on public.member_spotlight_requests for select to authenticated
using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy member_spotlight_requests_admin_insert
on public.member_spotlight_requests for insert to authenticated
with check ((select public.is_admin()));
create policy member_spotlight_requests_admin_update
on public.member_spotlight_requests for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy member_spotlight_requests_admin_delete
on public.member_spotlight_requests for delete to authenticated
using ((select public.is_admin()));

drop policy if exists profile_exposure_daily_member_read on public.profile_exposure_daily;
drop policy if exists profile_exposure_daily_admin_read on public.profile_exposure_daily;
create policy profile_exposure_daily_authorized_read
on public.profile_exposure_daily for select to authenticated
using (((select auth.uid()) = profile_id and (select public.member_has_entitlement('profile_analytics'))) or (select public.is_admin()));
