begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ declare j jsonb; rejected boolean:=false; begin
 j:=public.get_rch_world_expansion();
 assert j->'receipts'='[]'::jsonb, 'Unrelated player history leaked';
 assert (j->>'wallet')::int=0, 'Unrelated wallet leaked';
 assert (j->>'weekly_teammates')::int=0, 'Unrelated teammates leaked';
 begin perform public.set_rch_world_loadout('crown_defender',null); exception when others then
  if sqlerrm='Earn this milestone before equipping its banner' then rejected:=true; else raise; end if;
 end;
 assert rejected, 'Unearned cosmetic accepted';
 assert not has_function_privilege('anon','public.get_rch_world_expansion()','execute');
 assert not has_function_privilege('anon','public.set_rch_world_loadout(text,text)','execute');
 assert not has_table_privilege('authenticated','public.rch_world_loadouts','insert');
end $$;
select 'private history, empty-state metrics, locked cosmetics and role grants passed' as result;
rollback;
