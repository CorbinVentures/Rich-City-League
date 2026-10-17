begin;
drop function if exists public.rch_active_rep_promotions(integer);
create or replace function public.rch_active_rep_promotions(
 p_limit integer default 4,p_region text default 'virginia'
) returns table(order_id uuid,post_id uuid,author_id uuid,post_body text,author_name text,reward_title text,region text)
language sql stable security definer set search_path='' as $$
 select o.id,p.id,p.author_id,left(p.body,420),
   coalesce(nullif(pr.display_name,''),nullif(pr.username::text,''),'RCH Creator'),
   rw.title,o.region
 from public.rch_rep_orders o join public.rch_rep_rewards rw on rw.code=o.reward_code
 join public.posts p on p.id=o.post_id join public.profiles pr on pr.id=p.author_id
 where o.status='active' and o.expires_at>now() and rw.requires_post
   and (o.region='virginia' or o.region=p_region
        or (p_region='richmond' and o.region='central-virginia'))
   and p.status='published' and not coalesce(p.is_automated,false)
   and pr.is_active and not coalesce(pr.is_system_account,false)
   and coalesce(pr.profile_visibility,'public') not in ('private','only_me')
 order by (extract(epoch from now())::bigint/3600+get_byte(pg_catalog.decode(replace(o.id::text,'-',''),'hex'),0))%23,o.activated_at
 limit least(greatest(coalesce(p_limit,4),1),4)
$$;
revoke all on function public.rch_active_rep_promotions(integer,text) from public,anon,authenticated;
grant execute on function public.rch_active_rep_promotions(integer,text) to anon,authenticated;
commit;