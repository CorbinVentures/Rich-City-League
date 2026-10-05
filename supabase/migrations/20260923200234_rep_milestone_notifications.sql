begin;

-- Persistent REP milestones. Runs only after an authoritative XP transaction exists.
create or replace function public.notify_rep_milestone()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  previous_xp integer;
  old_level integer;
  new_level integer;
  old_status text;
  new_status text;
  milestone integer;
begin
  select coalesce(sum(amount),0) - new.amount into previous_xp
  from public.xp_transactions where profile_id=new.profile_id;

  old_level := public.level_for_xp(greatest(previous_xp,0));
  new_level := public.level_for_xp(greatest(previous_xp + new.amount,0));

  old_status := case when old_level>=25 then 'Icon' when old_level>=16 then 'Elite' when old_level>=10 then 'Influential' when old_level>=6 then 'Recognized' when old_level>=3 then 'Established' else 'Rookie' end;
  new_status := case when new_level>=25 then 'Icon' when new_level>=16 then 'Elite' when new_level>=10 then 'Influential' when new_level>=6 then 'Recognized' when new_level>=3 then 'Established' else 'Rookie' end;

  if new_status<>old_status then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(new.profile_id,new.profile_id,'rep_status','New REP status', 'You reached '||new_status||' status at Level '||new_level||'.','/social/profile/'||new.profile_id);
  elsif new_level>old_level then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(new.profile_id,new.profile_id,'rep_level','Level up','You reached Level '||new_level||'. Keep building your RCL reputation.','/social/profile/'||new.profile_id);
  end if;

  foreach milestone in array array[1000,2500,5000,10000,25000,50000,100000] loop
    if previous_xp < milestone and previous_xp + new.amount >= milestone then
      insert into public.notifications(recipient_id,actor_id,type,title,body,link)
      values(new.profile_id,new.profile_id,'rep_milestone','REP milestone', 'You reached '||milestone||' REP.','/social/profile/'||new.profile_id);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists notify_rep_milestone_after_insert on public.xp_transactions;
create trigger notify_rep_milestone_after_insert after insert on public.xp_transactions
for each row execute function public.notify_rep_milestone();

revoke execute on function public.notify_rep_milestone() from public,anon,authenticated;

commit;
