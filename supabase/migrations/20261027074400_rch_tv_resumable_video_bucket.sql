-- RCH TV full-length video uploads are isolated from general social media.
-- The social "media" bucket retains its 50 MB limit.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rch-tv-videos', 'rch-tv-videos', true, 5368709120,
        ARRAY['video/mp4','video/webm']::text[])
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $policies$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='rch tv admin video uploads') THEN
    CREATE POLICY "rch tv admin video uploads" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id='rch-tv-videos' AND (SELECT public.is_admin())
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='rch tv admin video manage') THEN
    CREATE POLICY "rch tv admin video manage" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id='rch-tv-videos' AND (SELECT public.is_admin()))
      WITH CHECK (bucket_id='rch-tv-videos' AND (SELECT public.is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='rch tv admin video delete') THEN
    CREATE POLICY "rch tv admin video delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id='rch-tv-videos' AND (SELECT public.is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='rch tv public video playback') THEN
    CREATE POLICY "rch tv public video playback" ON storage.objects FOR SELECT TO public
      USING (bucket_id='rch-tv-videos');
  END IF;
END
$policies$;