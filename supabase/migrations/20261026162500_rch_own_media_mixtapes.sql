begin;

-- RCH Mixtapes v1: owner-authored, published social clips only.
-- A playlist holds post IDs, never duplicated video bytes, stats or reputation awards.
-- Cross-creator licensing and player tagging are NOT enabled by this migration.
create table if not exists public.rch_mixtapes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 80),
  status text not null default 'draft' check (status in ('draft','published')),
  rights_attested_at timestamptz,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint rch_mixtapes_publish_attestation check (
    status <> 'published' or (rights_attested_at is not null and published_at is not null)
  )
);
create index if not exists rch_mixtapes_owner_recent on public.rch_mixtapes(owner_id,created_at desc);
create index if not exists rch_mixtapes_published_recent on public.rch_mixtapes(published_at desc) where status='published';

create table if not exists public.rch_mixtape_items (
  mixtape_id uuid not null references public.rch_mixtapes(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  sort_order smallint not null check (sort_order between 1 and 12),
  added_at timestamptz not null default now(),
  primary key(mixtape_id,post_id),
  unique(mixtape_id,sort_order)
);
create index if not exists rch_mixtape_items_post on public.rch_mixtape_items(post_id);

alter table public.rch_mixtapes enable row level security;
alter table public.rch_mixtape_items enable row level security;
revoke all on public.rch_mixtapes,public.rch_mixtape_items from public,anon,authenticated;
grant select on public.rch_mixtapes,public.rch_mixtape_items to anon,authenticated;
grant insert,update,delete on public.rch_mixtapes to authenticated;
grant insert,delete on public.rch_mixtape_items to authenticated;

create policy rch_mixtape_visible on public.rch_mixtapes
for select to anon,authenticated using (
  owner_id=(select auth.uid())
  or (status='published' and private.can_view_social_profile(owner_id))
);
create policy rch_mixtape_owner_insert on public.rch_mixtapes
for insert to authenticated with check (
  owner_id=(select auth.uid()) and status='draft' and published_at is null
);
create policy rch_mixtape_owner_update on public.rch_mixtapes
for update to authenticated
using (owner_id=(select auth.uid()))
with check (owner_id=(select auth.uid()));
create policy rch_mixtape_owner_delete on public.rch_mixtapes
for delete to authenticated using (owner_id=(select auth.uid()));

-- Check source visibility on every read, so revoked/deleted/unpublished posts
-- stop appearing in public playlists without duplicating a media asset.
create policy rch_mixtape_items_visible on public.rch_mixtape_items
for select to anon,authenticated using (
  exists (
    select 1
    from public.rch_mixtapes m
    join public.posts p on p.id=post_id
    where m.id=mixtape_id
      and p.author_id=m.owner_id
      and p.status='published'::public.content_status
      and (m.owner_id=(select auth.uid())
        or (m.status='published' and private.can_view_social_profile(m.owner_id)))
  )
);

-- Only published, personally authored media can be used. The existing
-- post RLS determines if the source is readable to the current visitor.
create policy rch_mixtape_items_owner_insert on public.rch_mixtape_items
for insert to authenticated with check (
  exists (
    select 1 from public.rch_mixtapes m
    join public.posts p on p.id=post_id
    where m.id=mixtape_id and m.owner_id=(select auth.uid())
      and m.status='draft'
      and p.author_id=(select auth.uid())
      and p.status='published'::public.content_status
      and case when jsonb_typeof(p.media_urls)='array' then exists (
        select 1 from jsonb_array_elements_text(p.media_urls) as media(url)
        where media.url ~* ('^https://[^[:space:]]+/storage/v1/object/public/media/' ||
          (select auth.uid())::text || '/posts/[^[:space:]]+[.](mp4|webm|mov|m4v|ogv)([?].*)?$')
      ) else false end
  )
);
create policy rch_mixtape_items_owner_delete on public.rch_mixtape_items
for delete to authenticated using (
  exists (
    select 1 from public.rch_mixtapes m
    where m.id=mixtape_id and m.owner_id=(select auth.uid())
  )
);

-- Keep public release honest if a client bypasses the UI.
-- Prevent changing ownership or falsifying attestation/publication timestamps.
create or replace function private.rch_guard_mixtape_publication()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if new.owner_id is distinct from old.owner_id
      or new.created_at is distinct from old.created_at
      or new.rights_attested_at is distinct from old.rights_attested_at
    then raise exception 'Mixtape identity and attestation cannot be reassigned' using errcode='42501'; end if;
    if old.status='published' and new.status <> 'published' then
      raise exception 'Use the delete operation to withdraw a published mixtape' using errcode='42501';
    end if;
    if old.status='published' and new.published_at is distinct from old.published_at then
      raise exception 'Mixtape publication time cannot be rewritten' using errcode='42501';
    end if;
    if old.status='draft' and new.status='published' then
      if new.rights_attested_at is null then
        raise exception 'Media rights attestation required' using errcode='42501';
      end if;
      if not exists (select 1 from public.rch_mixtape_items i where i.mixtape_id=new.id) then
        raise exception 'Add at least one owned, published clip before sharing';
      end if;
      new.published_at=now();
    end if;
  end if;
  new.updated_at=now();
  return new;
end $$;
revoke execute on function private.rch_guard_mixtape_publication() from public,anon,authenticated;
create trigger rch_guard_mixtape_publication
before update on public.rch_mixtapes
for each row execute function private.rch_guard_mixtape_publication();

-- Single transaction: all source clips validated, written, and published
-- together. Any failure rolls back the entire new mixtape.
create or replace function public.rch_publish_own_mixtape(
  p_title text, p_post_ids uuid[], p_rights_confirmed boolean default false
)
returns uuid language plpgsql security invoker set search_path='' as $$
declare
  v_owner uuid := (select auth.uid());
  v_mix uuid;
  v_post uuid;
  v_position integer;
  v_length integer := cardinality(p_post_ids);
begin
  if v_owner is null then raise exception 'Sign in to create a mixtape' using errcode='42501'; end if;
  if not coalesce(p_rights_confirmed,false) then
    raise exception 'Confirm you have rights to publish the selected clips' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_title,''))) not between 3 and 80 then
    raise exception 'Choose a title between 3 and 80 characters';
  end if;
  if p_post_ids is null or v_length not between 1 and 12 then
    raise exception 'Choose 1 to 12 published clips';
  end if;
  if (select count(distinct x.post_id) from unnest(p_post_ids) as x(post_id)) <> v_length then
    raise exception 'Each clip may appear only once';
  end if;
  if not exists (select 1 from public.profiles
       where id=v_owner and is_active=true and not coalesce(is_system_account,false)) then
    raise exception 'Active member account required' using errcode='42501';
  end if;
  insert into public.rch_mixtapes(owner_id,title,status,rights_attested_at)
    values(v_owner,btrim(p_title),'draft',now()) returning id into v_mix;
  for v_post,v_position in
    select ids.post_id,ids.position::integer
    from unnest(p_post_ids) with ordinality ids(post_id,position)
  loop
    if v_post is null then raise exception 'Invalid post reference'; end if;
    insert into public.rch_mixtape_items(mixtape_id,post_id,sort_order)
      values(v_mix,v_post,v_position);
  end loop;
  update public.rch_mixtapes set status='published' where id=v_mix;
  return v_mix;
end $$;
revoke execute on function public.rch_publish_own_mixtape(text,uuid[],boolean) from public,anon,authenticated;
grant execute on function public.rch_publish_own_mixtape(text,uuid[],boolean) to authenticated;

comment on table public.rch_mixtapes is
  'Playlist references only; RCH TV licensing, third-party clips and tagged-player appearances are excluded in v1.';

commit;
