-- Support provider-backed, searchable profile soundtracks while preserving older profile URLs.
alter table public.profiles
  drop constraint if exists profiles_profile_song_url_check;

alter table public.profiles
  add constraint profiles_profile_song_url_check
  check (
    profile_song_url is null
    or profile_song_url ~* '^audius:[A-Za-z0-9_-]{1,80}$'
    or profile_song_url ~* '^https?://(www\.)?(youtube\.com|youtu\.be)/'
  );

comment on column public.profiles.profile_song_url is
  'Optional member-selected Audius track identifier (audius:ID); legacy YouTube links retained until replaced.';
