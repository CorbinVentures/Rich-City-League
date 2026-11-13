-- Extend only the dedicated RCH TV video bucket. Do not change social media.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/mp4','video/webm','video/quicktime']::text[]
WHERE id = 'rch-tv-videos'
  AND allowed_mime_types IS DISTINCT FROM ARRAY['video/mp4','video/webm','video/quicktime']::text[];