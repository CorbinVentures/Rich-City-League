begin;

-- Award REP achievement badges to members who crossed thresholds before
-- the badge trigger existed. user_levels is the authoritative REP total.
insert into public.fan_badges(profile_id,badge_id)
select ul.profile_id,b.id
from public.user_levels ul
join public.badges b
  on b.is_active=true
 and b.requirement_type='rep_total'
 and ul.xp>=b.requirement_value
on conflict (profile_id,badge_id) do nothing;

commit;
