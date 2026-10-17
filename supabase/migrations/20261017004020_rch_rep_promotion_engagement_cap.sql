begin;
-- One paid promotion can recoup at most 20% of its REP price from unique,
-- real account engagement. Self-interactions, system accounts and repeated
-- comments/reactions by the same person are worth zero.
create table public.rch_rep_promotion_engagement (
 order_id uuid not null references public.rch_rep_orders(id) on delete restrict,
 actor_id uuid not null references public.profiles(id) on delete cascade,
 interaction text not null check(interaction in ('comment','reaction')),
 source_id uuid not null,
 rep_credited integer not null check(rep_credited between 0 and 5),
 created_at timestamptz not null default now(),
 primary key(order_id,actor_id,interaction)
);
alter table public.rch_rep_promotion_engagement enable row level security;
revoke all on public.rch_rep_promotion_engagement from public,anon,authenticated;
grant select on public.rch_rep_promotion_engagement to authenticated;
create policy rch_promo_engagement_owner on public.rch_rep_promotion_engagement for select to authenticated
 using(exists(select 1 from public.rch_rep_orders o
   where o.id=order_id and o.profile_id=(select auth.uid())));

create or replace function public.rch_rep_reward_qualified_engagement()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_post uuid;v_actor uuid;v_order public.rch_rep_orders%rowtype;
 v_amount int;v_remaining int;v_credit int;v_inserted int;
begin
 if tg_table_name='comments' then
   v_post:=new.post_id;v_actor:=new.author_id;v_amount:=5;
 elsif tg_table_name='reactions' then
   v_post:=new.post_id;v_actor:=new.user_id;v_amount:=2;
 else return new; end if;
 if v_actor is null or not exists(select 1 from public.profiles p
   where p.id=v_actor and p.is_active and not coalesce(p.is_system_account,false))
 then return new; end if;
 -- All active promotion inventory for a post is staff-reviewed. Under daily
 -- redemption caps there should normally be only one relevant placement.
 for v_order in select * from public.rch_rep_orders o
   where o.post_id=v_post and o.status='active' and o.expires_at>now()
     and o.profile_id<>v_actor and o.reward_code in
      ('local_post_boost','story_spotlight','court_shoutout','court_billboard','hometown_spotlight')
   order by o.activated_at limit 2 for update
 loop
  if exists(select 1 from public.rch_rep_promotion_engagement e
     where e.order_id=v_order.id and e.actor_id=v_actor and e.interaction=tg_table_name::text)
  then continue; end if;
  select greatest(0,(v_order.price_paid/5)-coalesce(sum(e.rep_credited),0))::integer into v_remaining
    from public.rch_rep_promotion_engagement e where e.order_id=v_order.id;
  v_credit:=least(v_remaining,v_amount);
  if v_credit<=0 then continue; end if;
  insert into public.rch_rep_promotion_engagement(order_id,actor_id,interaction,source_id,rep_credited)
   values(v_order.id,v_actor,case when tg_table_name='comments' then 'comment' else 'reaction' end,new.id,v_credit)
   on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=1 then
   perform public.rch_rep_credit_internal(v_order.profile_id,v_credit,
    'promo:'||v_order.id::text||':'||tg_table_name||':'||v_actor::text,
    'Qualified audience engagement on an approved promoted post');
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.rch_rep_reward_qualified_engagement() from public,anon,authenticated;
create trigger rch_rep_promo_comment after insert on public.comments
 for each row execute function public.rch_rep_reward_qualified_engagement();
create trigger rch_rep_promo_reaction after insert on public.reactions
 for each row execute function public.rch_rep_reward_qualified_engagement();
commit;