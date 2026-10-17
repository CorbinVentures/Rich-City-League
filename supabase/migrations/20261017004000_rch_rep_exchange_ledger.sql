begin;

-- RCH REP Exchange. Legacy social XP and verified Runs REP are permanent
-- career achievements. Only this new wallet is spendable; no pay-to-win ratings.
create table public.rch_rep_wallets (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 balance bigint not null default 0 check(balance>=0),
 lifetime_earned bigint not null default 0 check(lifetime_earned>=0),
 updated_at timestamptz not null default now()
);
create table public.rch_rep_rewards (
 code text primary key check(code ~ '^[a-z_]{3,45}$'),
 title text not null,
 description text not null,
 category text not null check(category in ('identity','promotion','media','insight','crew')),
 price integer not null check(price between 1 and 100000),
 requires_post boolean not null default false,
 delivery text not null check(delivery in ('instant','staff_review')),
 duration_hours integer check(duration_hours between 1 and 720),
 available boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.rch_rep_orders (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id) on delete restrict,
 reward_code text not null references public.rch_rep_rewards(code),
 price_paid integer not null check(price_paid>0),
 post_id uuid references public.posts(id) on delete restrict,
 region text not null default 'virginia' check(region in ('virginia','richmond','central-virginia','hampton-roads','northern-virginia','southwest-virginia','shenandoah','tri-cities')),
 status text not null check(status in ('pending_review','active','fulfilled','declined','cancelled','expired')),
 purchased_at timestamptz not null default now(),
 activated_at timestamptz,
 expires_at timestamptz,
 reviewed_by uuid references public.profiles(id),
 review_note text,
 reviewed_at timestamptz
);
create index rch_rep_orders_owner_idx on public.rch_rep_orders(profile_id,purchased_at desc);
create index rch_rep_orders_placements_idx on public.rch_rep_orders(status,reward_code,expires_at);
create table public.rch_rep_transactions (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 amount bigint not null check(amount<>0 and amount between -1000000 and 1000000),
 kind text not null check(kind in ('earn','purchase','refund')),
 source_key text not null unique check(char_length(source_key) between 5 and 180),
 order_id uuid references public.rch_rep_orders(id) on delete restrict,
 detail text not null check(char_length(detail) between 2 and 180),
 created_at timestamptz not null default now(),
 check((kind='purchase' and amount<0 and order_id is not null)
    or (kind in ('earn','refund') and amount>0))
);
create index rch_rep_transactions_owner_idx on public.rch_rep_transactions(profile_id,created_at desc);

alter table public.rch_rep_wallets enable row level security;
alter table public.rch_rep_rewards enable row level security;
alter table public.rch_rep_orders enable row level security;
alter table public.rch_rep_transactions enable row level security;
revoke all on public.rch_rep_wallets,public.rch_rep_rewards,public.rch_rep_orders,public.rch_rep_transactions from public,anon,authenticated;
grant select on public.rch_rep_wallets,public.rch_rep_rewards,
 public.rch_rep_orders,public.rch_rep_transactions to authenticated;
grant select on public.rch_rep_rewards to anon;
create policy rch_rep_wallet_private on public.rch_rep_wallets for select to authenticated using(profile_id=(select auth.uid()));
create policy rch_rep_tx_private on public.rch_rep_transactions for select to authenticated using(profile_id=(select auth.uid()));
create policy rch_rep_orders_private on public.rch_rep_orders for select to authenticated
 using(profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));
create policy rch_rep_rewards_catalog on public.rch_rep_rewards for select to anon,authenticated using(available=true);

-- Do not allow a browser to manufacture lifetime XP now that XP can become
-- spendable REP. Existing legitimate SECURITY DEFINER awarders keep working.
revoke insert,update,delete,truncate on public.xp_transactions from public,anon,authenticated;

insert into public.rch_rep_rewards(code,title,description,category,price,requires_post,delivery,duration_hours)
values
 ('profile_frame','Legendary Profile Frame','30-day collectible animated REP Exchange profile frame.','identity',75,false,'instant',720),
 ('court_shoutout','Court Shoutout','Request an approved feature of your published post on a local court discovery placement.','promotion',125,true,'staff_review',24),
 ('story_spotlight','Story Spotlight','Request an approved story-area promotion of your published post.','promotion',175,true,'staff_review',24),
 ('local_post_boost','Local Post Boost','24-hour labeled promotion of your published post to relevant RCH users. No guaranteed impressions.','promotion',250,true,'staff_review',24),
 ('cinematic_card','Cinematic Player Card','Request a bespoke shareable basketball identity card made from your provided materials.','media',300,false,'staff_review',null),
 ('highlight_studio','Highlight Studio','Request a cinematic edit using your own submitted and permitted highlight footage.','media',400,false,'staff_review',null),
 ('court_billboard','Digital Court Billboard','Request a local court-area digital placement for a published post.','promotion',500,true,'staff_review',48),
 ('advanced_report','Advanced Player Report','Request a structured graphic of available verified player stats.','insight',550,false,'staff_review',null),
 ('hometown_spotlight','Hometown Spotlight','Request a clearly labeled hometown feature placement (not an earned weekly award).','promotion',1000,true,'staff_review',72),
 ('crew_recruitment','Crew Recruitment Showcase','Request a promoted published recruitment post for your crew.','crew',750,true,'staff_review',48);

-- Privileged internal credit helper: no direct access for browser roles.
create or replace function public.rch_rep_credit_internal(
 p_profile uuid,p_amount integer,p_source text,p_detail text,p_kind text default 'earn',p_order uuid default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_profile is null or p_amount<=0 or p_amount>1000000 or p_kind not in ('earn','refund')
 then raise exception 'Invalid REP credit'; end if;
 insert into public.rch_rep_wallets(profile_id) values(p_profile) on conflict do nothing;
 insert into public.rch_rep_transactions(profile_id,amount,kind,source_key,order_id,detail)
 values(p_profile,p_amount,p_kind,p_source,p_order,left(p_detail,180))
 on conflict(source_key) do nothing returning id into v_id;
 if v_id is null then return false; end if;
 update public.rch_rep_wallets set balance=balance+p_amount,
  lifetime_earned=lifetime_earned+case when p_kind='earn' then p_amount else 0 end,
  updated_at=now() where profile_id=p_profile;
 return true;
end $$;
revoke all on function public.rch_rep_credit_internal(uuid,integer,text,text,text,uuid) from public,anon,authenticated;

create or replace function public.rch_rep_verified_earnings()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='xp_transactions' then
   perform public.rch_rep_credit_internal(new.profile_id,new.amount,
     'xp:'||new.id::text,coalesce(new.reason,'Verified social action'));
 elsif tg_table_name='rch_run_rep_events' then
   perform public.rch_rep_credit_internal(new.profile_id,new.rep,
     'run:'||new.match_id::text||':'||new.profile_id::text||':'||new.reason,
     'Verified Run: '||new.reason);
 elsif tg_table_name='rch_run_stat_rewards' and new.rep_bonus>0 then
   perform public.rch_rep_credit_internal(new.profile_id,new.rep_bonus,
     'run_stats:'||new.submission_id::text,'Reviewed Run statistics');
 end if;
 return new;
end $$;
revoke all on function public.rch_rep_verified_earnings() from public,anon,authenticated;
create trigger rch_rep_from_social_xp after insert on public.xp_transactions
 for each row execute function public.rch_rep_verified_earnings();
create trigger rch_rep_from_verified_game after insert on public.rch_run_rep_events
 for each row execute function public.rch_rep_verified_earnings();
create trigger rch_rep_from_reviewed_stats after insert on public.rch_run_stat_rewards
 for each row execute function public.rch_rep_verified_earnings();

-- One-time evidence-preserving backfill. Only real existing XP, ranked Run REP
-- and independently reviewed stats are minted; no manufactured achievements.
insert into public.rch_rep_wallets(profile_id)
select distinct p from (
 select profile_id as p from public.xp_transactions
 union select profile_id from public.rch_run_rep_events
 union select profile_id from public.rch_run_stat_rewards
) x on conflict do nothing;
insert into public.rch_rep_transactions(profile_id,amount,kind,source_key,detail)
select profile_id,amount,'earn','xp:'||id::text,left(coalesce(reason,'Verified social action'),180)
from public.xp_transactions where amount>0 on conflict(source_key) do nothing;
insert into public.rch_rep_transactions(profile_id,amount,kind,source_key,detail)
select profile_id,rep,'earn','run:'||match_id::text||':'||profile_id::text||':'||reason,
 'Verified Run: '||reason
from public.rch_run_rep_events where rep>0 on conflict(source_key) do nothing;
insert into public.rch_rep_transactions(profile_id,amount,kind,source_key,detail)
select profile_id,rep_bonus,'earn','run_stats:'||submission_id::text,'Reviewed Run statistics'
from public.rch_run_stat_rewards where rep_bonus>0 on conflict(source_key) do nothing;
update public.rch_rep_wallets w set
 balance=coalesce((select sum(t.amount) from public.rch_rep_transactions t where t.profile_id=w.profile_id),0),
 lifetime_earned=coalesce((select sum(t.amount) from public.rch_rep_transactions t where t.profile_id=w.profile_id and t.kind='earn'),0),
 updated_at=now();

create or replace function public.rch_buy_rep_reward(
 p_code text,p_post uuid default null,p_region text default 'virginia'
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_reward public.rch_rep_rewards%rowtype;v_order uuid;v_spent uuid;
begin
 if v_actor is null then raise exception 'Sign in to redeem REP'; end if;
 if not exists(select 1 from public.profiles p where p.id=v_actor and p.is_active and not coalesce(p.is_system_account,false))
 then raise exception 'An active personal profile is required'; end if;
 select * into v_reward from public.rch_rep_rewards where code=p_code and available;
 if v_reward.code is null then raise exception 'This REP reward is not available'; end if;
 if p_region not in ('virginia','richmond','central-virginia','hampton-roads','northern-virginia','southwest-virginia','shenandoah','tri-cities')
 then raise exception 'Choose a supported region'; end if;
 if v_reward.requires_post then
  if p_post is null or not exists(select 1 from public.posts p
   where p.id=p_post and p.author_id=v_actor and p.status='published'
     and not coalesce(p.is_automated,false)) then
   raise exception 'Use your own published, nonautomated post for this placement'; end if;
 else
  if p_post is not null then raise exception 'This reward does not require a post'; end if;
 end if;
 -- Serializes member purchases without locking other customers.
 insert into public.rch_rep_wallets(profile_id) values(v_actor) on conflict do nothing;
 perform 1 from public.rch_rep_wallets where profile_id=v_actor for update;
 if (select balance from public.rch_rep_wallets where profile_id=v_actor)<v_reward.price
 then raise exception 'Not enough available REP'; end if;
 if (select count(*) from public.rch_rep_orders where profile_id=v_actor
     and purchased_at>now()-interval '24 hours' and status<>'cancelled')>=3
 then raise exception 'Three REP redemptions per 24 hours'; end if;
 if v_reward.code='profile_frame' and exists(select 1 from public.rch_rep_orders
   where profile_id=v_actor and reward_code=p_code and status='active' and expires_at>now())
 then raise exception 'Your current profile frame is still active'; end if;
 if p_post is not null and exists(select 1 from public.rch_rep_orders
   where profile_id=v_actor and post_id=p_post and reward_code=p_code
     and status in ('pending_review','active'))
 then raise exception 'This post already has that promotion in progress'; end if;
 insert into public.rch_rep_orders(profile_id,reward_code,price_paid,post_id,region,status,activated_at,expires_at)
 values(v_actor,p_code,v_reward.price,p_post,p_region,
   case when v_reward.delivery='instant' then 'active' else 'pending_review' end,
   case when v_reward.delivery='instant' then now() else null end,
   case when v_reward.delivery='instant' then now()+pg_catalog.make_interval(hours=>v_reward.duration_hours) else null end)
 returning id into v_order;
 insert into public.rch_rep_transactions(profile_id,amount,kind,source_key,order_id,detail)
 values(v_actor,-v_reward.price,'purchase','purchase:'||v_order::text,v_order,'Redeemed '||v_reward.title)
 returning id into v_spent;
 update public.rch_rep_wallets set balance=balance-v_reward.price,updated_at=now() where profile_id=v_actor;
 return v_order;
end $$;

create or replace function public.rch_review_rep_reward(
 p_order uuid,p_approve boolean,p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_order public.rch_rep_orders%rowtype;v_reward public.rch_rep_rewards%rowtype;
begin
 if v_actor is null or not coalesce(public.is_staff_or_admin(),false)
 then raise exception 'Only RCH staff can fulfill REP placements'; end if;
 if char_length(trim(coalesce(p_note,''))) not between 8 and 500 then raise exception 'Document the fulfillment decision'; end if;
 select * into v_order from public.rch_rep_orders where id=p_order for update;
 if v_order.id is null or v_order.status<>'pending_review' then raise exception 'Order is not pending review'; end if;
 if v_order.profile_id=v_actor then raise exception 'Staff may not approve their own REP purchase'; end if;
 select * into v_reward from public.rch_rep_rewards where code=v_order.reward_code;
 if p_approve and v_reward.requires_post and not exists(select 1 from public.posts p
   where p.id=v_order.post_id and p.author_id=v_order.profile_id and p.status='published'
     and not coalesce(p.is_automated,false)) then
   raise exception 'The promoted post is no longer eligible'; end if;
 update public.rch_rep_orders set
  status=case when p_approve and v_reward.duration_hours is not null then 'active'
              when p_approve then 'fulfilled' else 'declined' end,
  activated_at=case when p_approve then now() else null end,
  expires_at=case when p_approve and v_reward.duration_hours is not null
    then now()+pg_catalog.make_interval(hours=>v_reward.duration_hours) else null end,
  reviewed_by=v_actor,review_note=trim(p_note),reviewed_at=now()
 where id=p_order;
 if not p_approve then
  perform public.rch_rep_credit_internal(v_order.profile_id,v_order.price_paid,
    'refund:'||v_order.id::text,'Undelivered REP reward refunded','refund',v_order.id);
 end if;
end $$;

create or replace function public.rch_cancel_rep_reward(p_order uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_order public.rch_rep_orders%rowtype;
begin
 if v_actor is null then raise exception 'Sign in to cancel'; end if;
 select * into v_order from public.rch_rep_orders where id=p_order for update;
 if v_order.id is null or v_order.profile_id<>v_actor or v_order.status<>'pending_review'
 then raise exception 'Only your pending request can be cancelled'; end if;
 update public.rch_rep_orders set status='cancelled',reviewed_at=now(),
 review_note='Cancelled before fulfillment' where id=p_order;
 perform public.rch_rep_credit_internal(v_actor,v_order.price_paid,
  'refund:'||v_order.id::text,'Cancelled REP reward','refund',v_order.id);
end $$;

-- Only approved, currently active promotional inventory qualifies for
-- extra exposure; purchases never change athletic ranks or player skill.
create or replace function public.rch_active_rep_promotions(p_limit integer default 4)
returns table(order_id uuid,post_id uuid,author_id uuid,post_body text,author_name text,reward_title text,region text)
language sql stable security definer set search_path='' as $$
 select o.id,p.id,p.author_id,left(p.body,420),
   coalesce(nullif(pr.display_name,''),nullif(pr.username::text,''),'RCH Creator'),
   rw.title,o.region
 from public.rch_rep_orders o join public.rch_rep_rewards rw on rw.code=o.reward_code
 join public.posts p on p.id=o.post_id join public.profiles pr on pr.id=p.author_id
 where o.status='active' and o.expires_at>now() and rw.requires_post
   and p.status='published' and not coalesce(p.is_automated,false)
   and pr.is_active and not coalesce(pr.is_system_account,false)
   and coalesce(pr.profile_visibility,'public') not in ('private','only_me')
 order by (extract(epoch from now())::bigint/3600+get_byte(pg_catalog.decode(replace(o.id::text,'-',''),'hex'),0))%23,o.activated_at
 limit least(greatest(coalesce(p_limit,4),1),4)
$$;

revoke all on function public.rch_buy_rep_reward(text,uuid,text),
 public.rch_review_rep_reward(uuid,boolean,text),
 public.rch_cancel_rep_reward(uuid),public.rch_active_rep_promotions(integer)
 from public,anon,authenticated;
grant execute on function public.rch_buy_rep_reward(text,uuid,text),
 public.rch_review_rep_reward(uuid,boolean,text),
 public.rch_cancel_rep_reward(uuid) to authenticated;
grant execute on function public.rch_active_rep_promotions(integer) to anon,authenticated;

comment on table public.rch_rep_wallets is 'Spendable REP; lifetime XP and verified Run ratings remain unchanged by purchases.';
commit;