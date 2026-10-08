alter table public.profiles
  add column if not exists profile_song_url text;

alter table public.profiles
  drop constraint if exists profiles_profile_song_url_check;

alter table public.profiles
  add constraint profiles_profile_song_url_check
  check (
    profile_song_url is null
    or profile_song_url ~* '^https?://(www\\.)?(youtube\\.com|youtu\\.be)/'
  );

comment on column public.profiles.profile_song_url is 'Optional YouTube URL used as the member profile soundtrack.';
