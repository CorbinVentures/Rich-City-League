-- Reconcile legacy run values with the modern RCH Runs composer.
-- Expand valid values rather than changing or deleting any existing runs.
alter table public.runs drop constraint if exists runs_run_type_check;
alter table public.runs add constraint runs_run_type_check
  check (run_type in ('competitive','social','training','1v1','3v3','4v4','5v5','open_run','shootaround'));

alter table public.runs drop constraint if exists runs_skill_level_check;
alter table public.runs add constraint runs_skill_level_check
  check (skill_level in ('all','all_levels','beginner','intermediate','advanced','elite'));

-- Four occurrences are distinct games/Runs with a shared series ID for grouping.
alter table public.runs
  add column if not exists recurrence_series_id uuid,
  add column if not exists recurrence_sequence smallint;

alter table public.runs drop constraint if exists runs_recurrence_sequence_check;
alter table public.runs add constraint runs_recurrence_sequence_check
  check (
    (recurrence_series_id is null and recurrence_sequence is null)
    or (recurrence_series_id is not null and recurrence_sequence between 0 and 3)
  );
create index if not exists runs_recurrence_series_idx
  on public.runs (recurrence_series_id, starts_at)
  where recurrence_series_id is not null;
