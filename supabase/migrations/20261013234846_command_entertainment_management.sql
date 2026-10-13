-- Private event production, shared by authorized Command Center administrators.
create table public.rcl_command_entertainment (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 2 and 180),
 kind text not null check(kind in ('game_show','cheer_program','halftime_show','offsite_event')),
 state text not null default 'planning' check(state in ('planning','ready','live','completed','cancelled')),
 game_id uuid references public.games(id) on delete restrict,
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at>starts_at),
 location text not null default '' check(length(location)<=2000),
 revision integer not null default 1 check(revision>0),
 document jsonb not null check(octet_length(document::text)<=250000),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.rcl_command_entertainment enable row level security;
revoke all on public.rcl_command_entertainment from anon,authenticated;
grant select,insert,update on public.rcl_command_entertainment to authenticated;
grant all on public.rcl_command_entertainment to service_role;
create policy entertainment_admin_read on public.rcl_command_entertainment for select to authenticated using(public.rcl_command_is_admin());
create policy entertainment_admin_create on public.rcl_command_entertainment for insert to authenticated with check(public.rcl_command_is_admin() and created_by=auth.uid());
create policy entertainment_admin_update on public.rcl_command_entertainment for update to authenticated using(public.rcl_command_is_admin()) with check(public.rcl_command_is_admin());
create index entertainment_game_idx on public.rcl_command_entertainment(game_id);
create index entertainment_calendar_idx on public.rcl_command_entertainment(starts_at,state);
create index entertainment_creator_idx on public.rcl_command_entertainment(created_by);

create or replace function public.rcl_command_validate_entertainment()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare d jsonb; x jsonb; prior jsonb; k text; field text; v text; new_cues jsonb='[]'::jsonb; required_checks text[];
begin
 d:=new.document;
 if tg_op='UPDATE' then
  if new.revision<>old.revision+1 then raise exception 'Stale event revision. Reload before saving.'; end if;
  if new.created_by<>old.created_by or new.created_at<>old.created_at or new.kind<>old.kind then raise exception 'Event identity and playbook are immutable.'; end if;
  if new.state='live' and old.state not in ('ready','live') then raise exception 'Save show-ready before opening live control.'; end if;
  if new.state='completed' and old.state not in ('live','completed') then raise exception 'Only a live event can be completed.'; end if;
  if old.state in ('completed','cancelled') and new.state<>old.state then raise exception 'Create a new event instead of reopening a finished event.'; end if;
  if old.state='live' and new.state not in ('live','completed','cancelled') then raise exception 'Complete or cancel live control before editing the plan.'; end if;
  if old.state='live' then
   if row(new.title,new.game_id,new.starts_at,new.ends_at,new.location) is distinct from row(old.title,old.game_id,old.starts_at,old.ends_at,old.location)
    or (d-'cues'-'performers') is distinct from (old.document-'cues'-'performers')
   then raise exception 'Planning fields are locked during live control.'; end if;
  end if;
 else
  if new.state<>'planning' or new.revision<>1 then raise exception 'New events start in planning at revision 1.'; end if;
 end if;
 if jsonb_typeof(d) is distinct from 'object' or d->>'version' is distinct from '1' then raise exception 'Invalid entertainment document.'; end if;
 foreach k in array array['manager','audience','capacity','ticket_url','game_snapshot','budget_limit','contingency','access_plan','equipment','staff_contacts'] loop
  if jsonb_typeof(d->k) is distinct from 'string' then raise exception 'Invalid event field: %',k; end if;
 end loop;
 if jsonb_typeof(d->'review') is distinct from 'object' then raise exception 'Missing event review.'; end if;
 foreach k in array array['attendance','source','highlights','issues','next_time'] loop
  if jsonb_typeof(d->'review'->k) is distinct from 'string' then raise exception 'Invalid review field: %',k; end if;
 end loop;
 foreach k in array array['timeout_seconds','halftime_seconds'] loop
  if jsonb_typeof(d->k) is distinct from 'number' or (d->>k)::numeric<1 or (d->>k)::numeric<>trunc((d->>k)::numeric) then raise exception 'Show allowances must be positive whole seconds.'; end if;
 end loop;
 foreach k in array array['cues','performers','tasks','checks','costs'] loop
  if jsonb_typeof(d->k) is distinct from 'array' or jsonb_array_length(d->k)>100 then raise exception 'Invalid event collection: %',k; end if;
  if exists(select 1 from jsonb_array_elements(d->k) a where jsonb_typeof(a) is distinct from 'object' or coalesce(a->>'id','')='') or (select count(distinct a->>'id') from jsonb_array_elements(d->k) a)<>jsonb_array_length(d->k) then raise exception 'Each item needs a unique identifier.'; end if;
 end loop;
 foreach k in array array['capacity','budget_limit'] loop
  v:=d->>k;
  if v<>'' and (v !~ '^[0-9]+(\.[0-9]+)?$' or (k='capacity' and v::numeric<>trunc(v::numeric))) then raise exception 'Invalid capacity or budget.'; end if;
 end loop;
 v:=d->'review'->>'attendance';
 if v<>'' and (v !~ '^[0-9]+$' or length(trim(d->'review'->>'source'))=0) then raise exception 'Attendance needs a whole-number count and source.'; end if;
 for x in select value from jsonb_array_elements(d->'performers') loop
  foreach field in array array['name','discipline','contact','email','phone','fee','deposit','paid','payment_reference','agreement','arrival','requirements','permissions','backup'] loop
   if jsonb_typeof(x->field) is distinct from 'string' then raise exception 'Invalid performer field: %',field; end if;
  end loop;
  if length(trim(x->>'name'))=0 or coalesce(x->>'status','') not in ('proposed','contacted','confirmed','declined') or jsonb_typeof(x->'checked_in') is distinct from 'boolean' then raise exception 'Invalid performer booking.'; end if;
  if (x->>'checked_in')::boolean and x->>'status'<>'confirmed' then raise exception 'Confirm the booking before check-in.'; end if;
  foreach field in array array['fee','deposit','paid'] loop
   if x->>field<>'' and x->>field !~ '^[0-9]+(\.[0-9]+)?$' then raise exception 'Performer amounts must be nonnegative.'; end if;
  end loop;
  if coalesce(nullif(x->>'deposit','')::numeric,0)>coalesce(nullif(x->>'fee','')::numeric,0) then raise exception 'Deposit cannot exceed the performer fee.'; end if;
  if x->>'paid'<>'' and length(trim(x->>'payment_reference'))=0 then raise exception 'Actual payments require a receipt or ledger reference.'; end if;
  if tg_op='UPDATE' and old.state='live' then
   select value into prior from jsonb_array_elements(old.document->'performers') where value->>'id'=x->>'id';
   if prior is null or (x-'checked_in') is distinct from (prior-'checked_in') then raise exception 'Only performer check-in can change during live control.'; end if;
  end if;
 end loop;
 if tg_op='UPDATE' and old.state='live' and jsonb_array_length(d->'performers')<>jsonb_array_length(old.document->'performers') then raise exception 'Bookings are locked during live control.'; end if;
 for x in select value from jsonb_array_elements(d->'costs') loop
  if jsonb_typeof(x->'quantity') is distinct from 'number' or jsonb_typeof(x->'rate') is distinct from 'number' or (x->>'quantity')::numeric<0 or (x->>'rate')::numeric<0 then raise exception 'Cost quantity and rate must be nonnegative.'; end if;
  if jsonb_typeof(x->'actual') is distinct from 'string' or jsonb_typeof(x->'reference') is distinct from 'string' then raise exception 'Invalid settlement fields.'; end if;
  if x->>'actual'<>'' and (x->>'actual' !~ '^[0-9]+(\.[0-9]+)?$' or length(trim(x->>'reference'))=0) then raise exception 'Actual costs require a nonnegative amount and reference.'; end if;
 end loop;
 for x in select value from jsonb_array_elements(d->'tasks') loop
  if length(trim(coalesce(x->>'title','')))=0 or coalesce(x->>'due','') !~ '^-?[0-9]+(\.[0-9]+)?$' or coalesce(x->>'status','') not in ('open','in_progress','done','blocked') then raise exception 'Invalid crew assignment or deadline.'; end if;
  if x->>'status'='blocked' and length(trim(coalesce(x->>'notes','')))=0 then raise exception 'Blocked tasks require an explanation.'; end if;
 end loop;
 required_checks:=array['venue','talent','music','safety','access','crew'];
 if new.kind='offsite_event' then required_checks:=required_checks||array['permits','weather']; else required_checks:=required_checks||array['officials']; end if;
 foreach k in array required_checks loop
  if not exists(select 1 from jsonb_array_elements(d->'checks') c where c->>'id'=k) then raise exception 'Missing required logistics control: %',k; end if;
 end loop;
 for x in select value from jsonb_array_elements(d->'checks') loop
  if coalesce(x->>'status','') not in ('pending','confirmed','not_needed') or jsonb_typeof(x->'evidence') is distinct from 'string' then raise exception 'Invalid logistics confirmation.'; end if;
 end loop;
 for x in select value from jsonb_array_elements(d->'cues') loop
  foreach field in array array['title','trigger','owner','asset','script','backup','skip_reason'] loop
   if jsonb_typeof(x->field) is distinct from 'string' then raise exception 'Invalid show cue: %',field; end if;
  end loop;
  if length(trim(x->>'title'))=0 or coalesce(x->>'group','') not in ('pregame','timeout','halftime','postgame','offsite') or coalesce(x->>'status','') not in ('pending','live','done','skipped') then raise exception 'Invalid cue title, placement or status.'; end if;
  if jsonb_typeof(x->'duration') is distinct from 'number' or jsonb_typeof(x->'reset') is distinct from 'number' or (x->>'duration')::numeric<1 or (x->>'reset')::numeric<0 or (x->>'duration')::numeric<>trunc((x->>'duration')::numeric) or (x->>'reset')::numeric<>trunc((x->>'reset')::numeric) then raise exception 'Cue timing must use whole seconds.'; end if;
  if x->>'status'='skipped' and length(trim(x->>'skip_reason'))=0 then raise exception 'Skipped cues require a reason.'; end if;
  prior:=null;
  if tg_op='UPDATE' then select value into prior from jsonb_array_elements(old.document->'cues') where value->>'id'=x->>'id'; end if;
  if prior is null then
   if x->>'status'<>'pending' then raise exception 'New cues start pending.'; end if;
   x:=x||jsonb_build_object('started_at','','finished_at','');
  else
   if old.state='live' and (x-'status'-'started_at'-'finished_at'-'skip_reason') is distinct from (prior-'status'-'started_at'-'finished_at'-'skip_reason') then raise exception 'Cue content is locked during live control.'; end if;
   x:=x||jsonb_build_object('started_at',prior->>'started_at','finished_at',prior->>'finished_at');
   if x->>'status' is distinct from prior->>'status' then
    if new.state not in ('live','cancelled') then raise exception 'Cue actions require live control.'; end if;
    if x->>'status'='live' and prior->>'status'='pending' and new.state='live' and old.state='live' then
     x:=x||jsonb_build_object('started_at',now(),'finished_at','');
    elsif x->>'status'='done' and prior->>'status'='live' then
     x:=x||jsonb_build_object('finished_at',now());
    elsif x->>'status'='skipped' and prior->>'status' in ('pending','live') then
     x:=x||jsonb_build_object('finished_at',now());
    else raise exception 'Invalid cue transition.';
    end if;
   end if;
  end if;
  new_cues:=new_cues||jsonb_build_array(x);
 end loop;
 if tg_op='UPDATE' and exists(select 1 from jsonb_array_elements(old.document->'cues') c where c->>'status'<>'pending' and not exists(select 1 from jsonb_array_elements(new_cues) n where n->>'id'=c->>'id')) then raise exception 'Executed cues cannot be removed.'; end if;
 if tg_op='UPDATE' and old.state='live' and jsonb_array_length(new_cues)<>jsonb_array_length(old.document->'cues') then raise exception 'Run sheet is locked during live control.'; end if;
 if (select count(*) from jsonb_array_elements(new_cues) c where c->>'status'='live')>1 then raise exception 'Only one cue may be live at a time.'; end if;
 if new.state<>'live' and exists(select 1 from jsonb_array_elements(new_cues) c where c->>'status'='live') then raise exception 'Finish or skip the live cue first.'; end if;
 if new.state='completed' and exists(select 1 from jsonb_array_elements(new_cues) c where c->>'status'='pending') then raise exception 'Complete or skip every cue before completing the event.'; end if;
 if new.state in ('ready','live') then
  if length(trim(d->>'manager'))=0 or length(trim(new.location))=0 or length(trim(d->>'contingency'))=0 or length(trim(d->>'access_plan'))=0 or jsonb_array_length(new_cues)=0 then raise exception 'Show-ready requires manager, location, contingency, access plan and run sheet.'; end if;
  if new.game_id is not null and exists(select 1 from public.games g where g.id=new.game_id and (g.status::text in ('postponed','cancelled','canceled') or nullif(d->>'game_snapshot','')::timestamptz is distinct from g.scheduled_at)) then raise exception 'Official game changed or is interrupted. Review and align the event before show control.'; end if;
  if exists(select 1 from jsonb_array_elements(d->'checks') c where c->>'status'='pending' or length(trim(c->>'evidence'))=0) then raise exception 'Confirm logistics checks with evidence or a reason not needed.'; end if;
  if exists(select 1 from jsonb_array_elements(d->'performers') p where p->>'status'<>'declined' and (p->>'status'<>'confirmed' or length(trim(p->>'contact'))=0 or length(trim(p->>'agreement'))=0 or length(trim(p->>'permissions'))=0)) then raise exception 'Confirm performer bookings, contacts, agreements and permissions.'; end if;
  if exists(select 1 from jsonb_array_elements(new_cues) c where c->>'status'<>'skipped' and (length(trim(c->>'owner'))=0 or length(trim(c->>'trigger'))=0 or length(trim(c->>'backup'))=0)) then raise exception 'Every active cue requires an owner, trigger and backup.'; end if;
  if exists(select 1 from jsonb_array_elements(new_cues) c where c->>'status'<>'skipped' and c->>'group'='timeout' and (c->>'duration')::numeric+(c->>'reset')::numeric>(d->>'timeout_seconds')::numeric) then raise exception 'A timeout segment exceeds its planning allowance.'; end if;
  if (select coalesce(sum((c->>'duration')::numeric+(c->>'reset')::numeric),0) from jsonb_array_elements(new_cues) c where c->>'status'<>'skipped' and c->>'group'='halftime')>(d->>'halftime_seconds')::numeric then raise exception 'Halftime run sheet exceeds its allowance.'; end if;
  if new.kind='offsite_event' and (select coalesce(sum((c->>'duration')::numeric+(c->>'reset')::numeric),0) from jsonb_array_elements(new_cues) c where c->>'status'<>'skipped')>extract(epoch from new.ends_at-new.starts_at) then raise exception 'Run sheet exceeds the event window.'; end if;
 end if;
 new.document:=jsonb_set(d,'{cues}',new_cues);
 return new;
end $$;
revoke all on function public.rcl_command_validate_entertainment() from public;
create trigger a_entertainment_validate before insert or update on public.rcl_command_entertainment for each row execute function public.rcl_command_validate_entertainment();
create trigger z_entertainment_audit before insert or update on public.rcl_command_entertainment for each row execute function public.rcl_command_touch_audit();
comment on table public.rcl_command_entertainment is 'Admin entertainment planning, bookings, logistics, budgets and shared live cues. No external messages, payments, official clock or competition writes.';
