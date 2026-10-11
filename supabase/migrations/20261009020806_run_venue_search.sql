begin;

-- Open Runs venue autocomplete: return identifiable, useful places rather than raw anonymous GIS footprints.
-- The full mapped dataset stays available internally for future curation.
create or replace function public.search_run_venues(
  p_search text default '',
  p_limit integer default 25
)
returns setof public.basketball_locations
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select left(btrim(coalesce(p_search,'')),120) q,
           least(greatest(coalesce(p_limit,25),1),50) lim
  )
  select b.*
  from public.basketball_locations b cross join params a
  where b.is_active = true
    and (
      b.verification_status in ('official','provider')
      or (
        b.name not ilike 'Fairfax County Basketball Court #%'
        and b.name not ilike 'Basketball Court ·%'
        and b.name not ilike 'Basketball Court % (OSM %'
        and b.name not ilike 'Unnamed basketball%'
      )
    )
    and (
      a.q = ''
      or b.name ilike '%'||a.q||'%'
      or b.locality ilike '%'||a.q||'%'
      or b.area ilike '%'||a.q||'%'
      or b.address ilike '%'||a.q||'%'
    )
  order by
    case when a.q <> '' and lower(b.name) = lower(a.q) then 0 else 1 end,
    case when a.q <> '' and lower(b.name) like lower(a.q)||'%' then 0 else 1 end,
    case when b.verification_status in ('official','provider') then 0 else 1 end,
    case when b.access_type <> 'varies' then 0 else 1 end,
    case when a.q = '' and b.area in ('Richmond','Henrico','Chesterfield') then 0 else 1 end,
    b.name, b.slug
  limit (select lim from params);
$$;

revoke all on function public.search_run_venues(text,integer) from public, anon, authenticated;
grant execute on function public.search_run_venues(text,integer) to anon, authenticated;

commit;