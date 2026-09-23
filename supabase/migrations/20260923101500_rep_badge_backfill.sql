begin;

-- Existing members should receive REP achievements immediately rather than
-- waiting for their next social action to fire the award trigger.
insert into public.fan_badges(profile_id,badge_id)
select ul.profile_id,b.id
from public.user_levels ul
join public.badges b
  on b.is_active=true
 and b.requirement_type='rep_total'
 and ul.xp>=b.requirement_value
on conflict (profile_id,badge_id) do nothing;

commit;
