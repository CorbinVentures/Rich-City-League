begin;

-- Growth loop: personal referral codes, attribution, server-owned invite REP,
-- referral badges, and shareable achievement tokens.

create table if not exists public.referral_codes (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{2,31}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_profile_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'joined' check (status in ('joined','qualified','rejected')),
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_id<>referred_profile_id)
);

create index if not exists referrals_referrer_idx on public.referrals(referrer_id,created_at desc);
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

create policy "public referral codes" on public.referral_codes for select using (true);
create policy "users view referral relationships" on public.referrals for select
  using (referrer_id=auth.uid() or referred_profile_id=auth.uid() or public.is_staff_or_admin());

-- Generate a stable personal code from username, falling back to profile id.
create or replace function public.ensure_referral_code(target_profile uuid default auth.uid())
returns text language plpgsql security definer set search_path=public as $$
declare base text; candidate text; n integer:=0;
begin
  if target_profile is null then raise exception 'Authentication required'; end if;
  if target_profile<>auth.uid() and not public.is_staff_or_admin() then raise exception 'Not authorized'; end if;
  select code into candidate from public.referral_codes where profile_id=target_profile;
  if candidate is not null then return candidate; end if;
  select lower(regexp_replace(coalesce(nullif(username,''),'rcl-'||left(target_profile::text,8)),'[^a-zA-Z0-9-]+','-','g'))
    into base from public.profiles where id=target_profile;
  base:=trim(both '-' from left(coalesce(nullif(base,''),'rcl'),24));
  candidate:=base;
  while exists(select 1 from public.referral_codes where code=candidate) loop
    n:=n+1; candidate:=left(base,26)||'-'||n::text;
  end loop;
  insert into public.referral_codes(profile_id,code) values(target_profile,candidate);
  return candidate;
end $$;
grant execute on function public.ensure_referral_code(uuid) to authenticated;

create or replace function public.claim_referral(invite_code text)
returns boolean language plpgsql security definer set search_path=public as $$
declare inviter uuid; me uuid:=auth.uid(); referral_id uuid;
begin
  if me is null then raise exception 'Authentication required'; end if;
  select profile_id into inviter from public.referral_codes where code=lower(trim(invite_code));
  if inviter is null or inviter=me then return false; end if;
  insert into public.referrals(referrer_id,referred_profile_id,referral_code,status,qualified_at)
  values(inviter,me,lower(trim(invite_code)),'qualified',now())
  on conflict (referred_profile_id) do nothing returning id into referral_id;
  if referral_id is null then return false; end if;

  -- Server-owned one-time reward: 200 REP for a real account that completes signup.
  insert into public.user_levels(profile_id) values(inviter) on conflict do nothing;
  insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id)
  values(inviter,200,'invite_teammate','referral',referral_id)
  on conflict do nothing;
  if found then
    update public.user_levels set xp=xp+200,level=public.level_for_xp(xp+200),updated_at=now() where profile_id=inviter;
  end if;
  return true;
end $$;
grant execute on function public.claim_referral(text) to authenticated;

-- Referral milestones use the existing badge system.
insert into public.badges(name,description,category,icon,tier,requirement_type,requirement_value,is_active)
values
('First Assist','Bring your first new member into the RCL community.','community','🤝','bronze','referrals',1,true),
('City Connector','Bring 5 new members into the RCL community.','community','🔗','silver','referrals',5,true),
('804 Recruiter','Bring 10 new members into the RCL community.','community','🏙️','gold','referrals',10,true),
('Community Builder','Bring 25 new members into the RCL community.','community','👑','elite','referrals',25,true)
on conflict(name) do update set description=excluded.description,category=excluded.category,icon=excluded.icon,tier=excluded.tier,requirement_type=excluded.requirement_type,requirement_value=excluded.requirement_value,is_active=true;

create or replace function public.award_referral_badges()
returns trigger language plpgsql security definer set search_path=public as $$
declare total integer;
begin
  if new.status<>'qualified' then return new; end if;
  select count(*)::integer into total from public.referrals where referrer_id=new.referrer_id and status='qualified';
  insert into public.fan_badges(profile_id,badge_id)
  select new.referrer_id,b.id from public.badges b
  where b.is_active=true and b.requirement_type='referrals' and total>=b.requirement_value
  on conflict(profile_id,badge_id) do nothing;
  return new;
end $$;
drop trigger if exists award_referral_badges_after_insert on public.referrals;
create trigger award_referral_badges_after_insert after insert on public.referrals
for each row execute function public.award_referral_badges();
revoke execute on function public.award_referral_badges() from public,anon,authenticated;

create or replace function public.referral_stats(target_profile uuid default auth.uid())
returns table(code text,qualified_referrals bigint,rep_earned bigint)
language sql stable security definer set search_path=public as $$
  select rc.code,
         count(r.id) filter(where r.status='qualified'),
         count(r.id) filter(where r.status='qualified')*200
  from public.referral_codes rc
  left join public.referrals r on r.referrer_id=rc.profile_id
  where rc.profile_id=target_profile
    and (target_profile=auth.uid() or public.is_staff_or_admin())
  group by rc.code;
$$;
grant execute on function public.referral_stats(uuid) to authenticated;

commit;
