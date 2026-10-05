-- Retention pass: privacy-safe profile view instrumentation.
-- Records signed-in profile views with a short dedupe window and exposes only aggregate
-- view counts to the owner of the viewed profile.

create index if not exists user_activity_profile_view_target_idx
  on public.user_activity (entity_id, created_at desc)
  where activity_type = 'profile_view' and entity_type = 'profile';

create or replace function public.record_profile_view(p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null or p_profile is null or actor = p_profile then
    return;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile
      and p.is_active = true
      and p.profile_visibility <> 'private'
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.user_activity a
    where a.profile_id = actor
      and a.activity_type = 'profile_view'
      and a.entity_type = 'profile'
      and a.entity_id = p_profile
      and a.created_at >= now() - interval '30 minutes'
  ) then
    return;
  end if;

  insert into public.user_activity(profile_id, activity_type, entity_type, entity_id, metadata)
  values(actor, 'profile_view', 'profile', p_profile, jsonb_build_object('source', 'profile_page'));
end;
$$;

create or replace function public.get_my_profile_view_summary()
returns table (
  views_7d bigint,
  views_prev_7d bigint,
  views_30d bigint,
  unique_viewers_30d bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with actor as (
    select auth.uid() as id
  )
  select
    count(*) filter (where a.created_at >= now() - interval '7 days') as views_7d,
    count(*) filter (
      where a.created_at >= now() - interval '14 days'
        and a.created_at < now() - interval '7 days'
    ) as views_prev_7d,
    count(*) filter (where a.created_at >= now() - interval '30 days') as views_30d,
    count(distinct a.profile_id) filter (where a.created_at >= now() - interval '30 days') as unique_viewers_30d
  from public.user_activity a
  cross join actor
  where actor.id is not null
    and a.activity_type = 'profile_view'
    and a.entity_type = 'profile'
    and a.entity_id = actor.id;
$$;

revoke all on function public.record_profile_view(uuid) from public;
revoke all on function public.get_my_profile_view_summary() from public;
grant execute on function public.record_profile_view(uuid) to authenticated;
grant execute on function public.get_my_profile_view_summary() to authenticated;
