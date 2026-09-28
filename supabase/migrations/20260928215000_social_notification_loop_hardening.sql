begin;

-- Social notification loop hardening.
-- Keep the existing notification system and preferences, but align interaction
-- alerts with durable post permalinks, add repost/reply coverage, and prevent
-- repeated reaction/repost toggles from generating noisy duplicate alerts.

create index if not exists notifications_social_dedupe_idx
  on public.notifications(recipient_id, actor_id, type, link, created_at desc);

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  post_owner uuid;
  parent_owner uuid;
  actor_name text;
  post_link text;
begin
  select author_id into post_owner
  from public.posts
  where id=new.post_id;

  if new.parent_id is not null then
    select author_id into parent_owner
    from public.comments
    where id=new.parent_id;
  end if;

  select coalesce(display_name,username,'An RCL member') into actor_name
  from public.profiles
  where id=new.author_id;

  post_link := '/social/post/'||new.post_id;

  if post_owner is not null
     and post_owner<>new.author_id
     and coalesce((select comments from public.notification_preferences where profile_id=post_owner),true)
     and not exists (
       select 1 from public.blocks b
       where (b.blocker_id=post_owner and b.blocked_id=new.author_id)
          or (b.blocker_id=new.author_id and b.blocked_id=post_owner)
     ) then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(
      post_owner,
      new.author_id,
      'comment',
      'New comment',
      coalesce(actor_name,'An RCL member')||' commented on your post.',
      post_link
    );
  end if;

  if parent_owner is not null
     and parent_owner<>new.author_id
     and parent_owner is distinct from post_owner
     and coalesce((select comments from public.notification_preferences where profile_id=parent_owner),true)
     and not exists (
       select 1 from public.blocks b
       where (b.blocker_id=parent_owner and b.blocked_id=new.author_id)
          or (b.blocker_id=new.author_id and b.blocked_id=parent_owner)
     ) then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(
      parent_owner,
      new.author_id,
      'comment_reply',
      'New reply',
      coalesce(actor_name,'An RCL member')||' replied to your comment.',
      post_link
    );
  end if;

  return new;
end
$$;

revoke execute on function public.notify_comment() from public,anon,authenticated;

create or replace function public.notify_reaction()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  post_owner uuid;
  actor_name text;
  post_link text;
begin
  select author_id into post_owner
  from public.posts
  where id=new.post_id;

  if post_owner is null or post_owner=new.user_id then
    return new;
  end if;

  if not coalesce((select reactions from public.notification_preferences where profile_id=post_owner),true) then
    return new;
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.blocker_id=post_owner and b.blocked_id=new.user_id)
       or (b.blocker_id=new.user_id and b.blocked_id=post_owner)
  ) then
    return new;
  end if;

  post_link := '/social/post/'||new.post_id;

  -- Reaction rows can be deleted/reinserted when a member changes emoji. Keep
  -- that interaction visible without turning every toggle into a fresh alert.
  if exists (
    select 1
    from public.notifications n
    where n.recipient_id=post_owner
      and n.actor_id=new.user_id
      and n.type='reaction'
      and n.link=post_link
      and n.created_at > now()-interval '24 hours'
  ) then
    return new;
  end if;

  select coalesce(display_name,username,'An RCL member') into actor_name
  from public.profiles
  where id=new.user_id;

  insert into public.notifications(recipient_id,actor_id,type,title,body,link)
  values(
    post_owner,
    new.user_id,
    'reaction',
    'New reaction',
    coalesce(actor_name,'An RCL member')||' reacted to your post.',
    post_link
  );

  return new;
end
$$;

revoke execute on function public.notify_reaction() from public,anon,authenticated;

create or replace function public.notify_repost()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  post_owner uuid;
  actor_name text;
  post_link text;
begin
  select author_id into post_owner
  from public.posts
  where id=new.post_id;

  if post_owner is null or post_owner=new.profile_id then
    return new;
  end if;

  -- Reposts are another lightweight social reaction, so honor the member's
  -- existing reactions preference rather than introducing a hidden new toggle.
  if not coalesce((select reactions from public.notification_preferences where profile_id=post_owner),true) then
    return new;
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.blocker_id=post_owner and b.blocked_id=new.profile_id)
       or (b.blocker_id=new.profile_id and b.blocked_id=post_owner)
  ) then
    return new;
  end if;

  post_link := '/social/post/'||new.post_id;

  if exists (
    select 1
    from public.notifications n
    where n.recipient_id=post_owner
      and n.actor_id=new.profile_id
      and n.type='repost'
      and n.link=post_link
      and n.created_at > now()-interval '24 hours'
  ) then
    return new;
  end if;

  select coalesce(display_name,username,'An RCL member') into actor_name
  from public.profiles
  where id=new.profile_id;

  insert into public.notifications(recipient_id,actor_id,type,title,body,link)
  values(
    post_owner,
    new.profile_id,
    'repost',
    'Your post was reposted',
    coalesce(actor_name,'An RCL member')||' reposted your post.',
    post_link
  );

  return new;
end
$$;

revoke execute on function public.notify_repost() from public,anon,authenticated;

drop trigger if exists notify_repost_after_insert on public.post_reposts;
create trigger notify_repost_after_insert
after insert on public.post_reposts
for each row execute function public.notify_repost();

create or replace function public.notify_profile_wall_post()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  actor_name text;
begin
  if new.target_profile_id is null or new.target_profile_id=new.author_id then
    return new;
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.blocker_id=new.target_profile_id and b.blocked_id=new.author_id)
       or (b.blocker_id=new.author_id and b.blocked_id=new.target_profile_id)
  ) then
    return new;
  end if;

  select coalesce(display_name,username,'An RCL member') into actor_name
  from public.profiles
  where id=new.author_id;

  insert into public.notifications(recipient_id,actor_id,type,title,body,link)
  values(
    new.target_profile_id,
    new.author_id,
    'profile_post',
    case when new.is_automated then 'New official RCL activity' else 'New profile post' end,
    case when new.is_automated
      then coalesce(actor_name,'Rich City League')||' added a new official moment to your RCL identity.'
      else coalesce(actor_name,'An RCL member')||' posted on your timeline.'
    end,
    '/social/post/'||new.id
  );

  return new;
end
$$;

revoke execute on function public.notify_profile_wall_post() from public,anon,authenticated;

commit;
