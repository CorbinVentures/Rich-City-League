-- RCL Network organization acquisition layer
-- Converts public organization interest into reviewable free listings and gives
-- verified operators a safe, field-limited way to maintain their public presence.

alter table public.network_partner_inquiries
  add column if not exists organization_type text not null default 'program'
    check (organization_type in ('league','tournament','program','club','team','media','creator','facility','training','other')),
  add column if not exists city text,
  add column if not exists instagram_url text,
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists converted_organization_id uuid references public.network_organizations(id) on delete set null,
  add column if not exists source text not null default 'partner-application'
    check (source in ('partner-application','directory-suggestion','admin-import'));

create index if not exists network_partner_inquiries_submitted_by_idx
  on public.network_partner_inquiries(submitted_by)
  where submitted_by is not null;

create index if not exists network_partner_inquiries_converted_org_idx
  on public.network_partner_inquiries(converted_organization_id)
  where converted_organization_id is not null;

create index if not exists network_organizations_type_status_idx
  on public.network_organizations(organization_type, status, region);

-- Keep public acquisition low-friction while preventing callers from smuggling
-- a conversion result or another user's identity through a direct insert.
drop policy if exists "partner inquiry public create" on public.network_partner_inquiries;
create policy "partner inquiry public create"
on public.network_partner_inquiries
for insert
to anon, authenticated
with check (
  status = 'new'
  and converted_organization_id is null
  and source in ('partner-application','directory-suggestion')
  and (submitted_by is null or submitted_by = (select auth.uid()))
);

-- Make the existing Data API contract explicit ahead of Supabase's permission
-- default changes. RLS remains the authorization layer.
grant insert on table public.network_partner_inquiries to anon, authenticated;
grant select, update, delete on table public.network_partner_inquiries to authenticated;
grant select on table public.network_organizations to anon, authenticated;
grant select on table public.network_organization_members to authenticated;

create or replace function public.convert_network_partner_inquiry(p_inquiry_id uuid)
returns table(organization_id uuid, organization_slug text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inquiry public.network_partner_inquiries%rowtype;
  v_existing public.network_organizations%rowtype;
  v_org_id uuid;
  v_slug text;
  v_base_slug text;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  select * into v_inquiry
  from public.network_partner_inquiries
  where id = p_inquiry_id
  for update;

  if not found then
    raise exception 'organization inquiry not found';
  end if;

  if v_inquiry.converted_organization_id is not null then
    return query
      select o.id, o.slug
      from public.network_organizations o
      where o.id = v_inquiry.converted_organization_id;
    return;
  end if;

  -- Reuse a matching listing rather than creating duplicate organization pages.
  select * into v_existing
  from public.network_organizations o
  where lower(trim(o.name)) = lower(trim(v_inquiry.organization_name))
     or (
       v_inquiry.website_url is not null
       and o.website_url is not null
       and lower(trim(o.website_url)) = lower(trim(v_inquiry.website_url))
     )
  order by case when o.status = 'active' then 0 else 1 end, o.created_at
  limit 1;

  if found then
    update public.network_partner_inquiries
    set converted_organization_id = v_existing.id,
        status = case when status = 'closed' then status else 'qualified' end,
        updated_at = now()
    where id = p_inquiry_id;

    return query select v_existing.id, v_existing.slug;
    return;
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(trim(v_inquiry.organization_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug is null or v_base_slug = '' then
    v_base_slug := 'organization';
  end if;
  v_slug := v_base_slug;

  if exists (select 1 from public.network_organizations where slug = v_slug) then
    v_slug := v_base_slug || '-' || substr(replace(p_inquiry_id::text, '-', ''), 1, 6);
  end if;

  insert into public.network_organizations(
    slug, name, organization_type, region, city, state,
    website_url, instagram_url, network_tier, status,
    is_verified, is_featured, is_claimed
  ) values (
    v_slug,
    trim(v_inquiry.organization_name),
    v_inquiry.organization_type,
    v_inquiry.region,
    nullif(trim(v_inquiry.city), ''),
    'VA',
    nullif(trim(v_inquiry.website_url), ''),
    nullif(trim(v_inquiry.instagram_url), ''),
    'network',
    'active',
    false,
    false,
    false
  )
  returning id into v_org_id;

  update public.network_partner_inquiries
  set converted_organization_id = v_org_id,
      status = 'qualified',
      updated_at = now()
  where id = p_inquiry_id;

  return query select v_org_id, v_slug;
end;
$$;

revoke all on function public.convert_network_partner_inquiry(uuid) from public;
grant execute on function public.convert_network_partner_inquiry(uuid) to authenticated;

create or replace function public.update_network_organization_profile(
  p_organization_id uuid,
  p_short_name text default null,
  p_description text default null,
  p_city text default null,
  p_website_url text default null,
  p_instagram_url text default null,
  p_facebook_url text default null,
  p_x_url text default null,
  p_youtube_url text default null,
  p_logo_url text default null,
  p_cover_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tier text;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if not public.can_manage_network_organization(p_organization_id) then
    raise exception 'organization manager access required';
  end if;

  select network_tier into v_tier
  from public.network_organizations
  where id = p_organization_id
  for update;

  if not found then
    raise exception 'organization not found';
  end if;

  if v_tier = 'flagship' and not public.is_admin() then
    raise exception 'flagship profile is managed by RCL';
  end if;

  if p_website_url is not null and trim(p_website_url) <> '' and p_website_url !~* '^https?://' then raise exception 'website URL must use http or https'; end if;
  if p_instagram_url is not null and trim(p_instagram_url) <> '' and p_instagram_url !~* '^https?://' then raise exception 'Instagram URL must use http or https'; end if;
  if p_facebook_url is not null and trim(p_facebook_url) <> '' and p_facebook_url !~* '^https?://' then raise exception 'Facebook URL must use http or https'; end if;
  if p_x_url is not null and trim(p_x_url) <> '' and p_x_url !~* '^https?://' then raise exception 'X URL must use http or https'; end if;
  if p_youtube_url is not null and trim(p_youtube_url) <> '' and p_youtube_url !~* '^https?://' then raise exception 'YouTube URL must use http or https'; end if;
  if p_logo_url is not null and trim(p_logo_url) <> '' and p_logo_url !~* '^https?://' then raise exception 'logo URL must use http or https'; end if;
  if p_cover_url is not null and trim(p_cover_url) <> '' and p_cover_url !~* '^https?://' then raise exception 'cover URL must use http or https'; end if;

  update public.network_organizations
  set short_name = nullif(trim(p_short_name), ''),
      description = nullif(trim(p_description), ''),
      city = nullif(trim(p_city), ''),
      website_url = nullif(trim(p_website_url), ''),
      instagram_url = nullif(trim(p_instagram_url), ''),
      facebook_url = nullif(trim(p_facebook_url), ''),
      x_url = nullif(trim(p_x_url), ''),
      youtube_url = nullif(trim(p_youtube_url), ''),
      logo_url = nullif(trim(p_logo_url), ''),
      cover_url = nullif(trim(p_cover_url), ''),
      updated_at = now()
  where id = p_organization_id;

  return p_organization_id;
end;
$$;

revoke all on function public.update_network_organization_profile(uuid,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.update_network_organization_profile(uuid,text,text,text,text,text,text,text,text,text,text) to authenticated;
