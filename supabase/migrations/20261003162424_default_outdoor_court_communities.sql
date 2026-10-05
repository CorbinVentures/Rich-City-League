begin;

alter table public.communities
  drop constraint if exists communities_community_type_check;

alter table public.communities
  add constraint communities_community_type_check
  check (community_type in ('league','division','team','fan','player','coach','parent','tournament','event','court','general'));

alter table public.communities
  add column if not exists location_slug text references public.basketball_locations(slug) on update cascade on delete set null,
  add column if not exists is_system_community boolean not null default false;

create unique index if not exists communities_location_slug_unique
  on public.communities(location_slug)
  where location_slug is not null;

create index if not exists communities_type_created_idx
  on public.communities(community_type, created_at desc);

create or replace function public.court_community_display_name(location_name text)
returns text
language sql
immutable
set search_path=public
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(location_name,''), '\\s+Arts\\s*&\\s*Community Center$', '', 'i'),
          '\\s+Community Center$', '', 'i'
        ),
        '\\s+(Playground|Sports Complex|Recreation Area)$', '', 'i'
      ),
      '\\s+Park$', '', 'i'
    )
  );
$$;

create or replace function public.sync_basketball_location_community()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  system_profile_id uuid;
  display_base text;
  community_name text;
  community_slug text;
  community_description text;
begin
  if new.is_active is distinct from true
     or new.venue_type <> 'outdoor'
     or new.access_type <> 'public' then
    return new;
  end if;

  select id into system_profile_id
  from public.profiles
  where is_system_account=true
    and system_account_key='rcl'
    and is_active=true
  limit 1;

  if system_profile_id is null then
    return new;
  end if;

  display_base := nullif(public.court_community_display_name(new.name), '');
  if display_base is null then display_base := new.name; end if;
  community_name := display_base || ' Community';
  community_slug := new.slug || '-community';
  community_description := 'The RCL basketball community for ' || new.name || ' in ' || new.locality ||
    ', Virginia. Connect with players, organize runs, share court updates, highlights and local hoops conversation.';

  update public.communities
  set
    name=community_name,
    description=community_description,
    community_type='court',
    privacy='public',
    is_system_community=true,
    updated_at=now()
  where location_slug=new.slug
    and is_system_community=true;

  if found then return new; end if;

  insert into public.communities(
    name,slug,description,community_type,privacy,created_by,location_slug,is_system_community
  )
  values(
    community_name,community_slug,community_description,'court','public',
    system_profile_id,new.slug,true
  )
  on conflict(slug) do nothing;

  return new;
end;
$$;

revoke execute on function public.sync_basketball_location_community() from public,anon,authenticated;

drop trigger if exists basketball_location_default_community on public.basketball_locations;
create trigger basketball_location_default_community
after insert or update of name,slug,locality,venue_type,access_type,is_active
on public.basketball_locations
for each row execute function public.sync_basketball_location_community();

with rcl_profile as (
  select id
  from public.profiles
  where is_system_account=true
    and system_account_key='rcl'
    and is_active=true
  limit 1
),
eligible as (
  select
    b.slug as location_slug,
    coalesce(nullif(public.court_community_display_name(b.name),''),b.name) || ' Community' as community_name,
    b.slug || '-community' as community_slug,
    'The RCL basketball community for ' || b.name || ' in ' || b.locality ||
      ', Virginia. Connect with players, organize runs, share court updates, highlights and local hoops conversation.' as community_description
  from public.basketball_locations b
  where b.is_active=true
    and b.venue_type='outdoor'
    and b.access_type='public'
)
insert into public.communities(
  name,slug,description,community_type,privacy,created_by,location_slug,is_system_community
)
select
  e.community_name,e.community_slug,e.community_description,'court','public',
  p.id,e.location_slug,true
from eligible e
cross join rcl_profile p
where not exists (
  select 1 from public.communities c where c.location_slug=e.location_slug
)
and not exists (
  select 1 from public.communities c where c.slug=e.community_slug
);

comment on column public.communities.location_slug is
  'Optional verified basketball location linked to a place-based court community.';
comment on column public.communities.is_system_community is
  'True for RCL-managed default communities such as verified outdoor court communities.';

commit;
