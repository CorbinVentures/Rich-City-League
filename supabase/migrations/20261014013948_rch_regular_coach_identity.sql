-- RCH coach identity is OPTIONAL DATA ON A NORMAL RCH MEMBER ACCOUNT.
-- This is NOT a league-staff appointment, a standalone auth role, or a separate
-- public business listing. Users alone edit their coaching details.
create table if not exists public.rch_coach_identities (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 headline text not null default '',
 organization text not null default '',
 city text not null default '',
 years_experience integer,
 coaching_level text not null default '',
 specialties text[] not null default '{}',
 availability text not null default 'not_listed',
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint coach_headline_length check (char_length(headline)<=100),
 constraint coach_organization_length check (char_length(organization)<=120),
 constraint coach_city_length check (char_length(city)<=100),
 constraint coach_years_range check (years_experience is null or (years_experience between 0 and 65)),
 constraint coach_level_length check (char_length(coaching_level)<=90),
 constraint coach_specialties_limit check (coalesce(array_length(specialties,1),0)<=8 and array_to_string(specialties,' ') !~ '[<>]'),
 constraint coach_availability_valid check (availability in ('not_listed','open_to_opportunities','not_available'))
);
create index if not exists rch_coach_identities_published_city_idx on public.rch_coach_identities(published,city) where published = true;

alter table public.rch_coach_identities enable row level security;
-- Own account may see/edit the extension. Everyone else sees it only when
-- explicitly opted into discovery AND the underlying member profile is public.
create policy "coach_identity_read" on public.rch_coach_identities for select to anon,authenticated
using (
 profile_id = (select auth.uid())
 or (
  published = true
  and exists (
   select 1 from public.profiles p
   where p.id = profile_id and p.is_active = true and p.profile_visibility = 'public'
  )
 )
);
create policy "coach_identity_insert_self" on public.rch_coach_identities for insert to authenticated
with check (profile_id = (select auth.uid()));
create policy "coach_identity_update_self" on public.rch_coach_identities for update to authenticated
using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "coach_identity_delete_self" on public.rch_coach_identities for delete to authenticated
using (profile_id = (select auth.uid()));
grant select on public.rch_coach_identities to anon;
grant select,insert,update,delete on public.rch_coach_identities to authenticated;
