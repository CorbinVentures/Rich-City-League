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
