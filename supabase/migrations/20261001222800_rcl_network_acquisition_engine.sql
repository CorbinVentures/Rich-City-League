-- RCL Network acquisition engine
-- Stages researched/imported organizations before publication and gives RCL an outreach CRM.

begin;

create table if not exists public.network_acquisition_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null check (char_length(trim(organization_name)) between 2 and 160),
  organization_type text not null default 'program'
    check (organization_type in ('league','tournament','program','club','team','media','creator','facility','training','other')),
  region text not null default 'central-virginia'
    check (region in ('central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','statewide','other')),
  city text,
  state text not null default 'VA',
  website_url text,
  instagram_url text,
  source_url text,
  source_label text,
  source_kind text not null default 'research'
    check (source_kind in ('manual','csv','research','referral')),
  stage_status text not null default 'staged'
    check (stage_status in ('staged','ready','published','duplicate','rejected')),
  outreach_status text not null default 'not-contacted'
    check (outreach_status in ('not-contacted','contacted','replied','claimed','verified','paid-prospect','closed')),
  contact_name text,
  contact_email text,
  contact_instagram text,
  notes text check (notes is null or char_length(notes) <= 5000),
  follow_up_at timestamptz,
  last_contacted_at timestamptz,
  matched_organization_id uuid references public.network_organizations(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (website_url is null or website_url = '' or website_url ~* '^https?://'),
  check (instagram_url is null or instagram_url = '' or instagram_url ~* '^https?://'),
  check (source_url is null or source_url = '' or source_url ~* '^https?://')
);

create index if not exists network_acquisition_candidates_stage_idx
  on public.network_acquisition_candidates(stage_status, outreach_status, created_at desc);
create index if not exists network_acquisition_candidates_followup_idx
  on public.network_acquisition_candidates(follow_up_at)
  where follow_up_at is not null and outreach_status not in ('claimed','verified','paid-prospect','closed');
create index if not exists network_acquisition_candidates_org_idx
  on public.network_acquisition_candidates(matched_organization_id)
  where matched_organization_id is not null;
create index if not exists network_acquisition_candidates_created_by_idx
  on public.network_acquisition_candidates(created_by)
  where created_by is not null;
create index if not exists network_acquisition_candidates_reviewed_by_idx
  on public.network_acquisition_candidates(reviewed_by)
  where reviewed_by is not null;
create index if not exists network_acquisition_candidates_name_idx
  on public.network_acquisition_candidates(lower(trim(organization_name)));

alter table public.network_acquisition_candidates enable row level security;
revoke all on table public.network_acquisition_candidates from anon, authenticated;
grant select, insert, update, delete on table public.network_acquisition_candidates to authenticated;

create policy "network acquisition admin read"
on public.network_acquisition_candidates for select
to authenticated using ((select public.is_admin()));

create policy "network acquisition admin insert"
on public.network_acquisition_candidates for insert
to authenticated with check ((select public.is_admin()));

create policy "network acquisition admin update"
on public.network_acquisition_candidates for update
to authenticated using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "network acquisition admin delete"
on public.network_acquisition_candidates for delete
to authenticated using ((select public.is_admin()));

drop trigger if exists network_acquisition_candidates_updated_at on public.network_acquisition_candidates;
create trigger network_acquisition_candidates_updated_at
before update on public.network_acquisition_candidates
for each row execute function public.set_updated_at();

create or replace function public.stage_network_acquisition_candidates(p_rows jsonb)
returns table(staged_count integer, duplicate_count integer, rejected_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_name text;
  v_type text;
  v_region text;
  v_city text;
  v_website text;
  v_instagram text;
  v_source_url text;
  v_source_label text;
  v_source_kind text;
  v_contact_name text;
  v_contact_email text;
  v_contact_instagram text;
  v_notes text;
  v_existing_org uuid;
  v_existing_candidate uuid;
  v_staged integer := 0;
  v_duplicates integer := 0;
  v_rejected integer := 0;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be a JSON array'; end if;
  if jsonb_array_length(p_rows) > 250 then raise exception 'imports are limited to 250 rows per batch'; end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_name := nullif(trim(v_row->>'organization_name'), '');
    v_type := coalesce(nullif(trim(v_row->>'organization_type'), ''), 'program');
    v_region := coalesce(nullif(trim(v_row->>'region'), ''), 'central-virginia');
    v_city := nullif(trim(v_row->>'city'), '');
    v_website := nullif(trim(v_row->>'website_url'), '');
    v_instagram := nullif(trim(v_row->>'instagram_url'), '');
    v_source_url := nullif(trim(v_row->>'source_url'), '');
    v_source_label := nullif(trim(v_row->>'source_label'), '');
    v_source_kind := coalesce(nullif(trim(v_row->>'source_kind'), ''), 'csv');
    v_contact_name := nullif(trim(v_row->>'contact_name'), '');
    v_contact_email := nullif(trim(v_row->>'contact_email'), '');
    v_contact_instagram := nullif(trim(v_row->>'contact_instagram'), '');
    v_notes := nullif(trim(v_row->>'notes'), '');

    if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 160
       or v_type not in ('league','tournament','program','club','team','media','creator','facility','training','other')
       or v_region not in ('central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','statewide','other')
       or v_source_kind not in ('manual','csv','research','referral')
       or (v_website is not null and v_website !~* '^https?://')
       or (v_instagram is not null and v_instagram !~* '^https?://')
       or (v_source_url is not null and v_source_url !~* '^https?://') then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    v_existing_org := null;
    select o.id into v_existing_org
    from public.network_organizations o
    where lower(trim(o.name)) = lower(v_name)
       or (v_website is not null and o.website_url is not null and lower(trim(o.website_url)) = lower(v_website))
    order by case when o.status = 'active' then 0 else 1 end, o.created_at
    limit 1;

    v_existing_candidate := null;
    select c.id into v_existing_candidate
    from public.network_acquisition_candidates c
    where lower(trim(c.organization_name)) = lower(v_name)
       or (v_website is not null and c.website_url is not null and lower(trim(c.website_url)) = lower(v_website))
    limit 1;

    if v_existing_candidate is not null then
      v_duplicates := v_duplicates + 1;
      continue;
    end if;

    insert into public.network_acquisition_candidates(
      organization_name, organization_type, region, city, state, website_url, instagram_url,
      source_url, source_label, source_kind, stage_status, outreach_status, contact_name,
      contact_email, contact_instagram, notes, matched_organization_id, created_by
    ) values (
      v_name, v_type, v_region, v_city, 'VA', v_website, v_instagram,
      v_source_url, v_source_label, v_source_kind,
      case when v_existing_org is not null then 'duplicate' else 'staged' end,
      'not-contacted', v_contact_name, v_contact_email, v_contact_instagram,
      v_notes, v_existing_org, (select auth.uid())
    );

    if v_existing_org is not null then v_duplicates := v_duplicates + 1;
    else v_staged := v_staged + 1;
    end if;
  end loop;

  return query select v_staged, v_duplicates, v_rejected;
end;
$$;

revoke all on function public.stage_network_acquisition_candidates(jsonb) from public, anon;
grant execute on function public.stage_network_acquisition_candidates(jsonb) to authenticated;

create or replace function public.publish_network_acquisition_candidate(p_candidate_id uuid)
returns table(organization_id uuid, organization_slug text, result text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_candidate public.network_acquisition_candidates%rowtype;
  v_existing public.network_organizations%rowtype;
  v_org_id uuid;
  v_slug text;
  v_base_slug text;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;

  select * into v_candidate
  from public.network_acquisition_candidates
  where id = p_candidate_id
  for update;

  if not found then raise exception 'acquisition candidate not found'; end if;
  if v_candidate.stage_status = 'rejected' then raise exception 'rejected candidates cannot be published'; end if;

  if v_candidate.matched_organization_id is not null then
    select * into v_existing from public.network_organizations where id = v_candidate.matched_organization_id;
    if found then
      update public.network_acquisition_candidates
      set stage_status = case when v_candidate.stage_status = 'published' then 'published' else 'duplicate' end,
          reviewed_by = (select auth.uid()), updated_at = now()
      where id = p_candidate_id;
      return query select v_existing.id, v_existing.slug, 'matched'::text;
      return;
    end if;
  end if;

  select * into v_existing
  from public.network_organizations o
  where lower(trim(o.name)) = lower(trim(v_candidate.organization_name))
     or (v_candidate.website_url is not null and o.website_url is not null
         and lower(trim(o.website_url)) = lower(trim(v_candidate.website_url)))
  order by case when o.status = 'active' then 0 else 1 end, o.created_at
  limit 1;

  if found then
    update public.network_acquisition_candidates
    set matched_organization_id = v_existing.id,
        stage_status = 'duplicate',
        reviewed_by = (select auth.uid()),
        updated_at = now()
    where id = p_candidate_id;
    return query select v_existing.id, v_existing.slug, 'matched'::text;
    return;
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(trim(v_candidate.organization_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug is null or v_base_slug = '' then v_base_slug := 'organization'; end if;
  v_slug := v_base_slug;
  if exists (select 1 from public.network_organizations where slug = v_slug) then
    v_slug := v_base_slug || '-' || substr(replace(p_candidate_id::text, '-', ''), 1, 6);
  end if;

  insert into public.network_organizations(
    slug, name, organization_type, region, city, state, website_url, instagram_url,
    network_tier, status, is_verified, is_featured, is_claimed
  ) values (
    v_slug, trim(v_candidate.organization_name), v_candidate.organization_type, v_candidate.region,
    nullif(trim(v_candidate.city), ''), coalesce(nullif(trim(v_candidate.state), ''), 'VA'),
    nullif(trim(v_candidate.website_url), ''), nullif(trim(v_candidate.instagram_url), ''),
    'network', 'active', false, false, false
  ) returning id into v_org_id;

  update public.network_acquisition_candidates
  set matched_organization_id = v_org_id,
      stage_status = 'published',
      reviewed_by = (select auth.uid()),
      published_at = now(),
      updated_at = now()
  where id = p_candidate_id;

  return query select v_org_id, v_slug, 'created'::text;
end;
$$;

revoke all on function public.publish_network_acquisition_candidate(uuid) from public, anon;
grant execute on function public.publish_network_acquisition_candidate(uuid) to authenticated;

commit;
