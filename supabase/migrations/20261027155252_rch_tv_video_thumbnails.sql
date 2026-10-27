-- Store tiny generated preview images in the existing public media bucket.
-- Do not alter video storage limits or general social-media uploads.
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS thumbnail_path text;
COMMENT ON COLUMN public.media.thumbnail_path IS 'RCH TV thumbnail relative path in the existing media storage bucket.';
