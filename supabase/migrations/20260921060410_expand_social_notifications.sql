alter table public.notification_preferences
 add column if not exists email_enabled boolean not null default true,
 add column if not exists email_messages boolean not null default true,
 add column if not exists email_social boolean not null default true,
 add column if not exists email_league boolean not null default true;

create or replace function public.notify_follow() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.follower_id<>new.following_id then insert into public.notifications(recipient_id,actor_id,type,title,body,link) select new.following_id,new.follower_id,'follow','New follower',coalesce(p.display_name,p.username,'An RCL member')||' followed you.','/social/profile/'||new.follower_id from public.profiles p where p.id=new.follower_id; end if; return new; end $$;
drop trigger if exists notify_follow_after_insert on public.follows;
create trigger notify_follow_after_insert after insert on public.follows for each row execute function public.notify_follow();

create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; begin select author_id into owner from public.posts where id=new.post_id; if owner is not null and owner<>new.author_id and coalesce((select comments from public.notification_preferences where profile_id=owner),true) then insert into public.notifications(recipient_id,actor_id,type,title,body,link) select owner,new.author_id,'comment','New comment',coalesce(p.display_name,p.username,'An RCL member')||' commented on your post.','/social#post-'||new.post_id from public.profiles p where p.id=new.author_id; end if; return new; end $$;
drop trigger if exists notify_comment_after_insert on public.comments;
create trigger notify_comment_after_insert after insert on public.comments for each row execute function public.notify_comment();

create or replace function public.notify_reaction() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; begin select author_id into owner from public.posts where id=new.post_id; if owner is not null and owner<>new.profile_id and coalesce((select reactions from public.notification_preferences where profile_id=owner),true) then insert into public.notifications(recipient_id,actor_id,type,title,body,link) select owner,new.profile_id,'reaction','New reaction',coalesce(p.display_name,p.username,'An RCL member')||' reacted to your post.','/social#post-'||new.post_id from public.profiles p where p.id=new.profile_id; end if; return new; end $$;
drop trigger if exists notify_reaction_after_insert on public.reactions;
create trigger notify_reaction_after_insert after insert on public.reactions for each row execute function public.notify_reaction();

create or replace function public.notify_profile_wall_post() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.target_profile_id is not null and new.target_profile_id<>new.author_id then insert into public.notifications(recipient_id,actor_id,type,title,body,link) select new.target_profile_id,new.author_id,'profile_post','New profile post',coalesce(p.display_name,p.username,'An RCL member')||' posted on your timeline.','/social/profile/'||new.target_profile_id from public.profiles p where p.id=new.author_id; end if; return new; end $$;
drop trigger if exists notify_profile_wall_post_after_insert on public.posts;
create trigger notify_profile_wall_post_after_insert after insert on public.posts for each row execute function public.notify_profile_wall_post();

create or replace function public.notify_friend_request() returns trigger language plpgsql security definer set search_path=public as $$
begin if coalesce((select friend_requests from public.notification_preferences where profile_id=new.addressee_id),true) then insert into public.notifications(recipient_id,actor_id,type,title,body,link) select new.addressee_id,new.requester_id,'friend_request','New connection request',coalesce(p.display_name,p.username,'An RCL member')||' wants to connect.','/friends' from public.profiles p where p.id=new.requester_id; end if; return new; end $$;
drop trigger if exists notify_friend_request_after_insert on public.friendships;
create trigger notify_friend_request_after_insert after insert on public.friendships for each row when (new.status='pending') execute function public.notify_friend_request();