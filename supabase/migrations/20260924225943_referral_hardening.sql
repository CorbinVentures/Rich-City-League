begin;

-- Referral hardening: claiming records attribution only. REP and badges are
-- awarded after the referred member demonstrates real platform participation.

create or replace function public.claim_referral(invite_code text)
returns boolean language plpgsql security definer set search_path=public as $$
declare inviter uuid; me uuid:=auth.uid(); referral_id uuid; created_at_time timestamptz;
begin
  if me is null then raise exception 'Authentication required'; end if;
  if nullif(trim(invite_code),'') is null then return false; end if;

  select profile_id into inviter
  from public.referral_codes
  where code=lower(trim(invite_code));

  if inviter is null or inviter=me then return false; end if;

  -- Existing accounts cannot attach themselves to a fresh referral after the fact.
  select created_at into created_at_time from public.profiles where id=me;
  if created_at_time is null or created_at_time < now() - interval '7 days' then return false; end if;

  insert into public.referrals(referrer_id,referred_profile_id,referral_code,status)
  values(inviter,me,lower(trim(invite_code)),'joined')
  on conflict (referred_profile_id) do nothing
  returning id into referral_id;

  return referral_id is not null;
end $$;
revoke execute on function public.claim_referral(text) from public,anon;
grant execute on function public.claim_referral(text) to authenticated;

create or replace function public.qualify_referral_from_activity()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; referral_row public.referrals%rowtype;
begin
  if tg_table_name='posts' then
    actor:=new.author_id;
    if coalesce(new.status,'')<>'published' or coalesce(new.is_automated,false) then return new; end if;
  elsif tg_table_name='comments' then
    actor:=new.author_id;
  elsif tg_table_name='run_players' then
    actor:=new.profile_id;
  else
    return new;
  end if;

  if actor is null then return new; end if;

  select * into referral_row
  from public.referrals
  where referred_profile_id=actor and status='joined'
  for update;

  if not found then return new; end if;

  update public.referrals
  set status='qualified', qualified_at=now()
  where id=referral_row.id and status='joined';

  insert into public.user_levels(profile_id)
  values(referral_row.referrer_id)
  on conflict do nothing;

  insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id)
  values(referral_row.referrer_id,200,'invite_teammate','referral',referral_row.id)
  on conflict do nothing;

  if found then
    update public.user_levels
    set xp=xp+200,
        level=public.level_for_xp(xp+200),
        updated_at=now()
    where profile_id=referral_row.referrer_id;
  end if;

  return new;
end $$;
revoke execute on function public.qualify_referral_from_activity() from public,anon,authenticated;

drop trigger if exists qualify_referral_after_post on public.posts;
create trigger qualify_referral_after_post
after insert on public.posts
for each row execute function public.qualify_referral_from_activity();

drop trigger if exists qualify_referral_after_comment on public.comments;
create trigger qualify_referral_after_comment
after insert on public.comments
for each row execute function public.qualify_referral_from_activity();

drop trigger if exists qualify_referral_after_run_join on public.run_players;
create trigger qualify_referral_after_run_join
after insert on public.run_players
for each row execute function public.qualify_referral_from_activity();

-- Referral badges must also react when a pending referral becomes qualified.
drop trigger if exists award_referral_badges_after_insert on public.referrals;
drop trigger if exists award_referral_badges_after_change on public.referrals;
create trigger award_referral_badges_after_change
after insert or update of status on public.referrals
for each row
when (new.status='qualified')
execute function public.award_referral_badges();

commit;
