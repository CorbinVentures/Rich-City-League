-- Player-submitted highlights use their own resumable video bucket.
-- Keep full-length RCH TV studio video storage admin-only.
-- Public delivery is URL-based; highlights are not listed in RCH TV until approved.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('rch-player-highlights','rch-player-highlights',true,262144000,
  array['video/mp4','video/webm','video/quicktime']::text[])
on conflict (id) do update
set public=excluded.public,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "rch players upload highlight clips" on storage.objects;
create policy "rch players upload highlight clips"
on storage.objects for insert to authenticated
with check (
  bucket_id='rch-player-highlights'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (storage.foldername(name))[2]='highlights'
  and owner_id=(select auth.uid())::text
);

drop policy if exists "rch players delete own highlight clips" on storage.objects;
create policy "rch players delete own highlight clips"
on storage.objects for delete to authenticated
using (
  bucket_id='rch-player-highlights'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and owner_id=(select auth.uid())::text
);
