create or replace function public.record_profile_exposure_internal(
  p_profile_id uuid,
  p_metric_type text,
  p_visitor_hash text,
  p_metric_date date default current_date
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if p_metric_type not in ('profile_view','passport_view','profile_share','media_view') then
    raise exception 'Unsupported exposure metric';
  end if;

  insert into public.profile_exposure_dedupe(profile_id, metric_date, metric_type, visitor_hash)
  values (p_profile_id, p_metric_date, p_metric_type, p_visitor_hash)
  on conflict do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return false;
  end if;

  insert into public.profile_exposure_daily(profile_id, metric_date, profile_views, passport_views, profile_shares, media_views)
  values (
    p_profile_id,
    p_metric_date,
    case when p_metric_type='profile_view' then 1 else 0 end,
    case when p_metric_type='passport_view' then 1 else 0 end,
    case when p_metric_type='profile_share' then 1 else 0 end,
    case when p_metric_type='media_view' then 1 else 0 end
  )
  on conflict (profile_id, metric_date) do update set
    profile_views = public.profile_exposure_daily.profile_views + excluded.profile_views,
    passport_views = public.profile_exposure_daily.passport_views + excluded.passport_views,
    profile_shares = public.profile_exposure_daily.profile_shares + excluded.profile_shares,
    media_views = public.profile_exposure_daily.media_views + excluded.media_views,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.record_profile_exposure_internal(uuid,text,text,date) from public, anon, authenticated;
grant execute on function public.record_profile_exposure_internal(uuid,text,text,date) to service_role;
