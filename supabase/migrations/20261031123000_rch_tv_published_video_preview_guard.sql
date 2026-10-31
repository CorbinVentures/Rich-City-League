-- RCH TV publication metadata guard. Does not rewrite or unpublish existing titles.
-- NOT VALID accommodates historical published videos missing thumbnails while
-- enforcing the rule on newly inserted and updated rows. Editorial verification,
-- playback testing and rights review remain separate workflows.
do $$
begin
 if not exists (
  select 1 from pg_constraint where conname='rch_tv_published_video_preview_required'
   and conrelid='public.media'::regclass
 ) then
  alter table public.media add constraint rch_tv_published_video_preview_required
  check (
   status::text <> 'published'
   or media_type::text <> 'video'
   or coalesce(rch_tv_category,'general') not in ('live_games','the_pulse','movies','original_content')
   or (
    nullif(btrim(coalesce(thumbnail_path,'')),'') is not null
    and nullif(btrim(coalesce(storage_path,'')),'') is not null
   )
  ) not valid;
 end if;
end $$;
