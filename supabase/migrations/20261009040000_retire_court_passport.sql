begin;

-- Basketball Radar was retired: keep location records and any historical data,
-- but stop advertising inaccessible Court Passport milestones.
update public.badges
set is_active = false, updated_at = now()
where requirement_type = 'unique_courts'
  and name in ('Court Explorer','Court Hopper','Virginia Circuit')
  and not exists (
    select 1 from public.fan_badges fb where fb.badge_id = public.badges.id
  );

revoke execute on function public.check_in_to_court(text,double precision,double precision,double precision)
  from authenticated;

commit;