-- Rich City League | statewide indoor basketball venue intelligence
-- Existing booking/finance and administrator RLS remain unchanged.
alter table public.rcl_command_venues
 add column if not exists source_key text,
 add column if not exists source_label text,
 add column if not exists source_url text,
 add column if not exists source_checked_on date,
 add column if not exists rate_basis text not null default 'unknown'
   check(rate_basis in ('unknown','published','quoted')),
 add column if not exists rate_details text not null default '',
 add column if not exists effective_hourly_rate numeric(10,2)
   check(effective_hourly_rate is null or effective_hourly_rate >= 0),
 add column if not exists budget_status text not null default 'needs_quote'
   check(budget_status in ('within_limit','conditional','over_limit','needs_quote','not_rentable')),
 add column if not exists availability_details text not null default '',
 add column if not exists availability_status text not null default 'unverified'
   check(availability_status in ('unverified','published_windows','inquiry_required','not_rentable','staff_confirmed')),
 add column if not exists availability_checked_on date,
 add column if not exists phone text,
 add column if not exists email text,
 add column if not exists website text,
 add column if not exists region_group text,
 add column if not exists venue_kind text not null default 'indoor_gym'
   check(venue_kind in ('indoor_gym','school_gym','recreation_center','fieldhouse','arena','mixed')),
 add column if not exists rental_allowed boolean,
 add column if not exists latitude double precision,
 add column if not exists longitude double precision,
 add column if not exists court_count integer
   check(court_count is null or court_count >= 0),
 add column if not exists source_verification text not null default 'manual'
   check(source_verification in ('manual','official','provider','community')),
 add column if not exists origin_location_slug text,
 add column if not exists last_contacted_on date;
create unique index if not exists rcl_command_venues_source_key_unique
 on public.rcl_command_venues (source_key) where source_key is not null;
create index if not exists rcl_command_venues_city_idx
 on public.rcl_command_venues (city);
create index if not exists rcl_command_venues_budget_status_idx
 on public.rcl_command_venues (budget_status, region_group);
create index if not exists rcl_command_venues_kind_idx
 on public.rcl_command_venues (venue_kind);
comment on column public.rcl_command_venues.hourly_rate is
 'Published or actually quoted BASE basketball gym rental rate per hour; never membership or open-gym admission price.';
comment on column public.rcl_command_venues.availability_status is
 'Research evidence, NOT a live reservation confirmation. An admin must verify specific dates and times with the venue.';
comment on column public.rcl_command_venues.effective_hourly_rate is
 'Known all-in hourly estimate where required fees can be allocated; NULL when the final price is uncertain.';
comment on column public.rcl_command_venues.source_key is
 'Stable idempotent import key. Imported records must not overwrite staff edits or confirmed bookings.';
