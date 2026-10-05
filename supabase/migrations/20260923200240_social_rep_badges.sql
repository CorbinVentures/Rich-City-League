begin;

-- Social REP achievement badges reuse the existing badge/fan_badges system.
insert into public.badges (name,description,category,icon,tier,requirement_type,requirement_value,is_active)
values
('City Voice','Earn 1,000 REP through verified RCL participation.','social','📣','bronze','rep_total',1000,true),
('Known in the City','Earn 5,000 REP and become a recognized RCL community presence.','social','⚡','silver','rep_total',5000,true),
('City Influence','Earn 10,000 REP through sustained RCL community impact.','social','🔥','gold','rep_total',10000,true),
('RCL Icon','Earn 25,000 REP and reach Icon-level community reputation.','social','👑','elite','rep_total',25000,true)
on conflict (name) do update set description=excluded.description,category=excluded.category,icon=excluded.icon,tier=excluded.tier,requirement_type=excluded.requirement_type,requirement_value=excluded.requirement_value,is_active=true;

create or replace function public.award_rep_badges()
returns trigger language plpgsql security definer set search_path=public as $$
declare total_rep integer;
begin
  select coalesce(sum(amount),0) into total_rep from public.xp_transactions where profile_id=new.profile_id;
  insert into public.fan_badges(profile_id,badge_id)
  select new.profile_id,b.id from public.badges b
  where b.is_active=true and b.requirement_type='rep_total' and total_rep>=b.requirement_value
  on conflict (profile_id,badge_id) do nothing;
  return new;
end $$;

drop trigger if exists award_rep_badges_after_insert on public.xp_transactions;
create trigger award_rep_badges_after_insert after insert on public.xp_transactions
for each row execute function public.award_rep_badges();

revoke execute on function public.award_rep_badges() from public,anon,authenticated;

commit;
