begin;

-- Profile badge showcase: owners may curate five real, already-earned location
-- collectibles. A pin cannot create or purchase an award.
create table public.rch_badge_showcase_pins (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 award_id uuid not null references public.rch_place_badge_awards(id) on delete cascade,
 slot smallint not null check(slot between 1 and 5),
 pinned_at timestamptz not null default now(),
 primary key(profile_id,award_id),
 unique(profile_id,slot)
);
create index rch_badge_pins_order on public.rch_badge_showcase_pins(profile_id,slot);
alter table public.rch_badge_showcase_pins enable row level security;
revoke all on public.rch_badge_showcase_pins from public,anon,authenticated;
grant select on public.rch_badge_showcase_pins to anon,authenticated;
grant insert,delete on public.rch_badge_showcase_pins to authenticated;
create policy rch_pins_visible on public.rch_badge_showcase_pins for select
to anon,authenticated using (
 profile_id=(select auth.uid())
 or exists(select 1 from public.profiles p where p.id=profile_id
  and p.is_active and not coalesce(p.is_system_account,false)
  and coalesce(p.profile_visibility,'public') not in ('private','only_me'))
);
create policy rch_pins_owner_add on public.rch_badge_showcase_pins for insert
to authenticated with check (
 profile_id=(select auth.uid())
 and exists(select 1 from public.rch_place_badge_awards a
  where a.id=award_id and a.profile_id=(select auth.uid()))
);
create policy rch_pins_owner_remove on public.rch_badge_showcase_pins for delete
to authenticated using (profile_id=(select auth.uid()));
comment on table public.rch_badge_showcase_pins is
 'Member-curated, max-five published profile highlights referencing verified badge award receipts; no minting.';
commit;
