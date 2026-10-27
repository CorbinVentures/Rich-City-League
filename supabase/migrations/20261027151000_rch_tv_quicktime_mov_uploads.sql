-- Preserve existing 5 GB RCH TV bucket and admin-only upload policies.
-- Extend the existing video allowlist for iPhone QuickTime (.mov) recordings.
-- Keep the general social media bucket at its original 50 MB cap.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/mp4','video/webm','video/quicktime']::text[]
WHERE id = 'rch-tv-videos'
  AND allowed_mime_types IS DISTINCT FROM ARRAY['video/mp4','video/webm','video/quicktime']::text[];
