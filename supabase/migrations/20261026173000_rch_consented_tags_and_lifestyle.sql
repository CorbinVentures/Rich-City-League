begin;
-- Consented social credit/tag v1: an adult member can be requested as a player or creator
-- on a published social post. No automatic public tag, skill verification or creator payout.
create table public.rch_post_tag_requests (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 requester_id uuid not null references public.profiles(id) on delete cascade,
 tagged_profile_id uuid not null references public.profiles(id) on delete cascade,
 tag_kind text not null check (tag_kind in ('player','creator')),
 status text not null default 'pending' check (status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 unique(post_id,tagged_profile_id,tag_kind),
 check (requester_id<>tagged_profile_id),
 check ((status='pending' and decided_at is null) or (status<>'pending' and decided_at is not null))
);
create index rch_post_tags_target_queue on public.rch_post_tag_requests(tagged_profile_id,status,created_at desc);
create index rch_post_tags_post on public.rch_post_tag_requests(post_id,status);
alter table public.rch_post_tag_requests enable row level security;
revoke all on public.rch_post_tag_requests from public,anon,authenticated;
grant select on public.rch_post_tag_requests to anon,authenticated;
grant insert,update,delete on public.rch_post_tag_requests to authenticated;

-- Age eligibility is checked server-side; date_of_birth is not exposed to clients.
create function private.rch_can_request_adult_tag(p_target uuid)
returns boolean language sql stable security definer set search_path='' as $
  select (select auth.uid()) is not null
    and private.can_view_social_profile(p_target)
    and exists(select 1 from public.profiles p
      where p.id=p_target and p.is_active
        and p.date_of_birth is not null
        and p.date_of_birth <= (current_date-interval '18 years')::date)
$;
revoke all on function private.rch_can_request_adult_tag(uuid) from public,anon,authenticated;
grant execute on function private.rch_can_request_adult_tag(uuid) to authenticated;

-- Pending requests are visible only to their participants. Accepted tags are
-- shown only when the source post is currently published and readable under its own RLS.
create policy rch_tag_requests_read on public.rch_post_tag_requests
 for select to anon,authenticated using (
   requester_id=(select auth.uid()) or tagged_profile_id=(select auth.uid())
   or (
     status='accepted'
     and private.can_view_social_profile(tagged_profile_id)
     and exists(select 1 from public.posts p where p.id=post_id and p.status='published'::public.content_status)
   )
 );
create policy rch_tag_requests_create on public.rch_post_tag_requests
 for insert to authenticated with check (
   requester_id=(select auth.uid()) and status='pending' and decided_at is null
   and private.rch_can_request_adult_tag(tagged_profile_id)
   and exists(select 1 from public.posts p where p.id=post_id and p.author_id=(select auth.uid())
     and p.status='published'::public.content_status)
   -- No tags of minors or accounts with missing verified DOB in v1.
 );
create policy rch_tag_requests_decide on public.rch_post_tag_requests
 for update to authenticated
 using (tagged_profile_id=(select auth.uid()) and status='pending')
 with check (tagged_profile_id=(select auth.uid()) and status in ('accepted','declined'));
create policy rch_tag_requests_remove on public.rch_post_tag_requests
 for delete to authenticated using (
  requester_id=(select auth.uid()) or tagged_profile_id=(select auth.uid())
 );

-- Prevent mass requests and forged historical timestamps from browser callers.
-- This runs in the caller's RLS context and only counts their own rows.
create function private.rch_limit_tag_request_volume()
returns trigger language plpgsql security invoker set search_path='' as $
begin
 if (select auth.uid()) is null or new.requester_id is distinct from (select auth.uid()) then
   raise exception 'Only the post author can request tags' using errcode='42501';
 end if;
 if (select count(*) from public.rch_post_tag_requests t
     where t.requester_id=(select auth.uid()) and t.created_at > now()-interval '24 hours') >= 10 then
   raise exception 'Tag request limit reached; try again later' using errcode='42501';
 end if;
 new.created_at=now();
 new.decided_at=null;
 new.status='pending';
 return new;
end $;
revoke execute on function private.rch_limit_tag_request_volume() from public,anon,authenticated;
create trigger rch_limit_tag_request_volume
before insert on public.rch_post_tag_requests
for each row execute function private.rch_limit_tag_request_volume();

-- Immutable participant/source records and single-use consent transitions.
create function private.rch_guard_post_tag_decision()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.id is distinct from old.id or new.post_id is distinct from old.post_id
   or new.requester_id is distinct from old.requester_id
   or new.tagged_profile_id is distinct from old.tagged_profile_id
   or new.tag_kind is distinct from old.tag_kind
   or new.created_at is distinct from old.created_at then
   raise exception 'Cannot rewrite a tag request' using errcode='42501';
 end if;
 if (select auth.uid()) is distinct from old.tagged_profile_id
   or old.status<>'pending' or new.status not in ('accepted','declined') then
   raise exception 'Only the tagged member can decide a pending request' using errcode='42501';
 end if;
 new.decided_at=now();
 return new;
end $$;
revoke execute on function private.rch_guard_post_tag_decision() from public,anon,authenticated;
create trigger rch_guard_post_tag_decision before update on public.rch_post_tag_requests
for each row execute function private.rch_guard_post_tag_decision();

-- Topics are simple references to existing posts. No marketplace or duplicate media.
create table public.rch_post_topics (
 post_id uuid primary key references public.posts(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 topic text not null check (topic='kicks_fits'),
 created_at timestamptz not null default now()
);
create index rch_post_topics_discovery on public.rch_post_topics(topic,created_at desc);
alter table public.rch_post_topics enable row level security;
revoke all on public.rch_post_topics from public,anon,authenticated;
grant select on public.rch_post_topics to anon,authenticated;
grant insert,delete on public.rch_post_topics to authenticated;
create policy rch_post_topics_visible on public.rch_post_topics
for select to anon,authenticated using (
 exists(select 1 from public.posts p where p.id=post_id and p.author_id=author_id and p.status='published'::public.content_status)
);
create policy rch_post_topics_owner_insert on public.rch_post_topics
for insert to authenticated with check (
 author_id=(select auth.uid())
 and exists(select 1 from public.posts p where p.id=post_id and p.author_id=(select auth.uid())
   and p.status='published'::public.content_status)
);
create policy rch_post_topics_owner_delete on public.rch_post_topics
for delete to authenticated using (author_id=(select auth.uid()));

-- Prevent clients from moving a post topic to a different author ID via forged inserts.
comment on table public.rch_post_tag_requests is
 'Consented labels only: not official player evaluation or creator licensing; v1 excludes minors.';
comment on table public.rch_post_topics is
 'Lightweight social post categories; excludes product endorsements and commerce.';
commit;
