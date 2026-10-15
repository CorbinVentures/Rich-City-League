-- Private, adult-only Royaltee event workplans. No auto-publishing.
begin;
create table public.rcl_royaltee_event_work_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.rcl_royaltee_events(id) on delete cascade,
  template_key text not null check (length(template_key) between 1 and 120),
  kind text not null check (kind in ('ops','content')),
  day_offset integer not null check (day_offset between -30 and 7),
  priority text not null check (priority in ('critical','standard')),
  title text not null check (length(title) between 3 and 160),
  instructions text not null default '' check (length(instructions) <= 1200),
  owner_label text not null default '' check (length(owner_label) <= 120),
  status text not null default 'pending' check (status in ('pending','in_progress','blocked','complete','not_applicable')),
  notes text not null default '' check (length(notes) <= 2000),
  asset_url text not null default '' check (length(asset_url) <= 1200 and (asset_url = '' or asset_url ~ '^https://[^[:space:]]+$')),
  rights_verified boolean not null default false,
  editorial_approved boolean not null default false,
  posted_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint royaltee_work_item_unique unique(event_id,template_key),
  constraint royaltee_content_release_gate check (
    (kind='ops' and not rights_verified and not editorial_approved and posted_at is null)
    or (kind='content' and (not editorial_approved or rights_verified)
      and (posted_at is null or (rights_verified and editorial_approved)))
  ),
  constraint royaltee_na_note check (status <> 'not_applicable' or length(trim(notes)) >= 4)
);
create index royaltee_work_event_due_idx on public.rcl_royaltee_event_work_items(event_id,day_offset,kind);
alter table public.rcl_royaltee_event_work_items enable row level security;
create policy "royaltee event workflow manager read"
  on public.rcl_royaltee_event_work_items for select to authenticated
  using (public.can_manage_royaltee());
create policy "royaltee event workflow manager insert"
  on public.rcl_royaltee_event_work_items for insert to authenticated
  with check (
    public.can_manage_royaltee()
    and exists (select 1 from public.rcl_royaltee_events e where e.id=event_id and e.min_age>=18)
  );
create policy "royaltee event workflow manager update"
  on public.rcl_royaltee_event_work_items for update to authenticated
  using (public.can_manage_royaltee()) with check (public.can_manage_royaltee());
revoke all on public.rcl_royaltee_event_work_items from public,anon,authenticated;
grant select,insert on public.rcl_royaltee_event_work_items to authenticated;
grant update(owner_label,status,notes,asset_url,rights_verified,editorial_approved,posted_at,updated_by,updated_at)
  on public.rcl_royaltee_event_work_items to authenticated;
comment on table public.rcl_royaltee_event_work_items is
  'Private adult Royaltee preparation and content assignments; editing publication status does not publish to RCH.';
commit;
