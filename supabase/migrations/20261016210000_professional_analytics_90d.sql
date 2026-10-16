-- RCH Professional Dashboard: member-owned, privacy-safe 90-day content analytics.
-- Views count signed-in accounts who actually saw a visible post; no viewer identities
-- or personal locations are returned to authors. New feature is FREE for all members.
begin;

create table if not exists public.professional_post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  view_day date not null,
  viewed_at timestamptz not null default now(),
  primary key (post_id, viewer_id, view_day)
);
create index if not exists professional_post_views_day_post_idx
  on public.professional_post_views(view_day,post_id);
create index if not exists professional_post_views_viewed_at_idx
  on public.professional_post_views(viewed_at);
alter table public.professional_post_views enable row level security;
revoke all on table public.professional_post_views from public, anon, authenticated;
-- No direct row SELECT/INSERT for clients; only identity-validated RPCs are exposed.

create or replace function public.record_professional_post_view(p_post_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or p_post_id is null then
    return;
  end if;

  -- Hardened explicit visibility check is required when bypassing RLS.
  -- No self-views, drafts, blocked/private profiles or private profile-wall posts.
  if not exists (
    select 1 from public.posts p
    join public.profiles viewer on viewer.id = v_actor and viewer.is_active
    where p.id = p_post_id
      and p.author_id <> v_actor
      and p.status = 'published'::public.content_status
      and private.can_view_social_profile(p.author_id)
      and (p.target_profile_id is null or private.can_view_social_profile(p.target_profile_id))
  ) then
    return;
  end if;

  insert into public.professional_post_views(post_id,viewer_id,view_day)
  values (p_post_id,v_actor,(pg_catalog.now() at time zone 'UTC')::date)
  on conflict (post_id,viewer_id,view_day) do nothing;
end;
$$;
revoke all on function public.record_professional_post_view(uuid) from public,anon,authenticated;
grant execute on function public.record_professional_post_view(uuid) to authenticated;

create or replace function public.get_my_professional_analytics(
  p_days integer default 30,
  p_timezone text default 'UTC'
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_timezone text;
  v_from timestamptz;
  v_result jsonb;
begin
  if v_actor is null then
    raise exception 'Sign in to view professional analytics' using errcode='42501';
  end if;
  if p_days not in (7,30,90) or p_days is null then
    raise exception 'Reporting period must be 7, 30 or 90 days' using errcode='22023';
  end if;

  v_timezone := case
    when p_timezone is not null and pg_catalog.length(p_timezone) <= 80
      and exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = p_timezone)
    then p_timezone else 'UTC' end;
  v_from := ((pg_catalog.now() at time zone 'UTC')::date - (p_days - 1))::timestamp at time zone 'UTC';

  with my_posts as materialized (
    select p.id,p.body,p.media_urls,p.created_at
    from public.posts p
    where p.author_id=v_actor and p.status='published'::public.content_status
  ),
  views as materialized (
    select v.post_id,v.viewer_id,v.viewed_at
    from public.professional_post_views v
    join my_posts p on p.id=v.post_id
    where v.viewed_at>=v_from
  ),
  reacts as materialized (
    select r.post_id,r.created_at from public.reactions r
    join my_posts p on p.id=r.post_id where r.created_at>=v_from
  ),
  comments as materialized (
    select c.post_id,c.created_at from public.comments c
    join my_posts p on p.id=c.post_id where c.created_at>=v_from
  ),
  reposts as materialized (
    select r.post_id,r.created_at from public.post_reposts r
    join my_posts p on p.id=r.post_id where r.created_at>=v_from
  ),
  saves as materialized (
    select s.post_id,s.created_at from public.saved_posts s
    join my_posts p on p.id=s.post_id where s.created_at>=v_from
  ),
  profile_visits as materialized (
    select a.created_at from public.user_activity a
    where a.entity_type='profile' and a.activity_type='profile_view'
      and a.entity_id=v_actor and a.created_at>=v_from
  ),
  all_daily as (
    select (viewed_at at time zone 'UTC')::date as day,count(*)::bigint as impressions,0::bigint as interactions
      from views group by 1
    union all
    select (created_at at time zone 'UTC')::date,0,count(*) from reacts group by 1
    union all
    select (created_at at time zone 'UTC')::date,0,count(*) from comments group by 1
    union all
    select (created_at at time zone 'UTC')::date,0,count(*) from reposts group by 1
    union all
    select (created_at at time zone 'UTC')::date,0,count(*) from saves group by 1
  ),
  daily_agg as (
    select day,pg_catalog.sum(impressions) as impressions,pg_catalog.sum(interactions) as interactions
    from all_daily group by day
  ),
  hourly_agg as (
    select pg_catalog.extract(hour from viewed_at at time zone v_timezone)::integer as hr,
      count(*)::bigint as views
    from views group by 1
  ),
  post_metrics as (
    select p.id,p.created_at,
      pg_catalog.left(pg_catalog.coalesce(p.body,''),160) as preview,
      case when pg_catalog.jsonb_array_length(pg_catalog.coalesce(p.media_urls,'[]'::jsonb))>0
           then 'Media' else 'Text' end as format,
      (select count(*) from views v where v.post_id=p.id)::bigint as impressions,
      (select count(distinct v.viewer_id) from views v where v.post_id=p.id)::bigint as reach,
      (select count(*) from reacts r where r.post_id=p.id)::bigint as reactions,
      (select count(*) from comments c where c.post_id=p.id)::bigint as comments,
      (select count(*) from reposts r where r.post_id=p.id)::bigint as reposts,
      (select count(*) from saves s where s.post_id=p.id)::bigint as saves
    from my_posts p
  ),
  best_posts as (
    select id,created_at,preview,format,impressions,reach,reactions,comments,reposts,saves,
      (reactions+comments+reposts+saves)::bigint as interactions
    from post_metrics
    where created_at >= v_from or impressions+reactions+comments+reposts+saves>0
    order by impressions desc,interactions desc,created_at desc limit 12
  )
  select pg_catalog.jsonb_build_object(
    'period',p_days,'timezone',v_timezone,
    'totals',pg_catalog.jsonb_build_object(
      'impressions',(select count(*) from views),
      'reach',(select count(distinct viewer_id) from views),
      'profile_views',(select count(*) from profile_visits),
      'reactions',(select count(*) from reacts),
      'comments',(select count(*) from comments),
      'reposts',(select count(*) from reposts),
      'saves',(select count(*) from saves),
      'new_followers',(select count(*) from public.follows f where f.following_id=v_actor and f.created_at>=v_from),
      'posts_published',(select count(*) from my_posts p where p.created_at>=v_from)
    ),
    'daily',(
      select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'day',d.day::date,'impressions',pg_catalog.coalesce(a.impressions,0),
        'interactions',pg_catalog.coalesce(a.interactions,0)
      ) order by d.day),'[]'::jsonb)
      from pg_catalog.generate_series((v_from at time zone 'UTC')::date,
        (pg_catalog.now() at time zone 'UTC')::date,'1 day'::interval) as d(day)
      left join daily_agg a on a.day=d.day::date
    ),
    'hours',(
      select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'hour',h.hr,'views',pg_catalog.coalesce(a.views,0)
      ) order by h.hr),'[]'::jsonb)
      from pg_catalog.generate_series(0,23) as h(hr)
      left join hourly_agg a on a.hr=h.hr
    ),
    'top_posts',(
      select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(b) order by b.impressions desc,b.interactions desc,b.created_at desc),'[]'::jsonb)
      from best_posts b
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_my_professional_analytics(integer,text) from public,anon,authenticated;
grant execute on function public.get_my_professional_analytics(integer,text) to authenticated;

comment on function public.get_my_professional_analytics(integer,text) is
  'Owner-only aggregate professional analytics (7/30/90 days); reach is observed signed-in post viewers, not estimated audience size.';
commit;
