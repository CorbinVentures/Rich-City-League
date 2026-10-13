-- Private shared production workspaces. No writes to official competition data.
create table public.rcl_command_episodes (
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null unique references public.games(id) on delete restrict,
 revision integer not null default 1 check(revision>0),
 document jsonb not null,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint studio_document_size check(octet_length(document::text)<=250000)
);
alter table public.rcl_command_episodes enable row level security;
revoke all on public.rcl_command_episodes from anon,authenticated;
grant select,insert,update on public.rcl_command_episodes to authenticated;
grant all on public.rcl_command_episodes to service_role;
create policy studio_admin_read on public.rcl_command_episodes for select to authenticated using(public.rcl_command_is_admin());
create policy studio_admin_create on public.rcl_command_episodes for insert to authenticated with check(public.rcl_command_is_admin() and created_by=auth.uid());
create policy studio_admin_update on public.rcl_command_episodes for update to authenticated using(public.rcl_command_is_admin()) with check(public.rcl_command_is_admin());
create index studio_created_by_idx on public.rcl_command_episodes(created_by);

create or replace function public.rcl_command_validate_episode()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare d jsonb; t jsonb; prior jsonb; tasks jsonb='[]'::jsonb; k text; metric text; edited boolean;
begin
 d:=new.document;
 if tg_op='UPDATE' then
  if new.revision<>old.revision+1 then raise exception 'Stale workspace revision. Reload before saving.'; end if;
  if new.game_id<>old.game_id or new.created_by<>old.created_by or new.created_at<>old.created_at then raise exception 'Workspace identity is immutable.'; end if;
 elsif new.revision<>1 then raise exception 'New workspaces start at revision 1.';
 end if;
 if jsonb_typeof(d) is distinct from 'object' or d->>'version' is distinct from '1' then raise exception 'Invalid production document.'; end if;
 foreach k in array array['brief','branches','impact'] loop
  if jsonb_typeof(d->k) is distinct from 'object' then raise exception 'Missing production section: %',k; end if;
 end loop;
 foreach k in array array['stories','tasks','rundown','talent'] loop
  if jsonb_typeof(d->k) is distinct from 'array' or jsonb_array_length(d->k)>100 then raise exception 'Invalid production collection: %',k; end if;
 end loop;
 if jsonb_array_length(d->'tasks')<>7 or (select count(distinct x->>'id') from jsonb_array_elements(d->'tasks') x)<>7 then raise exception 'Keep all seven production beats; use skipped with a reason.'; end if;
 if (select count(*) from jsonb_array_elements(d->'stories') x where x->>'role'='main')>1 or (select count(*) from jsonb_array_elements(d->'stories') x where x->>'role'='supporting')>2 then raise exception 'Use one main story and at most two supporting stories.'; end if;
 for t in select value from jsonb_array_elements(d->'stories') loop
  if coalesce(t->>'role','') not in ('main','supporting') or length(trim(coalesce(t->>'title','')))=0 or length(trim(coalesce(t->>'premise','')))=0 then raise exception 'Stories require title, premise and valid role.'; end if;
 end loop;
 for t in select value from jsonb_array_elements(d->'tasks') loop
  if coalesce(t->>'id','') not in ('announce','introduce','challenge','preview','show','reaction','next') or coalesce(t->>'status','') not in ('planned','in_progress','review','approved','released','blocked','skipped') then raise exception 'Unknown production beat or status.'; end if;
  if jsonb_typeof(t->'checks') is distinct from 'object' then raise exception 'Missing release checklist.'; end if;
  foreach k in array array['facts','permissions','captions','links'] loop
   if jsonb_typeof(t->'checks'->k) is distinct from 'boolean' then raise exception 'Invalid release check: %',k; end if;
  end loop;
  if coalesce(t->>'hours','') <> (case t->>'id' when 'announce' then '-168' when 'introduce' then '-120' when 'challenge' then '-72' when 'preview' then '-24' when 'show' then '-2' when 'reaction' then '24' when 'next' then '48' end) then raise exception 'Production deadlines must follow the official game schedule.'; end if;
  if t->>'status' in ('blocked','skipped') and length(trim(coalesce(t->>'blocker','')))=0 then raise exception 'Blocked or skipped work requires a reason.'; end if;
  prior:=null;
  if tg_op='UPDATE' then select value into prior from jsonb_array_elements(old.document->'tasks') where value->>'id'=t->>'id'; end if;
  edited:=false;
  if prior is not null then
   edited := (t->'owner' is distinct from prior->'owner') or (t->'instructions' is distinct from prior->'instructions') or (t->'asset' is distinct from prior->'asset') or (t->'checks' is distinct from prior->'checks') or (d->'stories' is distinct from old.document->'stories') or (d->'brief'->'producer' is distinct from old.document->'brief'->'producer') or (d->'brief'->'ticket_url' is distinct from old.document->'brief'->'ticket_url');
  end if;
  if edited and prior->>'status' in ('approved','released') and t->>'status' in ('approved','released') then raise exception 'Changed approved material must be saved back to review first.'; end if;
  if t->>'status' in ('approved','released') then
   if length(trim(coalesce(d->'brief'->>'producer','')))=0 or length(trim(coalesce(t->>'owner','')))=0
    or coalesce(t->>'asset','') !~ '^https?://[^[:space:]/]+[^[:space:]]*$'
    or coalesce(d->'brief'->>'ticket_url','') !~ '^https?://[^[:space:]/]+[^[:space:]]*$'
    or not (t->'checks' @> '{"facts":true,"permissions":true,"captions":true,"links":true}'::jsonb)
    or not exists (select 1 from jsonb_array_elements(d->'stories') s where s->>'role'='main' and length(trim(coalesce(s->>'evidence','')))>0)
   then raise exception 'Approval requires producer, owner, evidenced main story, valid asset and event links, and all release checks.'; end if;
   if t->>'status'='released' and (prior is null or prior->>'status' not in ('approved','released')) then raise exception 'Save approval before recording release.'; end if;
   if t->>'status'='released' and (select status::text from public.games where id=new.game_id) in ('postponed','cancelled','canceled') then raise exception 'Game interrupted: release is paused. Review updated event guidance.'; end if;
   if prior->>'status' in ('approved','released') then
    t:=t||jsonb_build_object('approved_by',prior->>'approved_by','approved_at',prior->>'approved_at');
   else
    if auth.uid() is null then raise exception 'A signed-in reviewer is required.'; end if;
    t:=t||jsonb_build_object('approved_by',auth.uid()::text,'approved_at',now());
   end if;
   if t->>'status'='released' then
    t:=t||jsonb_build_object('released_at',case when prior->>'status'='released' then prior->>'released_at' else now()::text end);
   else t:=t||jsonb_build_object('released_at',''); end if;
  else t:=t||jsonb_build_object('approved_by','','approved_at','','released_at',''); end if;
  tasks:=tasks||jsonb_build_array(t);
 end loop;
 foreach k in array array['tickets','follows','views','completed_views','merchandise'] loop
  metric:=coalesce(d->'impact'->>k,'');
  if metric<>'' then
   if metric !~ '^[0-9]+(\.[0-9]+)?$' or (k<>'merchandise' and metric::numeric<>trunc(metric::numeric)) then raise exception 'Invalid nonnegative metric: %',k; end if;
   if length(trim(coalesce(d->'impact'->>'evidence','')))=0 then raise exception 'Campaign metrics require a source and reporting period.'; end if;
  end if;
 end loop;
 if nullif(d->'impact'->>'completed_views','')::numeric > nullif(d->'impact'->>'views','')::numeric then raise exception 'Completed views cannot exceed video starts.'; end if;
 new.document:=jsonb_set(d,'{tasks}',tasks);
 return new;
end $$;
revoke all on function public.rcl_command_validate_episode() from public;
create trigger a_studio_validate before insert or update on public.rcl_command_episodes for each row execute function public.rcl_command_validate_episode();
create trigger z_studio_audit before insert or update on public.rcl_command_episodes for each row execute function public.rcl_command_touch_audit();
comment on table public.rcl_command_episodes is 'Private admin production workspaces with optimistic concurrency, reviewed release records, and audited changes. Released is a manual record, never automatic publishing.';
