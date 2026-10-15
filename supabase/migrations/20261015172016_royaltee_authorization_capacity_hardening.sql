begin;
-- Give Royaltee control to its explicitly approved organization managers, not
-- every employee who happens to hold a cheerleading role elsewhere in RCL.
-- The current Royaltee coach is assigned to Royaltee using the organization
-- membership approval workflow; no global profile.role promotion is needed.
create or replace function public.can_manage_royaltee()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true)
  and (
    coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.network_organization_members m
      join public.network_organizations o on o.id = m.organization_id
      where o.slug = 'royaltee-steppas'
        and m.profile_id = (select auth.uid())
        and m.status = 'active'
        and m.member_role in ('owner','manager')
    )
  );
$$;
revoke all on function public.can_manage_royaltee() from public;
grant execute on function public.can_manage_royaltee() to anon, authenticated;
comment on function public.can_manage_royaltee()
is 'Royaltee-only approval: active owner/manager membership or RCH site administrator. A general cheerleading_coach role alone does not grant access.';

-- Anonymous policies invoke this helper too; it returns false without auth.uid().

-- Royaltee coach-only registration operations.
-- Reuses the approved Royaltee permission check; it does not change RCH global roles.
create or replace function public.manage_royaltee_event_registration(
  p_registration_id uuid,
  p_status text default null,
  p_payment_status text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registration public.rcl_royaltee_event_registrations%rowtype;
  v_event public.rcl_royaltee_events%rowtype;
  v_status text;
  v_payment text;
begin
  if auth.uid() is null or not public.can_manage_royaltee() then
    raise exception 'Not authorized for Royaltee administration' using errcode='42501';
  end if;
  if p_status is null and p_payment_status is null then
    raise exception 'Choose a registration field to update';
  end if;
  if p_status is not null and p_status not in ('registered','checked_in','cancelled') then
    raise exception 'Invalid registration status';
  end if;
  if p_payment_status is not null and p_payment_status not in ('unpaid','paid','waived') then
    raise exception 'Invalid payment status';
  end if;
  -- Match signup's lock order: event first, registration second.
  select e.* into v_event from public.rcl_royaltee_events e
  where e.id=(select event_id from public.rcl_royaltee_event_registrations where id=p_registration_id)
  for update;
  if not found then raise exception 'Adult Royaltee registration not found'; end if;
  select r.* into v_registration
  from public.rcl_royaltee_event_registrations r
  join public.rcl_royaltee_events e on e.id=r.event_id
  where r.id=p_registration_id and e.min_age>=18
  for update of r;
  if not found then
    raise exception 'Adult Royaltee registration not found';
  end if;
  v_status := coalesce(p_status,v_registration.status);
  v_payment := coalesce(p_payment_status,v_registration.payment_status);
  if v_registration.status='cancelled' and v_status in ('registered','checked_in') then
    if not exists (select 1 from public.profiles p where p.id=v_registration.profile_id
      and p.is_active=true and p.onboarding_complete=true
      and p.date_of_birth <= (current_date-interval '18 years')::date) then
      raise exception 'Adult (18+) completed profile required';
    end if;
    if v_event.status<>'published' then raise exception 'Event registration is unavailable'; end if;
    if v_event.capacity is not null and
      (select count(*) from public.rcl_royaltee_event_registrations
       where event_id=v_event.id and status in ('registered','checked_in')) >= v_event.capacity then
      raise exception 'This event is full';
    end if;
  end if;
  update public.rcl_royaltee_event_registrations
  set status=v_status,
      payment_status=v_payment,
      checked_in_at=case
        when v_status='checked_in' then coalesce(v_registration.checked_in_at,now())
        else null end,
      updated_at=now()
  where id=p_registration_id;
end
$$;
revoke all on function public.manage_royaltee_event_registration(uuid,text,text) from public;
grant execute on function public.manage_royaltee_event_registration(uuid,text,text) to authenticated;
comment on function public.manage_royaltee_event_registration(uuid,text,text)
is 'Approved Royaltee managers and cheer coaches can record adult event attendance and payment status, without global administrator permissions.';

-- All attendee mutations use checked RPCs. Table and column grants are separate.
revoke update on public.rcl_royaltee_event_registrations from public,anon,authenticated;
revoke update(status,payment_status,checked_in_at,updated_at) on public.rcl_royaltee_event_registrations from public,anon,authenticated;

commit;
