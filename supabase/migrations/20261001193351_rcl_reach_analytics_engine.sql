begin;

alter table public.network_exposure_events
  drop constraint if exists network_exposure_events_event_type_check;
alter table public.network_exposure_events
  add constraint network_exposure_events_event_type_check
  check (event_type in ('impression','organization_view','event_view','outbound_click','share','media_view','save','follow'));

alter table public.network_exposure_daily
  add column if not exists saves integer not null default 0;

alter table public.network_organizations
  add column if not exists follower_count integer not null default 0;

alter table public.network_campaigns
  drop constraint if exists network_campaigns_package_check;
alter table public.network_campaigns
  add constraint network_campaigns_package_check
  check (package in ('boost','amplify','premier','custom'));

create table if not exists public.network_reach_daily_breakdown (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  metric_date date not null,
  surface text not null check (char_length(surface) between 1 and 120),
  network_event_id uuid references public.network_events(id) on delete set null,
  promotion_id uuid references public.network_promotions(id) on delete set null,
  campaign_id uuid references public.network_campaigns(id) on delete set null,
  impressions integer not null default 0,
  organization_views integer not null default 0,
  event_views integer not null default 0,
  outbound_clicks integer not null default 0,
  follower_growth integer not null default 0,
  shares integer not null default 0,
  media_views integer not null default 0,
  saves integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint network_reach_daily_breakdown_unique
    unique nulls not distinct (organization_id, metric_date, surface, network_event_id, promotion_id, campaign_id)
);

create index if not exists network_reach_daily_breakdown_org_date_idx
  on public.network_reach_daily_breakdown(organization_id, metric_date desc);
create index if not exists network_reach_daily_breakdown_campaign_date_idx
  on public.network_reach_daily_breakdown(campaign_id, metric_date desc)
  where campaign_id is not null;
create index if not exists network_reach_daily_breakdown_event_date_idx
  on public.network_reach_daily_breakdown(network_event_id, metric_date desc)
  where network_event_id is not null;
create index if not exists network_reach_daily_breakdown_surface_date_idx
  on public.network_reach_daily_breakdown(organization_id, surface, metric_date desc);

drop trigger if exists network_reach_daily_breakdown_updated_at on public.network_reach_daily_breakdown;
create trigger network_reach_daily_breakdown_updated_at
before update on public.network_reach_daily_breakdown
for each row execute function public.set_updated_at();

alter table public.network_reach_daily_breakdown enable row level security;
revoke all on table public.network_reach_daily_breakdown from anon, authenticated;
grant select on table public.network_reach_daily_breakdown to authenticated;

create policy "network reach manager read"
on public.network_reach_daily_breakdown for select to authenticated
using (public.can_manage_network_organization(organization_id));

create table if not exists public.network_organization_follows (
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create index if not exists network_organization_follows_profile_idx
  on public.network_organization_follows(profile_id, created_at desc);
create index if not exists network_organization_follows_org_created_idx
  on public.network_organization_follows(organization_id, created_at desc);

alter table public.network_organization_follows enable row level security;
revoke all on table public.network_organization_follows from anon, authenticated;
grant select, insert, delete on table public.network_organization_follows to authenticated;

create policy "network follows own read"
on public.network_organization_follows for select to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

create policy "network follows own create"
on public.network_organization_follows for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1 from public.network_organizations o
    where o.id = organization_id and o.status = 'active'
  )
);

create policy "network follows own delete"
on public.network_organization_follows for delete to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

create or replace function public.record_network_exposure_event(
  p_organization_id uuid,
  p_event_type text,
  p_surface text default 'unknown',
  p_event_id uuid default null,
  p_promotion_id uuid default null,
  p_campaign_id uuid default null,
  p_destination_url text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_event_type not in ('impression','organization_view','event_view','outbound_click','share','media_view','save','follow') then
    raise exception 'invalid exposure event type';
  end if;
  if char_length(coalesce(p_surface, '')) < 1 or char_length(p_surface) > 120 then
    raise exception 'invalid surface';
  end if;
  if p_destination_url is not null and char_length(p_destination_url) > 2000 then
    raise exception 'destination url too long';
  end if;
  if not exists (
    select 1 from public.network_organizations o
    where o.id = p_organization_id and o.status = 'active'
  ) then
    raise exception 'organization unavailable';
  end if;
  if p_event_id is not null and not exists (
    select 1 from public.network_events e
    where e.id = p_event_id and e.organization_id = p_organization_id and e.status = 'published'
  ) then
    raise exception 'event unavailable';
  end if;
  if p_promotion_id is not null and not exists (
    select 1 from public.network_promotions p
    where p.id = p_promotion_id and p.organization_id = p_organization_id
  ) then
    raise exception 'promotion unavailable';
  end if;
  if p_campaign_id is not null and not exists (
    select 1 from public.network_campaigns c
    where c.id = p_campaign_id and c.organization_id = p_organization_id
  ) then
    raise exception 'campaign unavailable';
  end if;

  insert into public.network_exposure_events(
    organization_id, network_event_id, promotion_id, campaign_id,
    event_type, surface, destination_url
  ) values (
    p_organization_id, p_event_id, p_promotion_id, p_campaign_id,
    p_event_type, p_surface, p_destination_url
  );

  insert into public.network_exposure_daily(
    organization_id, metric_date, impressions, organization_views, event_views,
    outbound_clicks, follower_growth, shares, media_views, saves
  ) values (
    p_organization_id,
    (now() at time zone 'UTC')::date,
    case when p_event_type = 'impression' then 1 else 0 end,
    case when p_event_type = 'organization_view' then 1 else 0 end,
    case when p_event_type = 'event_view' then 1 else 0 end,
    case when p_event_type = 'outbound_click' then 1 else 0 end,
    case when p_event_type = 'follow' then 1 else 0 end,
    case when p_event_type = 'share' then 1 else 0 end,
    case when p_event_type = 'media_view' then 1 else 0 end,
    case when p_event_type = 'save' then 1 else 0 end
  )
  on conflict (organization_id, metric_date) do update set
    impressions = public.network_exposure_daily.impressions + excluded.impressions,
    organization_views = public.network_exposure_daily.organization_views + excluded.organization_views,
    event_views = public.network_exposure_daily.event_views + excluded.event_views,
    outbound_clicks = public.network_exposure_daily.outbound_clicks + excluded.outbound_clicks,
    follower_growth = public.network_exposure_daily.follower_growth + excluded.follower_growth,
    shares = public.network_exposure_daily.shares + excluded.shares,
    media_views = public.network_exposure_daily.media_views + excluded.media_views,
    saves = public.network_exposure_daily.saves + excluded.saves,
    updated_at = now();

  insert into public.network_reach_daily_breakdown(
    organization_id, metric_date, surface, network_event_id, promotion_id, campaign_id,
    impressions, organization_views, event_views, outbound_clicks, follower_growth, shares, media_views, saves
  ) values (
    p_organization_id,
    (now() at time zone 'UTC')::date,
    p_surface,
    p_event_id,
    p_promotion_id,
    p_campaign_id,
    case when p_event_type = 'impression' then 1 else 0 end,
    case when p_event_type = 'organization_view' then 1 else 0 end,
    case when p_event_type = 'event_view' then 1 else 0 end,
    case when p_event_type = 'outbound_click' then 1 else 0 end,
    case when p_event_type = 'follow' then 1 else 0 end,
    case when p_event_type = 'share' then 1 else 0 end,
    case when p_event_type = 'media_view' then 1 else 0 end,
    case when p_event_type = 'save' then 1 else 0 end
  )
  on conflict on constraint network_reach_daily_breakdown_unique do update set
    impressions = public.network_reach_daily_breakdown.impressions + excluded.impressions,
    organization_views = public.network_reach_daily_breakdown.organization_views + excluded.organization_views,
    event_views = public.network_reach_daily_breakdown.event_views + excluded.event_views,
    outbound_clicks = public.network_reach_daily_breakdown.outbound_clicks + excluded.outbound_clicks,
    follower_growth = public.network_reach_daily_breakdown.follower_growth + excluded.follower_growth,
    shares = public.network_reach_daily_breakdown.shares + excluded.shares,
    media_views = public.network_reach_daily_breakdown.media_views + excluded.media_views,
    saves = public.network_reach_daily_breakdown.saves + excluded.saves,
    updated_at = now();
end;
$$;

revoke all on function public.record_network_exposure_event(uuid,text,text,uuid,uuid,uuid,text) from public;
grant execute on function public.record_network_exposure_event(uuid,text,text,uuid,uuid,uuid,text) to anon, authenticated;

create or replace function public.handle_network_organization_follow_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.network_organizations
    set follower_count = follower_count + 1
    where id = new.organization_id;

    perform public.record_network_exposure_event(
      new.organization_id,
      'follow',
      'organization-follow',
      null,
      null,
      null,
      null
    );
    return new;
  end if;

  update public.network_organizations
  set follower_count = greatest(follower_count - 1, 0)
  where id = old.organization_id;
  return old;
end;
$$;

revoke all on function public.handle_network_organization_follow_change() from public, anon, authenticated;

drop trigger if exists network_organization_follows_track on public.network_organization_follows;
create trigger network_organization_follows_track
after insert or delete on public.network_organization_follows
for each row execute function public.handle_network_organization_follow_change();

create or replace function public.attribute_network_saved_item()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
  v_event_id uuid;
begin
  if new.item_type = 'organization' then
    select o.id into v_organization_id
    from public.network_organizations o
    where o.id = new.item_id and o.status = 'active';
  elsif new.item_type = 'network_event' then
    select e.organization_id, e.id into v_organization_id, v_event_id
    from public.network_events e
    where e.id = new.item_id and e.status = 'published';
  end if;

  if v_organization_id is not null then
    perform public.record_network_exposure_event(
      v_organization_id,
      'save',
      'my-hoops-save',
      v_event_id,
      null,
      null,
      null
    );
  end if;

  return new;
end;
$$;

revoke all on function public.attribute_network_saved_item() from public, anon, authenticated;

drop trigger if exists member_saved_items_network_attribution on public.member_saved_items;
create trigger member_saved_items_network_attribution
after insert on public.member_saved_items
for each row execute function public.attribute_network_saved_item();

commit;
