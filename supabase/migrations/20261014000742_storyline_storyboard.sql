-- Add optional scene boards to existing version-1 documents without rewriting saved workspaces.
-- Runs after the existing episode validator and before the audit trigger.
create or replace function public.rcl_command_validate_storyboard()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare board jsonb; frame jsonb; key text; changed boolean;
begin
 if tg_op='UPDATE' and old.document ? 'storyboard' and not new.document ? 'storyboard' then
  raise exception 'This workspace contains a storyboard. Reload the current Studio before saving.';
 end if;
 board:=coalesce(new.document->'storyboard','[]'::jsonb);
 if jsonb_typeof(board) is distinct from 'array' then raise exception 'Storyboard must be a scene array.'; end if;
 if jsonb_array_length(board)>60 then raise exception 'Keep the storyboard to 60 scenes per game.'; end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(board) x)<>jsonb_array_length(board) then raise exception 'Storyboard scene IDs must be unique.'; end if;
 for frame in select value from jsonb_array_elements(board) loop
  if jsonb_typeof(frame) is distinct from 'object' then raise exception 'Invalid scene.'; end if;
  foreach key in array array['id','title','story_id','task_id','branch','shot','visual','audio','overlay','location','owner','image_url','asset_url','notes','status'] loop
   if jsonb_typeof(frame->key) is distinct from 'string' or length(frame->>key)>5000 then raise exception 'Invalid scene field: %',key; end if;
  end loop;
  if length(trim(frame->>'id'))=0 or length(trim(frame->>'title'))=0 then raise exception 'Every scene needs an ID and title.'; end if;
  if jsonb_typeof(frame->'seconds') is distinct from 'number' then raise exception 'Scene duration must be numeric.'; end if;
  if (frame->>'seconds')::numeric<1 or (frame->>'seconds')::numeric>3600 or (frame->>'seconds')::numeric<>trunc((frame->>'seconds')::numeric) then raise exception 'Scene duration must be 1–3600 whole seconds.'; end if;
  if frame->>'shot' not in ('Wide','Medium','Close-up','Detail','Tracking','Interview','Graphic') or frame->>'status' not in ('planned','ready','captured') or frame->>'branch' not in ('always','home_win','away_win','standout','postponed','sensitive') then raise exception 'Invalid scene shot, status or outcome branch.'; end if;
  if frame->>'story_id'<>'' and not exists(select 1 from jsonb_array_elements(new.document->'stories') s where s->>'id'=frame->>'story_id') then raise exception 'Scene links to a removed story angle.'; end if;
  if not exists(select 1 from jsonb_array_elements(new.document->'tasks') t where t->>'id'=frame->>'task_id') then raise exception 'Every scene needs a production assignment.'; end if;
  foreach key in array array['image_url','asset_url'] loop
   if frame->>key<>'' and (frame->>key !~ '^https?://[^[:space:]/@]+[^[:space:]]*$' or frame->>key ~ '^https?://[^/]*@') then raise exception 'Scene links must use HTTP or HTTPS without embedded credentials.'; end if;
  end loop;
  if frame->>'status' in ('ready','captured') and (length(trim(frame->>'visual'))=0 or length(trim(frame->>'audio'))=0 or length(trim(frame->>'owner'))=0) then raise exception 'Shoot-ready scenes need visual and audio direction and a crew owner.'; end if;
  if frame->>'status'='captured' and frame->>'asset_url'='' then raise exception 'Captured scenes require a footage URL.'; end if;
 end loop;
 if tg_op='UPDATE' then
  changed:=board is distinct from coalesce(old.document->'storyboard','[]'::jsonb);
  if changed and exists(select 1 from jsonb_array_elements(old.document->'tasks') prior join jsonb_array_elements(new.document->'tasks') current on prior->>'id'=current->>'id' where prior->>'status' in ('approved','released') and current->>'status' in ('approved','released')) then
   raise exception 'Storyboard changes must return approved assignments to review before saving.';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.rcl_command_validate_storyboard() from public;
create trigger b_studio_storyboard before insert or update on public.rcl_command_episodes for each row execute function public.rcl_command_validate_storyboard();
