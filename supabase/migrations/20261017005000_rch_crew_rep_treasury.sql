begin;
-- Crews have a separate, auditable treasury. Individual wallet contributions
-- never count as basketball victories, crew win rate or court territory.
create table public.rch_crew_rep_wallets (
 crew_id uuid primary key references public.commonwealth_crews(id) on delete cascade,
 balance bigint not null default 0 check(balance>=0),
 lifetime_earned bigint not null default 0 check(lifetime_earned>=0),
 updated_at timestamptz not null default now()
);
create table public.rch_crew_rep_rewards (
 code text primary key,
 title text not null,
 description text not null,
 price integer not null check(price>0 and price<=100000),
 available boolean not null default true
);
insert into public.rch_crew_rep_rewards(code,title,description,price)
values
 ('crew_showcase','Crew Identity Spotlight','Request a rotating, labeled crew spotlight showcasing your roster, logo and community.',500),
 ('crew_recruit','Crew Recruitment Campaign','Request a reviewed crew recruiting placement for local players.',650),
 ('crew_trailer','Crew Matchup Trailer','Request an edited hype trailer using your crew’s submitted and permitted media.',900),
 ('crew_court_billboard','Crew Court Billboard','Request a local court-page promotional placement for your crew.',800)
on conflict(code) do update set title=excluded.title,description=excluded.description,price=excluded.price;
create table public.rch_crew_rep_orders (
 id uuid primary key default gen_random_uuid(),
 crew_id uuid not null references public.commonwealth_crews(id) on delete restrict,
 reward_code text not null references public.rch_crew_rep_rewards(code),
 cost integer not null check(cost>0),
 requested_by uuid not null references public.profiles(id) on delete restrict,
 status text not null default 'pending_review' check(status in ('pending_review','fulfilled','declined','cancelled')),
 review_note text,
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index rch_crew_rep_order_queue on public.rch_crew_rep_orders(status,created_at);
create table public.rch_crew_rep_transactions (
 id uuid primary key default gen_random_uuid(),
 crew_id uuid not null references public.commonwealth_crews(id) on delete cascade,
 member_id uuid references public.profiles(id),
 amount bigint not null check(amount<>0 and amount between -1000000 and 1000000),
 kind text not null check(kind in ('earned_takeover','member_contribution','redeemed','refund')),
 source_key text not null unique,
 order_id uuid references public.rch_crew_rep_orders(id) on delete restrict,
 description text not null,
 created_at timestamptz not null default now()
);
create index rch_crew_rep_ledger_index on public.rch_crew_rep_transactions(crew_id,created_at desc);

alter table public.rch_crew_rep_wallets enable row level security;
alter table public.rch_crew_rep_rewards enable row level security;
alter table public.rch_crew_rep_orders enable row level security;
alter table public.rch_crew_rep_transactions enable row level security;
revoke all on public.rch_crew_rep_wallets,public.rch_crew_rep_rewards,
 public.rch_crew_rep_orders,public.rch_crew_rep_transactions from public,anon,authenticated;
grant select on public.rch_crew_rep_wallets,public.rch_crew_rep_rewards,
 public.rch_crew_rep_orders,public.rch_crew_rep_transactions to authenticated;
grant select on public.rch_crew_rep_rewards to anon;
create policy rch_crew_rep_reward_public on public.rch_crew_rep_rewards for select to anon,authenticated using(available);
create policy rch_crew_wallet_members on public.rch_crew_rep_wallets for select to authenticated
 using(exists(select 1 from public.commonwealth_crew_members m where m.crew_id=rch_crew_rep_wallets.crew_id and m.profile_id=(select auth.uid()))
    or exists(select 1 from public.commonwealth_crews c where c.id=crew_id and c.captain_id=(select auth.uid()))
    or coalesce(public.is_staff_or_admin(),false));
create policy rch_crew_orders_members on public.rch_crew_rep_orders for select to authenticated
 using(exists(select 1 from public.commonwealth_crew_members m where m.crew_id=rch_crew_rep_orders.crew_id and m.profile_id=(select auth.uid()))
    or exists(select 1 from public.commonwealth_crews c where c.id=crew_id and c.captain_id=(select auth.uid()))
    or coalesce(public.is_staff_or_admin(),false));
create policy rch_crew_ledger_members on public.rch_crew_rep_transactions for select to authenticated
 using(exists(select 1 from public.commonwealth_crew_members m where m.crew_id=rch_crew_rep_transactions.crew_id and m.profile_id=(select auth.uid()))
    or exists(select 1 from public.commonwealth_crews c where c.id=crew_id and c.captain_id=(select auth.uid()))
    or coalesce(public.is_staff_or_admin(),false));

create or replace function public.rch_contribute_crew_rep(p_crew uuid,p_amount integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_tx uuid;v_valid boolean;
begin
 if v_actor is null then raise exception 'Sign in to support your crew'; end if;
 if p_amount not between 10 and 1000 then raise exception 'Contribute 10 to 1000 REP per transaction'; end if;
 select exists(select 1 from public.commonwealth_crews c where c.id=p_crew
     and (c.captain_id=v_actor or exists(select 1 from public.commonwealth_crew_members m
       where m.crew_id=p_crew and m.profile_id=v_actor))) into v_valid;
 if not v_valid then raise exception 'Only crew members may contribute to their treasury'; end if;
 insert into public.rch_rep_wallets(profile_id) values(v_actor) on conflict do nothing;
 select balance into strict v_tx from public.rch_rep_wallets where profile_id=v_actor for update;
 -- Store the spend reference only AFTER acquiring the personal wallet lock.
 if (select balance from public.rch_rep_wallets where profile_id=v_actor)<p_amount
 then raise exception 'Insufficient personal REP to contribute'; end if;
 if (select coalesce(sum(-t.amount),0) from public.rch_rep_transactions t
   where t.profile_id=v_actor and t.kind='purchase' and t.detail like 'Crew treasury contribution%'
    and t.created_at>now()-interval '24 hours')+p_amount>1500
 then raise exception 'Crew contributions are limited to 1500 REP in 24 hours'; end if;
 insert into public.rch_crew_rep_wallets(crew_id) values(p_crew) on conflict do nothing;
 perform 1 from public.rch_crew_rep_wallets where crew_id=p_crew for update;
 v_tx:=gen_random_uuid();
 insert into public.rch_rep_transactions(profile_id,amount,kind,source_key,detail)
 values(v_actor,-p_amount,'purchase','crew_contrib:'||v_tx::text,
  'Crew treasury contribution: '||p_crew::text);
 update public.rch_rep_wallets set balance=balance-p_amount,updated_at=now() where profile_id=v_actor;
 insert into public.rch_crew_rep_transactions(id,crew_id,member_id,amount,kind,source_key,description)
 values(v_tx,p_crew,v_actor,p_amount,'member_contribution','member:'||v_tx::text,'Crew member contribution');
 update public.rch_crew_rep_wallets set balance=balance+p_amount,updated_at=now() where crew_id=p_crew;
 return v_tx;
end $$;

create or replace function public.rch_redeem_crew_rep(p_crew uuid,p_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_cost integer;v_order uuid;
begin
 if v_actor is null then raise exception 'Sign in to manage the crew treasury'; end if;
 if not exists(select 1 from public.commonwealth_crews c where c.id=p_crew and c.captain_id=v_actor)
 then raise exception 'Only the crew captain can request treasury rewards'; end if;
 select price into v_cost from public.rch_crew_rep_rewards where code=p_code and available;
 if v_cost is null then raise exception 'No such crew reward'; end if;
 insert into public.rch_crew_rep_wallets(crew_id) values(p_crew) on conflict do nothing;
 perform 1 from public.rch_crew_rep_wallets where crew_id=p_crew for update;
 if (select balance from public.rch_crew_rep_wallets where crew_id=p_crew)<v_cost
 then raise exception 'Not enough Crew REP'; end if;
 if (select count(*) from public.rch_crew_rep_orders o
   where o.crew_id=p_crew and o.created_at>now()-interval '24 hours')>=2
 then raise exception 'Only two crew requests per 24 hours'; end if;
 insert into public.rch_crew_rep_orders(crew_id,reward_code,cost,requested_by)
 values(p_crew,p_code,v_cost,v_actor) returning id into v_order;
 insert into public.rch_crew_rep_transactions(crew_id,member_id,amount,kind,source_key,order_id,description)
 values(p_crew,v_actor,-v_cost,'redeemed','order:'||v_order::text,v_order,'Crew reward: '||p_code);
 update public.rch_crew_rep_wallets set balance=balance-v_cost,updated_at=now() where crew_id=p_crew;
 return v_order;
end $$;

create or replace function public.rch_decide_crew_rep_order(p_order uuid,p_approve boolean,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();o public.rch_crew_rep_orders%rowtype;
begin
 if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
   raise exception 'Only RCH staff can approve crew rewards'; end if;
 if char_length(trim(coalesce(p_note,''))) not between 8 and 500 then raise exception 'Record fulfillment evidence'; end if;
 select * into o from public.rch_crew_rep_orders where id=p_order for update;
 if o.id is null or o.status<>'pending_review' then raise exception 'Crew order not pending'; end if;
 if exists(select 1 from public.commonwealth_crew_members m where m.crew_id=o.crew_id and m.profile_id=v_actor)
   or exists(select 1 from public.commonwealth_crews c where c.id=o.crew_id and c.captain_id=v_actor)
 then raise exception 'RCH staff cannot self-review their crew'; end if;
 update public.rch_crew_rep_orders set status=case when p_approve then 'fulfilled' else 'declined' end,
   reviewed_by=v_actor,review_note=trim(p_note),reviewed_at=now() where id=p_order;
 if not p_approve then
  insert into public.rch_crew_rep_wallets(crew_id) values(o.crew_id) on conflict do nothing;
  perform 1 from public.rch_crew_rep_wallets where crew_id=o.crew_id for update;
  insert into public.rch_crew_rep_transactions(crew_id,amount,kind,source_key,order_id,description)
   values(o.crew_id,o.cost,'refund','refund:'||o.id::text,o.id,'Unfulfilled crew reward refund');
  update public.rch_crew_rep_wallets set balance=balance+o.cost,updated_at=now() where crew_id=o.crew_id;
 end if;
end $$;

create or replace function public.rch_earn_crew_rep_takeover()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_insert uuid;
begin
 if new.status<>'resolved' or old.status='resolved'
   or new.winning_crew_id is null or new.winning_crew_id<>new.challenger_crew_id
   or new.resolved_match_id is null
   or not exists(select 1 from public.run_ranked_matches m
       where m.id=new.resolved_match_id and m.status='verified') then return new; end if;
 insert into public.rch_crew_rep_wallets(crew_id) values(new.winning_crew_id) on conflict do nothing;
 insert into public.rch_crew_rep_transactions(crew_id,amount,kind,source_key,description)
 values(new.winning_crew_id,100,'earned_takeover','takeover:'||new.id::text,
   'Verified Takeover victory at '||new.court_slug)
 on conflict(source_key) do nothing returning id into v_insert;
 if v_insert is not null then
  update public.rch_crew_rep_wallets set balance=balance+100,lifetime_earned=lifetime_earned+100,
    updated_at=now() where crew_id=new.winning_crew_id;
 end if;
 return new;
end $$;
create trigger rch_crew_rep_takeover after update of status on public.rch_court_takeovers
 for each row execute function public.rch_earn_crew_rep_takeover();

revoke all on function public.rch_contribute_crew_rep(uuid,integer),
 public.rch_redeem_crew_rep(uuid,text),public.rch_decide_crew_rep_order(uuid,boolean,text),
 public.rch_earn_crew_rep_takeover() from public,anon,authenticated;
grant execute on function public.rch_contribute_crew_rep(uuid,integer),
 public.rch_redeem_crew_rep(uuid,text),public.rch_decide_crew_rep_order(uuid,boolean,text) to authenticated;
commit;