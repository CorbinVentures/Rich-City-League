-- Reconstructed from the production migration history so local resets match production.
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.site_settings (key, value)
values ('auth_site_url', '"https://www.rich-city-league.com"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
