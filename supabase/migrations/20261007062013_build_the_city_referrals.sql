alter table public.profiles
  add column if not exists qualified_referral_count integer not null default 0
  check (qualified_referral_count >= 0);

create table if not exists public.referral_milestones (
  threshold integer primary key check (threshold > 0),
  badge_name text not null,
  bonus_rep integer not null default 0 check (bonus_rep >= 0),
  rcl_plus_days integer not null default 0 check (rcl_plus_days >= 0),
  title text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.referral_milestones(threshold,badge_name,bonus_rep,rcl_plus_days,title,description)
values
  (1,'First Assist',0,0,'First Assist','Bring your first active member into RCH.'),
  (3,'Recruiter',300,0,'Recruiter','Three active members joined through your invites.'),
  (5,'City Builder',750,0,'City Builder','Five active members joined through your invites.'),
  (10,'Founding Recruiter',1500,30,'Founding Recruiter','Ten active members joined through your invites. Includes 30 days of RCL+.'),
  (25,'Community Captain',0,90,'Community Captain','Twenty-five active members joined through your invites. Includes 90 days of RCL+.'),
  (50,'Richmond Connector',0,180,'Richmond Connector','Fifty active members joined through your invites. Includes 180 days of RCL+.'),
  (100,'City Legend',0,365,'City Legend','One hundred active members joined through your invites. Includes 365 days of RCL+.')
on conflict (threshold) do update set
  badge_name=excluded.badge_name,
  bonus_rep=excluded.bonus_rep,
  rcl_plus_days=excluded.rcl_plus_days,
  title=excluded.title,
  description=excluded.description,
  updated_at=now();

create table if not exists public.referral_milestone_awards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  milestone integer not null references public.referral_milestones(threshold) on delete restrict,
  bonus_rep integer not null default 0 check (bonus_rep >= 0),
  rcl_plus_days integer not null default 0 check (rcl_plus_days >= 0),
  rcl_plus_until timestamptz,
  source_referral_id uuid references public.referrals(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique(profile_id,milestone)
);

create index if not exists referral_milestone_awards_profile_idx
  on public.referral_milestone_awards(profile_id, milestone desc);
create index if not exists referral_milestone_awards_access_idx
  on public.referral_milestone_awards(profile_id, rcl_plus_until)
  where rcl_plus_until is not null;

create table if not exists public.referral_daily_totals (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  metric_date date not null,
  qualified_referrals integer not null default 0 check (qualified_referrals >= 0),
  updated_at timestamptz not null default now(),
  primary key(profile_id,metric_date)
);

create index if not exists referral_daily_totals_date_idx
  on public.referral_daily_totals(metric_date desc, qualified_referrals desc);

alter table public.referral_milestones enable row level security;
alter table public.referral_milestone_awards enable row level security;
alter table public.referral_daily_totals enable row level security;

revoke all on public.referral_milestones from anon, authenticated;
grant select on public.referral_milestones to authenticated, service_role;
revoke all on public.referral_milestone_awards from anon, authenticated;
grant select on public.referral_milestone_awards to authenticated, service_role;
revoke all on public.referral_daily_totals from anon, authenticated;
grant select on public.referral_daily_totals to authenticated, service_role;

drop policy if exists referral_milestones_member_read on public.referral_milestones;
create policy referral_milestones_member_read
on public.referral_milestones for select to authenticated
using (true);

drop policy if exists referral_milestone_awards_self_read on public.referral_milestone_awards;
create policy referral_milestone_awards_self_read
on public.referral_milestone_awards for select to authenticated
using ((select auth.uid()) = profile_id or (select public.is_staff_or_admin()));

drop policy if exists referral_daily_totals_member_read on public.referral_daily_totals;
create policy referral_daily_totals_member_read
on public.referral_daily_totals for select to authenticated
using (true);

update public.badges
set is_active=false
where requirement_type='referrals'
  and name not in ('First Assist','Recruiter','City Builder','Founding Recruiter','Community Captain','Richmond Connector','City Legend');

insert into public.badges(name,description,category,icon,tier,requirement_type,requirement_value,is_active)
values
  ('First Assist','Bring your first active member into the RCH community.','community','🤝','bronze','referrals',1,true),
  ('Recruiter','Bring 3 active members into the RCH community.','community','📣','bronze','referrals',3,true),
  ('City Builder','Bring 5 active members into the RCH community.','community','🏗️','silver','referrals',5,true),
  ('Founding Recruiter','Bring 10 active members into the RCH community.','community','🏙️','gold','referrals',10,true),
  ('Community Captain','Bring 25 active members into the RCH community.','community','🫡','elite','referrals',25,true),
  ('Richmond Connector','Bring 50 active members into the RCH community.','community','🔗','elite','referrals',50,true),
  ('City Legend','Bring 100 active members into the RCH community.','community','👑','elite','referrals',100,true)
on conflict(name) do update set
  description=excluded.description,
  category=excluded.category,
  icon=excluded.icon,
  tier=excluded.tier,
  requirement_type=excluded.requirement_type,
  requirement_value=excluded.requirement_value,
  is_active=true;

create or replace function public.award_referral_milestones(target_profile uuid, source_referral uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
  milestone_row record;
  award_id uuid;
  access_until timestamptz;
  existing_until timestamptz;
begin
  if target_profile is null then return; end if;

  select count(*)::integer into total
  from public.referrals
  where referrer_id=target_profile and status='qualified';

  for milestone_row in
    select threshold,badge_name,bonus_rep,rcl_plus_days,title,description
    from public.referral_milestones
    where threshold <= total
    order by threshold
  loop
    award_id:=null;
    access_until:=null;

    if milestone_row.rcl_plus_days > 0 then
      select max(a.rcl_plus_until) into existing_until
      from public.referral_milestone_awards a
      where a.profile_id=target_profile and a.rcl_plus_until>now();

      access_until:=greatest(now(),coalesce(existing_until,now()))
        + make_interval(days => milestone_row.rcl_plus_days);
    end if;

    insert into public.referral_milestone_awards(
      profile_id,milestone,bonus_rep,rcl_plus_days,rcl_plus_until,source_referral_id
    )
    values(
      target_profile,milestone_row.threshold,milestone_row.bonus_rep,
      milestone_row.rcl_plus_days,access_until,source_referral
    )
    on conflict(profile_id,milestone) do nothing
    returning id into award_id;

    if award_id is not null then
      if milestone_row.bonus_rep > 0 then
        insert into public.user_levels(profile_id)
        values(target_profile)
        on conflict do nothing;

        insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id,rep_dimension)
        values(
          target_profile,
          milestone_row.bonus_rep,
          'referral_milestone_'||milestone_row.threshold::text,
          'referral_milestone',
          award_id,
          'community'
        )
        on conflict do nothing;

        if found then
          update public.user_levels
          set xp=xp+milestone_row.bonus_rep,
              level=public.level_for_xp(xp+milestone_row.bonus_rep),
              updated_at=now()
          where profile_id=target_profile;
        end if;
      end if;

      insert into public.notifications(recipient_id,type,title,body,link)
      values(
        target_profile,
        'referral_milestone',
        milestone_row.title||' unlocked',
        milestone_row.description ||
          case when milestone_row.bonus_rep > 0 then ' +'||milestone_row.bonus_rep||' bonus REP.' else '' end,
        '/referrals'
      );
    end if;
  end loop;
end;
$$;

revoke execute on function public.award_referral_milestones(uuid,uuid) from public,anon,authenticated;

create or replace function public.sync_qualified_referral_growth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  became_qualified boolean:=false;
  stopped_qualified boolean:=false;
  day_key date;
  invitee_name text;
begin
  if tg_op='INSERT' then
    became_qualified:=new.status='qualified';
  elsif tg_op='UPDATE' then
    became_qualified:=new.status='qualified' and old.status is distinct from 'qualified';
    stopped_qualified:=old.status='qualified' and new.status is distinct from 'qualified';
  elsif tg_op='DELETE' then
    stopped_qualified:=old.status='qualified';
  end if;

  if became_qualified then
    day_key:=coalesce(new.qualified_at,new.created_at,now())::date;

    update public.profiles
    set qualified_referral_count=qualified_referral_count+1
    where id=new.referrer_id;

    insert into public.referral_daily_totals(profile_id,metric_date,qualified_referrals)
    values(new.referrer_id,day_key,1)
    on conflict(profile_id,metric_date) do update
      set qualified_referrals=public.referral_daily_totals.qualified_referrals+1,
          updated_at=now();

    select coalesce(display_name,username,'A new member') into invitee_name
    from public.profiles
    where id=new.referred_profile_id;

    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(
      new.referrer_id,
      new.referred_profile_id,
      'referral_qualified',
      'Your invite became active',
      invitee_name||' joined the RCH community through your invite. +200 REP.',
      '/referrals'
    );

    perform public.award_referral_milestones(new.referrer_id,new.id);
    return new;
  end if;

  if stopped_qualified then
    day_key:=coalesce(old.qualified_at,old.created_at,now())::date;

    update public.profiles
    set qualified_referral_count=greatest(qualified_referral_count-1,0)
    where id=old.referrer_id;

    update public.referral_daily_totals
    set qualified_referrals=greatest(qualified_referrals-1,0),
        updated_at=now()
    where profile_id=old.referrer_id and metric_date=day_key;

    delete from public.referral_daily_totals
    where profile_id=old.referrer_id and metric_date=day_key and qualified_referrals=0;

    return case when tg_op='DELETE' then old else new end;
  end if;

  return case when tg_op='DELETE' then old else new end;
end;
$$;

revoke execute on function public.sync_qualified_referral_growth() from public,anon,authenticated;

drop trigger if exists sync_qualified_referral_growth_after_change on public.referrals;
create trigger sync_qualified_referral_growth_after_change
after insert or update of status or delete on public.referrals
for each row execute function public.sync_qualified_referral_growth();

drop function if exists public.referral_stats(uuid);

create function public.referral_stats(target_profile uuid default auth.uid())
returns table(
  code text,
  qualified_referrals bigint,
  rep_earned bigint,
  weekly_referrals bigint,
  next_milestone integer,
  next_milestone_name text,
  next_milestone_remaining integer,
  rcl_plus_until timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid:=(select auth.uid());
begin
  if me is null then raise exception 'Authentication required'; end if;
  if target_profile is null then target_profile:=me; end if;
  if target_profile<>me and not public.is_staff_or_admin() then raise exception 'Not authorized'; end if;

  return query
  with totals as (
    select
      count(*) filter(where r.status='qualified')::bigint as qualified,
      count(*) filter(where r.status='qualified' and coalesce(r.qualified_at,r.created_at)>=date_trunc('week',now()))::bigint as weekly
    from public.referrals r
    where r.referrer_id=target_profile
  ),
  rewards as (
    select coalesce(sum(x.amount),0)::bigint as rep_total
    from public.xp_transactions x
    where x.profile_id=target_profile
      and x.source_type in ('referral','referral_milestone')
  ),
  next_step as (
    select m.threshold,m.badge_name
    from public.referral_milestones m, totals t
    where m.threshold > t.qualified
    order by m.threshold
    limit 1
  ),
  access as (
    select max(a.rcl_plus_until) as access_until
    from public.referral_milestone_awards a
    where a.profile_id=target_profile and a.rcl_plus_until>now()
  )
  select
    rc.code,
    t.qualified,
    rw.rep_total,
    t.weekly,
    ns.threshold,
    ns.badge_name,
    case when ns.threshold is null then 0 else greatest(ns.threshold-t.qualified::integer,0) end,
    ac.access_until
  from public.referral_codes rc
  cross join totals t
  cross join rewards rw
  left join next_step ns on true
  left join access ac on true
  where rc.profile_id=target_profile;
end;
$$;

revoke execute on function public.referral_stats(uuid) from public,anon,authenticated;
grant execute on function public.referral_stats(uuid) to authenticated;

create or replace function public.current_membership_plan()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.member_subscriptions s
      where s.user_id=(select auth.uid())
        and s.plan_code='all_access'
        and s.status in ('active','trialing')
        and (s.current_period_end is null or s.current_period_end>now())
    ) then 'all_access'
    when exists (
      select 1 from public.member_subscriptions s
      where s.user_id=(select auth.uid())
        and s.plan_code='rcl_plus'
        and s.status in ('active','trialing')
        and (s.current_period_end is null or s.current_period_end>now())
    ) or exists (
      select 1 from public.referral_milestone_awards a
      where a.profile_id=(select auth.uid())
        and a.rcl_plus_until>now()
    ) then 'rcl_plus'
    else 'free'
  end;
$$;

revoke execute on function public.current_membership_plan() from public,anon,authenticated;
grant execute on function public.current_membership_plan() to authenticated;

update public.profiles p
set qualified_referral_count=coalesce((
  select count(*)::integer
  from public.referrals r
  where r.referrer_id=p.id and r.status='qualified'
),0);

insert into public.referral_daily_totals(profile_id,metric_date,qualified_referrals)
select
  r.referrer_id,
  coalesce(r.qualified_at,r.created_at)::date,
  count(*)::integer
from public.referrals r
where r.status='qualified'
group by r.referrer_id,coalesce(r.qualified_at,r.created_at)::date
on conflict(profile_id,metric_date) do update
  set qualified_referrals=excluded.qualified_referrals,
      updated_at=now();

do $$
declare referrer uuid;
begin
  for referrer in
    select distinct referrer_id from public.referrals where status='qualified'
  loop
    perform public.award_referral_milestones(referrer,null);
  end loop;
end;
$$;
