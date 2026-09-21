-- Allow media-only social posts while preserving the requirement that every post has content.
alter table public.posts
  drop constraint if exists posts_body_check;

alter table public.posts
  add constraint posts_body_or_media_check
  check (
    length(trim(body)) > 0
    or jsonb_array_length(media_urls) > 0
  );
