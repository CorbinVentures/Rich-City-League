-- RCL Network acquisition engine
-- Stages public-source prospects before publication and tracks outreach through claim/verification.

create table if not exists public.network_acquisition_prospects (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  organization_type text not null default 'program' check (organization_type in ('league','tournament','program','club','team','media','creator','facility','training','other')),
  region text not null default 'central-virginia' check (region in ('central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','statewide','other')),
  city text,
  state text not null default 'VA' check (state = 'VA'),
  description text check (description is null or char_length(description) <= 2000),
  website_url text,
  instagram_url text,
  facebook_url text,
  x_url text,
  youtube_url text,
  source_url text not null check (source_url ~* '^https?://'),
  source_label text,
  source_checked_at timestamptz not null default now(),
  contact_name text,
  contact_email text,
  contact_instagram_url text,
  notes text check (notes is null or char_length(notes) <= 5000),
  status text not null default 'staged' check (status in ('staged','ready','published','duplicate','archived')),
  outreach_status text not null default 'not-contacted' check (outreach_status in ('not-contacted','queued','contacted','replied','interested','claim-sent','claimed','verified','paid-prospect','not-interested')),
  last_contacted_at timestamptz,
  follow_up_at timestamptz,
  published_organization_id uuid references public.network_organizations(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.network_acquisition_prospects enable row level security;

create index if not exists network_acq_prospects_name_idx on public.network_acquisition_prospects (lower(trim(organization_name)));
create index if not exists network_acq_prospects_website_idx on public.network_acquisition_prospects (lower(trim(website_url))) where website_url is not null;
create index if not exists network_acq_prospects_status_idx on public.network_acquisition_prospects (status, outreach_status, region, created_at desc);
create index if not exists network_acq_prospects_follow_up_idx on public.network_acquisition_prospects (follow_up_at) where follow_up_at is not null;
create index if not exists network_acq_prospects_published_org_idx on public.network_acquisition_prospects (published_organization_id) where published_organization_id is not null;
create index if not exists network_acq_prospects_created_by_idx on public.network_acquisition_prospects (created_by) where created_by is not null;
create index if not exists network_acq_prospects_updated_by_idx on public.network_acquisition_prospects (updated_by) where updated_by is not null;

create trigger network_acquisition_prospects_set_updated_at
before update on public.network_acquisition_prospects
for each row execute function public.set_updated_at();

create policy "network acquisition prospects admin read"
on public.network_acquisition_prospects for select to authenticated
using ((select public.is_admin()));

create policy "network acquisition prospects admin insert"
on public.network_acquisition_prospects for insert to authenticated
with check ((select public.is_admin()));

create policy "network acquisition prospects admin update"
on public.network_acquisition_prospects for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "network acquisition prospects admin delete"
on public.network_acquisition_prospects for delete to authenticated
using ((select public.is_admin()));

revoke all on table public.network_acquisition_prospects from anon;
grant select, insert, update, delete on table public.network_acquisition_prospects to authenticated;
grant select, insert, update, delete on table public.network_acquisition_prospects to service_role;

create or replace function public.import_network_acquisition_prospects(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_name text;
  v_type text;
  v_region text;
  v_website text;
  v_source text;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_existing boolean;
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be a JSON array'; end if;
  if jsonb_array_length(p_rows) > 100 then raise exception 'maximum 100 prospects per import'; end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_name := trim(coalesce(v_row->>'organization_name', v_row->>'name', ''));
    v_type := coalesce(nullif(trim(v_row->>'organization_type'), ''), 'program');
    v_region := coalesce(nullif(trim(v_row->>'region'), ''), 'central-virginia');
    v_website := nullif(trim(v_row->>'website_url'), '');
    v_source := trim(coalesce(v_row->>'source_url', ''));

    if char_length(v_name) < 2 then raise exception 'organization_name is required'; end if;
    if v_type not in ('league','tournament','program','club','team','media','creator','facility','training','other') then raise exception 'invalid organization_type for %', v_name; end if;
    if v_region not in ('central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','statewide','other') then raise exception 'invalid region for %', v_name; end if;
    if v_source !~* '^https?://' then raise exception 'source_url must use http or https for %', v_name; end if;
    if v_website is not null and v_website !~* '^https?://' then raise exception 'website_url must use http or https for %', v_name; end if;

    select exists(
      select 1 from public.network_organizations o
      where lower(trim(o.name)) = lower(v_name)
         or (v_website is not null and o.website_url is not null and lower(trim(o.website_url)) = lower(v_website))
      union all
      select 1 from public.network_acquisition_prospects p
      where p.status <> 'archived'
        and (lower(trim(p.organization_name)) = lower(v_name)
          or (v_website is not null and p.website_url is not null and lower(trim(p.website_url)) = lower(v_website)))
    ) into v_existing;

    if v_existing then
      v_duplicates := v_duplicates + 1;
      continue;
    end if;

    insert into public.network_acquisition_prospects(
      organization_name, organization_type, region, city, description,
      website_url, instagram_url, facebook_url, x_url, youtube_url,
      source_url, source_label, source_checked_at, contact_name, contact_email,
      contact_instagram_url, notes, status, outreach_status, created_by, updated_by
    ) values (
      v_name, v_type, v_region, nullif(trim(v_row->>'city'), ''), nullif(trim(v_row->>'description'), ''),
      v_website, nullif(trim(v_row->>'instagram_url'), ''), nullif(trim(v_row->>'facebook_url'), ''), nullif(trim(v_row->>'x_url'), ''), nullif(trim(v_row->>'youtube_url'), ''),
      v_source, nullif(trim(v_row->>'source_label'), ''), coalesce(nullif(v_row->>'source_checked_at','')::timestamptz, now()), nullif(trim(v_row->>'contact_name'), ''), nullif(trim(v_row->>'contact_email'), ''),
      nullif(trim(v_row->>'contact_instagram_url'), ''), nullif(trim(v_row->>'notes'), ''), coalesce(nullif(trim(v_row->>'status'), ''), 'staged'), coalesce(nullif(trim(v_row->>'outreach_status'), ''), 'not-contacted'), (select auth.uid()), (select auth.uid())
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'duplicates', v_duplicates, 'total', jsonb_array_length(p_rows));
end;
$$;

revoke all on function public.import_network_acquisition_prospects(jsonb) from public, anon;
grant execute on function public.import_network_acquisition_prospects(jsonb) to authenticated;

create or replace function public.publish_network_acquisition_prospect(p_prospect_id uuid)
returns table(organization_id uuid, organization_slug text, reused_existing boolean)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_prospect public.network_acquisition_prospects%rowtype;
  v_existing public.network_organizations%rowtype;
  v_org_id uuid;
  v_slug text;
  v_base_slug text;
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'admin access required';
  end if;

  select * into v_prospect from public.network_acquisition_prospects where id = p_prospect_id for update;
  if not found then raise exception 'prospect not found'; end if;

  if v_prospect.published_organization_id is not null then
    return query select o.id, o.slug, true from public.network_organizations o where o.id = v_prospect.published_organization_id;
    return;
  end if;

  select * into v_existing from public.network_organizations o
  where lower(trim(o.name)) = lower(trim(v_prospect.organization_name))
     or (v_prospect.website_url is not null and o.website_url is not null and lower(trim(o.website_url)) = lower(trim(v_prospect.website_url)))
  order by case when o.status='active' then 0 else 1 end, o.created_at
  limit 1;

  if found then
    update public.network_acquisition_prospects
    set published_organization_id=v_existing.id, status='duplicate', updated_by=(select auth.uid())
    where id=p_prospect_id;
    return query select v_existing.id, v_existing.slug, true;
    return;
  end if;

  if v_prospect.status not in ('ready','staged') then raise exception 'prospect is not publishable in its current status'; end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(trim(v_prospect.organization_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug is null or v_base_slug='' then v_base_slug := 'organization'; end if;
  v_slug := v_base_slug;
  if exists(select 1 from public.network_organizations where slug=v_slug) then
    v_slug := v_base_slug || '-' || substr(replace(p_prospect_id::text,'-',''),1,6);
  end if;

  insert into public.network_organizations(
    slug,name,description,organization_type,region,city,state,
    website_url,instagram_url,facebook_url,x_url,youtube_url,
    network_tier,status,is_verified,is_featured,is_claimed
  ) values (
    v_slug,trim(v_prospect.organization_name),nullif(trim(v_prospect.description),''),v_prospect.organization_type,v_prospect.region,nullif(trim(v_prospect.city),''),'VA',
    nullif(trim(v_prospect.website_url),''),nullif(trim(v_prospect.instagram_url),''),nullif(trim(v_prospect.facebook_url),''),nullif(trim(v_prospect.x_url),''),nullif(trim(v_prospect.youtube_url),''),
    'network','active',false,false,false
  ) returning id into v_org_id;

  update public.network_acquisition_prospects
  set published_organization_id=v_org_id,status='published',updated_by=(select auth.uid())
  where id=p_prospect_id;

  return query select v_org_id,v_slug,false;
end;
$$;

revoke all on function public.publish_network_acquisition_prospect(uuid) from public, anon;
grant execute on function public.publish_network_acquisition_prospect(uuid) to authenticated;
