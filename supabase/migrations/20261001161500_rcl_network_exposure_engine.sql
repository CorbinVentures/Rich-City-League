begin;

alter table public.network_organizations
  add column if not exists is_claimed boolean not null default false,
  add column if not exists claimed_at timestamptz;

create table if not exists public.network_organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'manager' check (member_role in ('owner','manager','editor')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create index if not exists network_organization_members_profile_idx
  on public.network_organization_members(profile_id, status);
create index if not exists network_organization_members_org_idx
  on public.network_organization_members(organization_id, status);

drop trigger if exists network_organization_members_updated_at on public.network_organization_members;
create trigger network_organization_members_updated_at before update on public.network_organization_members
for each row execute function public.set_updated_at();

create or replace function public.can_manage_network_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.network_organization_members m
      where m.organization_id = p_organization_id
        and m.profile_id = (select auth.uid())
        and m.status = 'active'
    );
$$;

revoke all on function public.can_manage_network_organization(uuid) from public;
grant execute on function public.can_manage_network_organization(uuid) to authenticated;

create table if not exists public.network_organization_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  role_title text not null check (char_length(role_title) between 2 and 120),
  contact_email text not null check (char_length(contact_email) between 3 and 320),
  proof_url text,
  proof_notes text check (proof_notes is null or char_length(proof_notes) <= 3000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text check (review_notes is null or char_length(review_notes) <= 2000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists network_organization_claims_pending_unique
  on public.network_organization_claims(organization_id, claimant_id)
  where status = 'pending';
create index if not exists network_organization_claims_status_idx
  on public.network_organization_claims(status, created_at desc);

drop trigger if exists network_organization_claims_updated_at on public.network_organization_claims;
create trigger network_organization_claims_updated_at before update on public.network_organization_claims
for each row execute function public.set_updated_at();

create table if not exists public.network_event_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 180),
  description text check (description is null or char_length(description) <= 3000),
  event_type text not null default 'other' check (event_type in ('league','tournament','tryout','showcase','camp','run','clinic','media','community','other')),
  venue_name text,
  city text,
  state text not null default 'VA',
  starts_at timestamptz not null,
  ends_at timestamptz,
  external_url text,
  image_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  published_event_id uuid references public.network_events(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text check (review_notes is null or char_length(review_notes) <= 2000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index if not exists network_event_submissions_org_idx
  on public.network_event_submissions(organization_id, status, created_at desc);
create index if not exists network_event_submissions_status_idx
  on public.network_event_submissions(status, created_at desc);

drop trigger if exists network_event_submissions_updated_at on public.network_event_submissions;
create trigger network_event_submissions_updated_at before update on public.network_event_submissions
for each row execute function public.set_updated_at();

create table if not exists public.network_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  event_id uuid references public.network_events(id) on delete set null,
  name text not null check (char_length(name) between 2 and 180),
  objective text not null default 'awareness' check (objective in ('awareness','event-traffic','website-traffic','media-views','audience-growth')),
  package text not null default 'amplify' check (package in ('amplify','premier','custom')),
  requested_placement text not null default 'regional-feature' check (requested_placement in ('network-home','regional-feature','event-spotlight','social-feed','digest','media-feature')),
  destination_url text not null,
  headline text check (headline is null or char_length(headline) <= 180),
  requested_starts_at timestamptz not null,
  requested_ends_at timestamptz not null,
  requested_budget_cents integer check (requested_budget_cents is null or requested_budget_cents >= 0),
  target_regions text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','active','rejected','paused','completed','cancelled')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text check (review_notes is null or char_length(review_notes) <= 2000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_ends_at > requested_starts_at)
);

create index if not exists network_campaigns_org_idx
  on public.network_campaigns(organization_id, status, created_at desc);
create index if not exists network_campaigns_status_idx
  on public.network_campaigns(status, requested_starts_at, requested_ends_at);

drop trigger if exists network_campaigns_updated_at on public.network_campaigns;
create trigger network_campaigns_updated_at before update on public.network_campaigns
for each row execute function public.set_updated_at();

alter table public.network_promotions
  add column if not exists campaign_id uuid references public.network_campaigns(id) on delete set null,
  add column if not exists destination_url text;

create index if not exists network_promotions_campaign_idx
  on public.network_promotions(campaign_id) where campaign_id is not null;

create table if not exists public.network_exposure_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  network_event_id uuid references public.network_events(id) on delete set null,
  promotion_id uuid references public.network_promotions(id) on delete set null,
  campaign_id uuid references public.network_campaigns(id) on delete set null,
  event_type text not null check (event_type in ('impression','organization_view','event_view','outbound_click','share','media_view')),
  surface text not null default 'unknown' check (char_length(surface) between 1 and 120),
  destination_url text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists network_exposure_events_org_time_idx
  on public.network_exposure_events(organization_id, occurred_at desc);
create index if not exists network_exposure_events_campaign_time_idx
  on public.network_exposure_events(campaign_id, occurred_at desc) where campaign_id is not null;
create index if not exists network_exposure_events_promotion_time_idx
  on public.network_exposure_events(promotion_id, occurred_at desc) where promotion_id is not null;

alter table public.network_organization_members enable row level security;
alter table public.network_organization_claims enable row level security;
alter table public.network_event_submissions enable row level security;
alter table public.network_campaigns enable row level security;
alter table public.network_exposure_events enable row level security;

revoke all on table public.network_organization_members from anon, authenticated;
revoke all on table public.network_organization_claims from anon, authenticated;
revoke all on table public.network_event_submissions from anon, authenticated;
revoke all on table public.network_campaigns from anon, authenticated;
revoke all on table public.network_exposure_events from anon, authenticated;

grant select on table public.network_organization_members to authenticated;
grant select, insert, update on table public.network_organization_claims to authenticated;
grant select, insert, update on table public.network_event_submissions to authenticated;
grant select, insert, update on table public.network_campaigns to authenticated;
grant select on table public.network_exposure_events to authenticated;

create policy "network organization members read"
on public.network_organization_members for select to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

create policy "network claims read"
on public.network_organization_claims for select to authenticated
using (claimant_id = (select auth.uid()) or public.is_admin());

create policy "network claims create"
on public.network_organization_claims for insert to authenticated
with check (
  claimant_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.network_organizations o
    where o.id = organization_id and o.status = 'active' and o.network_tier <> 'flagship'
  )
);

create policy "network claims admin update"
on public.network_organization_claims for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "network event submissions read"
on public.network_event_submissions for select to authenticated
using (public.can_manage_network_organization(organization_id));

create policy "network event submissions create"
on public.network_event_submissions for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'pending'
  and public.can_manage_network_organization(organization_id)
);

create policy "network event submissions admin update"
on public.network_event_submissions for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "network campaigns read"
on public.network_campaigns for select to authenticated
using (public.can_manage_network_organization(organization_id));

create policy "network campaigns create"
on public.network_campaigns for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'pending'
  and public.can_manage_network_organization(organization_id)
);

create policy "network campaigns admin update"
on public.network_campaigns for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "network exposure events admin read"
on public.network_exposure_events for select to authenticated
using (public.is_admin());

drop policy if exists "network exposure admin read" on public.network_exposure_daily;
drop policy if exists "network exposure manager read" on public.network_exposure_daily;
create policy "network exposure manager read"
on public.network_exposure_daily for select to authenticated
using (public.can_manage_network_organization(organization_id));

create or replace function public.review_network_organization_claim(
  p_claim_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim public.network_organization_claims%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'invalid claim decision';
  end if;

  select * into v_claim
  from public.network_organization_claims
  where id = p_claim_id
  for update;

  if not found then raise exception 'claim not found'; end if;
  if v_claim.status <> 'pending' then raise exception 'claim already reviewed'; end if;

  update public.network_organization_claims
  set status = p_decision,
      reviewed_by = (select auth.uid()),
      review_notes = p_review_notes,
      reviewed_at = now()
  where id = p_claim_id;

  if p_decision = 'approved' then
    insert into public.network_organization_members(organization_id, profile_id, member_role, status)
    values (v_claim.organization_id, v_claim.claimant_id, 'owner', 'active')
    on conflict (organization_id, profile_id) do update
      set member_role = 'owner', status = 'active', updated_at = now();

    update public.network_organizations
    set is_claimed = true,
        claimed_at = coalesce(claimed_at, now()),
        is_verified = true,
        verification_label = coalesce(verification_label, 'Verified Organization')
    where id = v_claim.organization_id;
  end if;

  return v_claim.organization_id;
end;
$$;

revoke all on function public.review_network_organization_claim(uuid,text,text) from public;
grant execute on function public.review_network_organization_claim(uuid,text,text) to authenticated;

create or replace function public.review_network_event_submission(
  p_submission_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission public.network_event_submissions%rowtype;
  v_event_id uuid;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'invalid event decision';
  end if;

  select * into v_submission
  from public.network_event_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'submission not found'; end if;
  if v_submission.status <> 'pending' then raise exception 'submission already reviewed'; end if;

  if p_decision = 'approved' then
    v_slug := trim(both '-' from regexp_replace(lower(v_submission.title), '[^a-z0-9]+', '-', 'g'));
    if char_length(v_slug) < 2 then v_slug := 'event'; end if;
    v_slug := left(v_slug, 140) || '-' || left(replace(v_submission.id::text, '-', ''), 8);

    insert into public.network_events(
      organization_id, slug, title, description, event_type, venue_name, city, state,
      starts_at, ends_at, external_url, image_url, status
    ) values (
      v_submission.organization_id, v_slug, v_submission.title, v_submission.description,
      v_submission.event_type, v_submission.venue_name, v_submission.city, v_submission.state,
      v_submission.starts_at, v_submission.ends_at, v_submission.external_url,
      v_submission.image_url, 'published'
    ) returning id into v_event_id;
  end if;

  update public.network_event_submissions
  set status = p_decision,
      published_event_id = v_event_id,
      reviewed_by = (select auth.uid()),
      review_notes = p_review_notes,
      reviewed_at = now()
  where id = p_submission_id;

  return v_event_id;
end;
$$;

revoke all on function public.review_network_event_submission(uuid,text,text) from public;
grant execute on function public.review_network_event_submission(uuid,text,text) to authenticated;

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
  v_promotion_id uuid;
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

  if p_decision = 'approved' then
    insert into public.network_promotions(
      organization_id, event_id, campaign_id, placement, headline, disclosure_label,
      destination_url, starts_at, ends_at, status
    ) values (
      v_campaign.organization_id, v_campaign.event_id, v_campaign.id,
      v_campaign.requested_placement, coalesce(v_campaign.headline, v_campaign.name),
      'Sponsored', v_campaign.destination_url, v_campaign.requested_starts_at,
      v_campaign.requested_ends_at, 'active'
    ) returning id into v_promotion_id;
  end if;

  update public.network_campaigns
  set status = case when p_decision = 'approved' then 'active' else 'rejected' end,
      reviewed_by = (select auth.uid()),
      review_notes = p_review_notes,
      reviewed_at = now()
  where id = p_campaign_id;

  return v_promotion_id;
end;
$$;

revoke all on function public.review_network_campaign(uuid,text,text) from public;
grant execute on function public.review_network_campaign(uuid,text,text) to authenticated;

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
  if p_event_type not in ('impression','organization_view','event_view','outbound_click','share','media_view') then
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
    outbound_clicks, shares, media_views
  ) values (
    p_organization_id,
    (now() at time zone 'UTC')::date,
    case when p_event_type = 'impression' then 1 else 0 end,
    case when p_event_type = 'organization_view' then 1 else 0 end,
    case when p_event_type = 'event_view' then 1 else 0 end,
    case when p_event_type = 'outbound_click' then 1 else 0 end,
    case when p_event_type = 'share' then 1 else 0 end,
    case when p_event_type = 'media_view' then 1 else 0 end
  )
  on conflict (organization_id, metric_date) do update set
    impressions = public.network_exposure_daily.impressions + excluded.impressions,
    organization_views = public.network_exposure_daily.organization_views + excluded.organization_views,
    event_views = public.network_exposure_daily.event_views + excluded.event_views,
    outbound_clicks = public.network_exposure_daily.outbound_clicks + excluded.outbound_clicks,
    shares = public.network_exposure_daily.shares + excluded.shares,
    media_views = public.network_exposure_daily.media_views + excluded.media_views,
    updated_at = now();
end;
$$;

revoke all on function public.record_network_exposure_event(uuid,text,text,uuid,uuid,uuid,text) from public;
grant execute on function public.record_network_exposure_event(uuid,text,text,uuid,uuid,uuid,text) to anon, authenticated;

commit;
