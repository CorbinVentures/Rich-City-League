begin;

alter table public.network_campaigns
  drop constraint if exists network_campaigns_status_check;
alter table public.network_campaigns
  add constraint network_campaigns_status_check
  check (status in ('pending','approved','active','rejected','paused','completed','cancelled'));

alter table public.network_campaigns
  drop constraint if exists network_campaigns_requested_placement_check;
alter table public.network_campaigns
  add constraint network_campaigns_requested_placement_check
  check (requested_placement in ('network-home','regional-feature','event-spotlight','social-feed','search-feature','news-feature','community-feature','digest','media-feature'));

alter table public.network_promotions
  drop constraint if exists network_promotions_placement_check;
alter table public.network_promotions
  add constraint network_promotions_placement_check
  check (placement in ('network-home','regional-feature','event-spotlight','social-feed','search-feature','news-feature','community-feature','digest','media-feature'));

alter table public.network_promotions
  add column if not exists target_regions text[] not null default '{}',
  add column if not exists activated_by uuid references public.profiles(id) on delete set null,
  add column if not exists activated_at timestamptz;

alter table public.network_promotions
  drop constraint if exists network_promotions_target_regions_check;
alter table public.network_promotions
  add constraint network_promotions_target_regions_check
  check (target_regions <@ array['central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','tri-cities','statewide','other']::text[]);

alter table public.network_campaigns
  drop constraint if exists network_campaigns_target_regions_check;
alter table public.network_campaigns
  add constraint network_campaigns_target_regions_check
  check (target_regions <@ array['central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','tri-cities','statewide','other']::text[]);

create index if not exists network_promotions_target_regions_idx
  on public.network_promotions using gin(target_regions);
create index if not exists network_promotions_campaign_placement_idx
  on public.network_promotions(campaign_id, placement, status, starts_at, ends_at)
  where campaign_id is not null;
create index if not exists network_promotions_activated_by_idx
  on public.network_promotions(activated_by)
  where activated_by is not null;

create or replace function public.review_network_campaign(
  p_campaign_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.network_campaigns%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'invalid campaign decision';
  end if;

  select * into v_campaign
  from public.network_campaigns
  where id = p_campaign_id
  for update;

  if not found then raise exception 'campaign not found'; end if;
  if v_campaign.status <> 'pending' then raise exception 'campaign already reviewed'; end if;

  update public.network_campaigns
  set status = p_decision,
      reviewed_by = (select auth.uid()),
      review_notes = p_review_notes,
      reviewed_at = now()
  where id = p_campaign_id;

  return p_campaign_id;
end;
$$;

revoke all on function public.review_network_campaign(uuid,text,text) from public, anon;
grant execute on function public.review_network_campaign(uuid,text,text) to authenticated;

create or replace function public.activate_network_campaign(
  p_campaign_id uuid,
  p_placement text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_target_regions text[] default '{}',
  p_headline text default null,
  p_destination_url text default null,
  p_disclosure_label text default 'Sponsored'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.network_campaigns%rowtype;
  v_promotion_id uuid;
  v_regions text[] := coalesce(p_target_regions, '{}'::text[]);
  v_destination text;
  v_headline text;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if p_placement not in ('network-home','regional-feature','event-spotlight','social-feed','search-feature','news-feature','community-feature','digest','media-feature') then
    raise exception 'invalid placement';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'campaign end must be after start';
  end if;
  if not (v_regions <@ array['central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','tri-cities','statewide','other']::text[]) then
    raise exception 'invalid target region';
  end if;
  if char_length(coalesce(p_disclosure_label,'')) < 2 or char_length(p_disclosure_label) > 60 then
    raise exception 'invalid disclosure label';
  end if;

  select * into v_campaign
  from public.network_campaigns
  where id = p_campaign_id
  for update;

  if not found then raise exception 'campaign not found'; end if;
  if v_campaign.status not in ('approved','active','paused') then
    raise exception 'campaign must be approved before activation';
  end if;

  v_destination := coalesce(nullif(trim(p_destination_url),''), v_campaign.destination_url);
  v_headline := coalesce(nullif(trim(p_headline),''), v_campaign.headline, v_campaign.name);

  if v_destination is null or char_length(v_destination) > 2000 then
    raise exception 'invalid destination url';
  end if;
  if char_length(v_headline) > 180 then
    raise exception 'headline too long';
  end if;

  update public.network_promotions
  set status = 'completed', updated_at = now()
  where campaign_id = p_campaign_id
    and placement = p_placement
    and status in ('active','paused');

  insert into public.network_promotions(
    organization_id, event_id, campaign_id, placement, headline, disclosure_label,
    destination_url, starts_at, ends_at, target_regions, sort_weight, status,
    activated_by, activated_at
  ) values (
    v_campaign.organization_id, v_campaign.event_id, v_campaign.id, p_placement,
    v_headline, p_disclosure_label, v_destination, p_starts_at, p_ends_at,
    v_regions, 0, 'active', (select auth.uid()), now()
  ) returning id into v_promotion_id;

  update public.network_campaigns
  set status = 'active', updated_at = now()
  where id = p_campaign_id;

  return v_promotion_id;
end;
$$;

revoke all on function public.activate_network_campaign(uuid,text,timestamptz,timestamptz,text[],text,text,text) from public, anon;
grant execute on function public.activate_network_campaign(uuid,text,timestamptz,timestamptz,text[],text,text,text) to authenticated;

create or replace function public.set_network_campaign_delivery_status(
  p_campaign_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign_status text;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if p_status not in ('active','paused','completed','cancelled') then
    raise exception 'invalid campaign delivery status';
  end if;

  select status into v_campaign_status
  from public.network_campaigns
  where id = p_campaign_id
  for update;

  if not found then raise exception 'campaign not found'; end if;
  if v_campaign_status not in ('approved','active','paused') and p_status in ('active','paused') then
    raise exception 'campaign cannot be resumed from this state';
  end if;

  if p_status = 'active' and not exists (
    select 1 from public.network_promotions p where p.campaign_id = p_campaign_id
  ) then
    raise exception 'activate a placement before resuming campaign';
  end if;

  update public.network_campaigns
  set status = p_status, updated_at = now()
  where id = p_campaign_id;

  update public.network_promotions
  set status = case
    when p_status = 'active' and status = 'paused' then 'active'
    when p_status = 'paused' and status = 'active' then 'paused'
    when p_status = 'completed' and status in ('active','paused','draft') then 'completed'
    when p_status = 'cancelled' and status in ('active','paused','draft') then 'cancelled'
    else status
  end,
  updated_at = now()
  where campaign_id = p_campaign_id;
end;
$$;

revoke all on function public.set_network_campaign_delivery_status(uuid,text) from public, anon;
grant execute on function public.set_network_campaign_delivery_status(uuid,text) to authenticated;

drop policy if exists "network promotions public read" on public.network_promotions;
create policy "network promotions public read"
on public.network_promotions for select
to anon, authenticated
using (
  (
    status = 'active'
    and starts_at <= now()
    and ends_at > now()
  )
  or public.is_admin()
);

grant select on table public.network_promotions to anon, authenticated;
grant select, insert, update on table public.network_campaigns to authenticated;

commit;
