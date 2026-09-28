begin;

alter table public.drafts
  add column if not exists rules_text text not null default '';

alter table public.drafts
  drop constraint if exists drafts_rules_text_length_check;
alter table public.drafts
  add constraint drafts_rules_text_length_check
  check (length(rules_text) <= 8000);

create or replace function public.configure_draft_settings(
  target_draft uuid,
  target_rounds integer,
  target_roster_limit integer,
  target_clock_duration_seconds integer,
  target_rules_text text default ''
)
returns public.drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  current_draft public.drafts;
  updated_draft public.drafts;
begin
  if caller is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not public.is_staff_or_admin() then
    raise exception 'Only league staff may configure Draft Night.' using errcode = '42501';
  end if;

  select * into current_draft
  from public.drafts
  where id = target_draft
  for update;

  if current_draft.id is null then
    raise exception 'Draft not found.' using errcode = 'P0002';
  end if;

  if current_draft.status <> 'SETUP' then
    raise exception 'Draft settings can only be changed during setup.' using errcode = 'P0001';
  end if;

  if target_rounds not between 1 and 20 then
    raise exception 'Draft rounds must be between 1 and 20.' using errcode = '22023';
  end if;

  if target_roster_limit not between 1 and 30 then
    raise exception 'Roster limit must be between 1 and 30.' using errcode = '22023';
  end if;

  if target_clock_duration_seconds not between 15 and 900 then
    raise exception 'Pick clock must be between 15 and 900 seconds.' using errcode = '22023';
  end if;

  if length(coalesce(target_rules_text, '')) > 8000 then
    raise exception 'Draft rules must be 8,000 characters or fewer.' using errcode = '22023';
  end if;

  -- A rounds change changes the expected number of picks. Clear any existing
  -- setup order so staff must explicitly rebuild it against the new structure.
  if current_draft.rounds <> target_rounds then
    delete from public.draft_order where draft_id = target_draft;
  end if;

  update public.drafts
  set rounds = target_rounds,
      roster_limit = target_roster_limit,
      clock_duration_seconds = target_clock_duration_seconds,
      clock_remaining_seconds = null,
      rules_text = trim(coalesce(target_rules_text, ''))
  where id = target_draft
  returning * into updated_draft;

  insert into public.audit_logs(user_id, action, details)
  values (
    caller,
    'DRAFT_SETTINGS_UPDATED',
    jsonb_build_object(
      'draft_id', target_draft,
      'rounds', target_rounds,
      'roster_limit', target_roster_limit,
      'clock_duration_seconds', target_clock_duration_seconds
    )::text
  );

  return updated_draft;
end;
$$;

revoke all on function public.configure_draft_settings(uuid, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.configure_draft_settings(uuid, integer, integer, integer, text) to authenticated;

commit;
