begin;
-- A member may review the identities they explicitly blocked, even though
-- ordinary profile visibility correctly prevents resolving those profiles.
-- No caller-supplied account ID: the function scopes rows to auth.uid().
create or replace function public.get_my_blocked_accounts()
returns table(blocked_id uuid, label text, created_at timestamptz)
language sql stable security definer set search_path=''
as $$
  select b.blocked_id,
    coalesce(nullif(trim(p.display_name),''), p.username::text, 'RCH member') as label,
    b.created_at
  from public.blocks b
  join public.profiles p on p.id=b.blocked_id
  where b.blocker_id=(select auth.uid())
  order by b.created_at desc;
$$;
revoke all on function public.get_my_blocked_accounts() from public,anon,authenticated;
grant execute on function public.get_my_blocked_accounts() to authenticated;
commit;
