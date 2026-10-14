-- Royaltee is the official RCL cheer and step partner, but its youth activity
-- is never published through this 18+ RCH integration.
begin;

insert into public.network_organizations
  (slug,name,short_name,description,organization_type,region,city,state,
   is_verified,verification_label,network_tier,is_featured,status)
values
  ('royaltee-steppas','Royaltee Steppas & Cheerleading','Royaltee',
   'Official Rich City League cheer and step partner. Explore its adult (18+) performances and member opportunities.',
   'program','central-virginia','Richmond','VA',true,'Official Rich City League Partner',
   'premier',true,'active')
on conflict (slug) do nothing;

create or replace function public.can_manage_royaltee()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(public.is_admin(),false) or exists (
    select 1 from public.network_organization_members m
    join public.network_organizations o on o.id=m.organization_id
    where o.slug='royaltee-steppas'
      and m.profile_id=(select auth.uid())
      and m.status='active'
      and m.member_role in ('owner','manager')
  );
$$;
revoke all on function public.can_manage_royaltee() from public;
grant execute on function public.can_manage_royaltee() to anon,authenticated;

create table if not exists public.rcl_royaltee_program (
  slug text primary key default 'royaltee-steppas' check (slug='royaltee-steppas'),
  headline text not null default 'Bring the energy. Own the floor.',
  about text not null default 'Royaltee Steppas & Cheerleading is the official Rich City League cheer and step partner. Adult performers bring energy to game day, community performances, and the league experience.',
  registration_note text not null default 'Contact Royaltee for current 18+ cheer and step opportunities, tryout details, and availability.',
  contact_email text not null default 'royalteesteppas@gmail.com',
  contact_phone text not null default '804-613-9199',
  registration_open boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint royaltee_program_lengths check (
    char_length(headline)<=160 and char_length(about)<=2000 and
    char_length(registration_note)<=1500 and char_length(contact_email)<=320 and char_length(contact_phone)<=40
  )
);
insert into public.rcl_royaltee_program(slug) values('royaltee-steppas') on conflict do nothing;
alter table public.rcl_royaltee_program enable row level security;
create policy "royaltee_program_public" on public.rcl_royaltee_program for select to anon,authenticated using (true);
create policy "royaltee_program_manager_update" on public.rcl_royaltee_program for update to authenticated
using (public.can_manage_royaltee()) with check (public.can_manage_royaltee());
revoke all on public.rcl_royaltee_program from anon,authenticated;
grant select on public.rcl_royaltee_program to anon,authenticated;
grant update(headline,about,registration_note,contact_email,contact_phone,registration_open,updated_at)
  on public.rcl_royaltee_program to authenticated;

create table if not exists public.rcl_royaltee_cheer_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  headline text not null default '',
  discipline text not null default 'both' check (discipline in ('cheer','step','both')),
  years_experience integer check (years_experience between 0 and 60),
  availability text not null default 'available' check (availability in ('available','not_available')),
  published boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint royaltee_headline_length check (char_length(headline)<=120)
);
create index if not exists royaltee_cheer_status_idx on public.rcl_royaltee_cheer_profiles(status,published);
alter table public.rcl_royaltee_cheer_profiles enable row level security;
create policy "royaltee_cheer_select" on public.rcl_royaltee_cheer_profiles for select to anon,authenticated
using (
  profile_id=(select auth.uid()) or public.can_manage_royaltee()
  or (
    status='approved' and published=true
    and exists (
      select 1 from public.profiles p where p.id=profile_id
      and p.is_active=true and p.profile_visibility='public'
      and p.date_of_birth is not null and p.date_of_birth <= (current_date - interval '18 years')::date
    )
  )
);
create policy "royaltee_cheer_insert" on public.rcl_royaltee_cheer_profiles for insert to authenticated
with check (
  profile_id=(select auth.uid()) and status='pending'
  and reviewed_by is null and reviewed_at is null
  and exists (
    select 1 from public.profiles p where p.id=profile_id
    and p.onboarding_complete=true
    and p.date_of_birth is not null and p.date_of_birth <= (current_date - interval '18 years')::date
  )
);
create policy "royaltee_cheer_self_update" on public.rcl_royaltee_cheer_profiles for update to authenticated
using (profile_id=(select auth.uid()))
with check (
  profile_id=(select auth.uid())
  and exists (
    select 1 from public.profiles p where p.id=profile_id and p.onboarding_complete=true
    and p.date_of_birth is not null and p.date_of_birth <= (current_date - interval '18 years')::date
  )
);
revoke all on public.rcl_royaltee_cheer_profiles from anon,authenticated;
grant select on public.rcl_royaltee_cheer_profiles to anon,authenticated;
grant insert(profile_id,headline,discipline,years_experience,availability,published)
  on public.rcl_royaltee_cheer_profiles to authenticated;
grant update(headline,discipline,years_experience,availability,published,updated_at)
  on public.rcl_royaltee_cheer_profiles to authenticated;

create or replace function public.review_royaltee_cheer_profile(p_profile_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.can_manage_royaltee() then raise exception 'Not authorized'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'Invalid review status'; end if;
  update public.rcl_royaltee_cheer_profiles c
  set status=p_status,
      reviewed_at=case when p_status='pending' then null else now() end,
      reviewed_by=case when p_status='pending' then null else auth.uid() end,
      updated_at=now()
  where c.profile_id=p_profile_id
    and exists (
      select 1 from public.profiles p where p.id=c.profile_id
      and p.date_of_birth is not null and p.date_of_birth <= (current_date - interval '18 years')::date
    );
  if not found then raise exception 'No eligible adult profile found'; end if;
end; $$;
revoke all on function public.review_royaltee_cheer_profile(uuid,text) from public;
grant execute on function public.review_royaltee_cheer_profile(uuid,text) to authenticated;

create table if not exists public.rcl_royaltee_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description)<=1500),
  event_type text not null default 'performance' check (event_type in ('tryout','rehearsal','game_day','performance','community')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '' check (char_length(location)<=180),
  min_age integer not null default 18 check (min_age>=18),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint royaltee_event_time check(ends_at is null or ends_at>=starts_at)
);
create index if not exists royaltee_events_calendar on public.rcl_royaltee_events(status,starts_at);
alter table public.rcl_royaltee_events enable row level security;
create policy "royaltee_adult_event_read" on public.rcl_royaltee_events for select to anon,authenticated
using ((status='published' and min_age>=18) or public.can_manage_royaltee());
create policy "royaltee_adult_event_insert" on public.rcl_royaltee_events for insert to authenticated
with check (public.can_manage_royaltee() and min_age>=18);
create policy "royaltee_adult_event_update" on public.rcl_royaltee_events for update to authenticated
using (public.can_manage_royaltee()) with check (public.can_manage_royaltee() and min_age>=18);
revoke all on public.rcl_royaltee_events from anon,authenticated;
grant select on public.rcl_royaltee_events to anon,authenticated;
grant insert,update on public.rcl_royaltee_events to authenticated;
commit;
