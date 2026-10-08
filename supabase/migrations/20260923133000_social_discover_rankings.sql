begin;

-- Authoritative Social discovery ranking. Keep ranking logic in Postgres so
-- clients do not rank a small, recently-created profile sample as "Top REP".
create or replace function public.social_discover_rankings(result_limit integer default 10)
returns table (
  profile_id uuid,
  display_name text,
  username text,
  avatar_url text,
  role text,
  is_vip boolean,
  vip_label text,
  rep integer,
  level integer,
  rep_gained_7d integer
)
language sql
stable
security invoker
set search_path=public
as $$
  with recent_rep as (
    select xt.profile_id, coalesce(sum(xt.amount),0)::integer as gained
    from public.xp_transactions xt
    where xt.created_at >= now() - interval '7 days'
    group by xt.profile_id
  )
  select
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.role,
    coalesce(p.is_vip,false),
    p.vip_label,
    coalesce(ul.xp,0)::integer,
    coalesce(ul.level,1)::integer,
    coalesce(rr.gained,0)::integer
  from public.profiles p
  left join public.user_levels ul on ul.profile_id=p.id
  left join recent_rep rr on rr.profile_id=p.id
  where p.is_active=true and p.profile_visibility='public'
  order by coalesce(ul.xp,0) desc, coalesce(rr.gained,0) desc, p.created_at asc
  limit greatest(1,least(coalesce(result_limit,10),50));
$$;

grant execute on function public.social_discover_rankings(integer) to anon,authenticated;

create or replace function public.social_top_rep_gainers(result_limit integer default 10)
returns table (
  profile_id uuid,
  display_name text,
  username text,
  avatar_url text,
  role text,
  is_vip boolean,
  vip_label text,
  rep integer,
  level integer,
  rep_gained_7d integer
)
language sql
stable
security invoker
set search_path=public
as $$
  with recent_rep as (
    select xt.profile_id, coalesce(sum(xt.amount),0)::integer as gained
    from public.xp_transactions xt
    where xt.created_at >= now() - interval '7 days'
    group by xt.profile_id
  )
  select
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.role,
    coalesce(p.is_vip,false),
    p.vip_label,
    coalesce(ul.xp,0)::integer,
    coalesce(ul.level,1)::integer,
    rr.gained
  from recent_rep rr
  join public.profiles p on p.id=rr.profile_id
  left join public.user_levels ul on ul.profile_id=p.id
  where p.is_active=true and p.profile_visibility='public' and rr.gained>0
  order by rr.gained desc, coalesce(ul.xp,0) desc, p.created_at asc
  limit greatest(1,least(coalesce(result_limit,10),50));
$$;

grant execute on function public.social_top_rep_gainers(integer) to anon,authenticated;

commit;
