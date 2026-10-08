create schema if not exists private;

create table if not exists private.mandatory_follows (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on private.mandatory_follows from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_mandatory_follow(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.mandatory_follows mf
    where mf.profile_id = target_profile_id
  );
$$;

revoke all on function private.is_mandatory_follow(uuid) from public;
grant execute on function private.is_mandatory_follow(uuid) to authenticated;

create or replace function public.is_mandatory_follow_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_mandatory_follow(target_profile_id);
$$;

revoke all on function public.is_mandatory_follow_profile(uuid) from public;
grant execute on function public.is_mandatory_follow_profile(uuid) to anon, authenticated;

create or replace function private.backfill_mandatory_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.follows (follower_id, following_id)
  select p.id, new.profile_id
  from public.profiles p
  where p.is_active = true
    and p.id <> new.profile_id
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.backfill_mandatory_follow() from public;

drop trigger if exists backfill_mandatory_follow_after_insert on private.mandatory_follows;
create trigger backfill_mandatory_follow_after_insert
after insert on private.mandatory_follows
for each row execute function private.backfill_mandatory_follow();

create or replace function private.ensure_profile_mandatory_follows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_active = true then
      insert into public.follows (follower_id, following_id)
      select new.id, mf.profile_id
      from private.mandatory_follows mf
      where mf.profile_id <> new.id
      on conflict do nothing;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.is_active = true and old.is_active is distinct from true then
      insert into public.follows (follower_id, following_id)
      select new.id, mf.profile_id
      from private.mandatory_follows mf
      where mf.profile_id <> new.id
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.ensure_profile_mandatory_follows() from public;

drop trigger if exists ensure_profile_mandatory_follows_after_change on public.profiles;
create trigger ensure_profile_mandatory_follows_after_change
after insert or update of is_active on public.profiles
for each row execute function private.ensure_profile_mandatory_follows();

drop policy if exists "mandatory follows cannot be deleted" on public.follows;
create policy "mandatory follows cannot be deleted"
on public.follows
as restrictive
for delete
to authenticated
using (not (select private.is_mandatory_follow(following_id)));

drop policy if exists "mandatory follows cannot be retargeted" on public.follows;
create policy "mandatory follows cannot be retargeted"
on public.follows
as restrictive
for update
to authenticated
using (not (select private.is_mandatory_follow(following_id)))
with check (true);

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if private.is_mandatory_follow(new.following_id) then
    return new;
  end if;
  if new.follower_id<>new.following_id then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    select new.following_id,new.follower_id,'follow','New follower',coalesce(p.display_name,p.username,'An RCL member')||' followed you.','/social/profile/'||new.follower_id
    from public.profiles p where p.id=new.follower_id;
  end if;
  return new;
end $$;

create or replace function public.award_social_rep()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid; reward integer; reason_name text; source_name text; source_uuid uuid; target_uuid uuid; owner uuid; claim_rows integer:=0; daily_claims integer:=0; actor_is_system boolean:=false;
begin
  if tg_table_name='posts' then
    actor:=new.author_id; reward:=20; reason_name:='quality_content'; source_name:='post'; source_uuid:=new.id; target_uuid:=new.id;
    if coalesce(new.status::text,'')<>'published' or coalesce(new.is_automated,false) then return new; end if;
  elsif tg_table_name='comments' then
    actor:=new.author_id; reward:=5; reason_name:='meaningful_engagement'; source_name:='comment'; source_uuid:=new.id; target_uuid:=new.post_id;
    select author_id into owner from public.posts where id=new.post_id;
    if owner=actor then return new; end if;
  elsif tg_table_name='reactions' then
    actor:=new.user_id; reward:=2; reason_name:='meaningful_engagement'; source_name:='reaction'; source_uuid:=new.id; target_uuid:=new.post_id;
    select author_id into owner from public.posts where id=new.post_id;
    if owner=actor then return new; end if;
  elsif tg_table_name='follows' then
    if private.is_mandatory_follow(new.following_id) then return new; end if;
    actor:=new.follower_id; reward:=3; reason_name:='community_contribution'; source_name:='follow'; source_uuid:=new.following_id; target_uuid:=new.following_id;
    if actor=new.following_id then return new; end if;
  else return new; end if;

  if actor is null or target_uuid is null then return new; end if;
  select coalesce(is_system_account,false) into actor_is_system from public.profiles where id=actor;
  if actor_is_system then return new; end if;

  insert into public.social_rep_claims(profile_id,action_type,target_id)
  values(actor,tg_table_name::text,target_uuid)
  on conflict do nothing;
  get diagnostics claim_rows = row_count;
  if claim_rows=0 then return new; end if;

  if tg_table_name='posts' then
    insert into public.social_rep_daily_limits(profile_id,action_type,claim_date,claims)
    values(actor,'posts',(now() at time zone 'utc')::date,0)
    on conflict do nothing;
    select claims into daily_claims from public.social_rep_daily_limits
      where profile_id=actor and action_type='posts' and claim_date=(now() at time zone 'utc')::date
      for update;
    if daily_claims>=5 then return new; end if;
    update public.social_rep_daily_limits set claims=claims+1
      where profile_id=actor and action_type='posts' and claim_date=(now() at time zone 'utc')::date;
  end if;

  insert into public.user_levels(profile_id) values(actor) on conflict do nothing;
  insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id)
  values(actor,reward,reason_name,source_name,source_uuid) on conflict do nothing;
  if found then
    update public.user_levels set xp=xp+reward,level=public.level_for_xp(xp+reward),updated_at=now() where profile_id=actor;
  end if;
  return new;
end $$;

create or replace function public.qualify_referral_from_activity()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; referral_row public.referrals%rowtype;
begin
  if tg_table_name='posts' then
    actor:=new.author_id;
    if coalesce(new.status::text,'')<>'published' or coalesce(new.is_automated,false) then return new; end if;
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

-- Administrative founder grants should not emit organic unlock/milestone content.
alter table public.fan_badges disable trigger announce_badge_unlock_after_insert;
alter table public.xp_transactions disable trigger announce_rep_social_milestone_after_insert;
alter table public.xp_transactions disable trigger award_rep_badges_after_insert;
alter table public.xp_transactions disable trigger notify_rep_milestone_after_insert;

do $$
declare
  founder_id uuid;
  founder_count integer;
  target_per_dimension integer := 11520;
  current_amount integer;
  total_amount integer;
begin
  select count(*) into founder_count
  from public.profiles
  where display_name = 'Vaughn'
    and bio = 'Founder of Rich City Basketball League'
    and role::text = 'admin';

  if founder_count = 0 then
    raise notice 'Founder profile is not present in this environment; skipping founder data grant.';
    return;
  elsif founder_count > 1 then
    raise exception 'Expected at most one founder profile, found %', founder_count;
  end if;

  select id into founder_id
  from public.profiles
  where display_name = 'Vaughn'
    and bio = 'Founder of Rich City Basketball League'
    and role::text = 'admin'
  limit 1;

  insert into private.mandatory_follows(profile_id)
  values (founder_id)
  on conflict do nothing;

  insert into public.fan_badges(profile_id, badge_id, earned_at)
  select founder_id, b.id, now()
  from public.badges b
  where b.is_active = true
  on conflict (profile_id, badge_id) do nothing;

  select coalesce(sum(amount) filter (where rep_dimension='hooper'),0)::integer into current_amount
  from public.xp_transactions where profile_id=founder_id;
  if current_amount < target_per_dimension and not exists (
    select 1 from public.xp_transactions where profile_id=founder_id and reason='founder_icon_hooper' and source_type='system'
  ) then
    insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id,rep_dimension)
    values(founder_id,target_per_dimension-current_amount,'founder_icon_hooper','system',null,'hooper');
  end if;

  select coalesce(sum(amount) filter (where rep_dimension='community'),0)::integer into current_amount
  from public.xp_transactions where profile_id=founder_id;
  if current_amount < target_per_dimension and not exists (
    select 1 from public.xp_transactions where profile_id=founder_id and reason='founder_icon_community' and source_type='system'
  ) then
    insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id,rep_dimension)
    values(founder_id,target_per_dimension-current_amount,'founder_icon_community','system',null,'community');
  end if;

  select coalesce(sum(amount) filter (where rep_dimension='creator'),0)::integer into current_amount
  from public.xp_transactions where profile_id=founder_id;
  if current_amount < target_per_dimension and not exists (
    select 1 from public.xp_transactions where profile_id=founder_id and reason='founder_icon_creator' and source_type='system'
  ) then
    insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id,rep_dimension)
    values(founder_id,target_per_dimension-current_amount,'founder_icon_creator','system',null,'creator');
  end if;

  select coalesce(sum(amount) filter (where rep_dimension='coach'),0)::integer into current_amount
  from public.xp_transactions where profile_id=founder_id;
  if current_amount < target_per_dimension and not exists (
    select 1 from public.xp_transactions where profile_id=founder_id and reason='founder_icon_coach' and source_type='system'
  ) then
    insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id,rep_dimension)
    values(founder_id,target_per_dimension-current_amount,'founder_icon_coach','system',null,'coach');
  end if;

  select coalesce(sum(amount) filter (where rep_dimension='reliability'),0)::integer into current_amount
  from public.xp_transactions where profile_id=founder_id;
  if current_amount < target_per_dimension and not exists (
    select 1 from public.xp_transactions where profile_id=founder_id and reason='founder_icon_reliability' and source_type='system'
  ) then
    insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id,rep_dimension)
    values(founder_id,target_per_dimension-current_amount,'founder_icon_reliability','system',null,'reliability');
  end if;

  select coalesce(sum(amount),0)::integer into total_amount
  from public.xp_transactions
  where profile_id=founder_id;

  insert into public.user_levels(profile_id,xp,level,current_streak,updated_at)
  values(founder_id,total_amount,public.level_for_xp(total_amount),0,now())
  on conflict(profile_id) do update
  set xp=excluded.xp,
      level=excluded.level,
      updated_at=now();
end $$;

alter table public.xp_transactions enable trigger notify_rep_milestone_after_insert;
alter table public.xp_transactions enable trigger award_rep_badges_after_insert;
alter table public.xp_transactions enable trigger announce_rep_social_milestone_after_insert;
alter table public.fan_badges enable trigger announce_badge_unlock_after_insert;
