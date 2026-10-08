-- Enforce RCL minor social-time controls and authenticated privacy workflows.
-- Virginia Code §59.1-577.1 requires a default 60-minute daily limit for users under 16
-- with a verifiable-parental-consent path to increase or decrease that limit.

alter table public.minor_parental_consents
  add column if not exists parent_name text,
  add column if not exists parent_contact text,
  add column if not exists verification_reference text;

create or replace function public.rcl_age(dob date)
returns integer language sql stable as $$
 select extract(year from age(current_date, dob))::integer;
$$;

create or replace function public.rcl_social_limit_minutes(target_profile_id uuid)
returns integer language sql stable security definer set search_path=public as $$
 select case
   when p.date_of_birth is null then 60
   when public.rcl_age(p.date_of_birth) >= 16 then 1440
   else coalesce((
     select c.daily_limit_minutes from public.minor_parental_consents c
     where c.profile_id=p.id and c.verified_at is not null and c.revoked_at is null
     order by c.verified_at desc limit 1
   ),60)
 end
 from public.profiles p where p.id=target_profile_id;
$$;

create or replace function public.rcl_social_usage_status()
returns table(is_minor boolean, limit_minutes integer, used_seconds integer, remaining_seconds integer, allowed boolean)
language sql stable security definer set search_path=public as $$
 with p as (select date_of_birth from public.profiles where id=auth.uid()),
 u as (select coalesce(seconds_used,0) s from public.social_usage_daily where profile_id=auth.uid() and usage_date=current_date),
 l as (select public.rcl_social_limit_minutes(auth.uid()) m)
 select coalesce(public.rcl_age(p.date_of_birth)<16,true), l.m, u.s,
        greatest(l.m*60-u.s,0), u.s < l.m*60 from p cross join u cross join l
 union all
 select true,60,0,3600,true where not exists(select 1 from p);
$$;

create or replace function public.rcl_record_social_usage(delta_seconds integer)
returns table(is_minor boolean, limit_minutes integer, used_seconds integer, remaining_seconds integer, allowed boolean)
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if delta_seconds < 1 or delta_seconds > 120 then raise exception 'Invalid usage interval'; end if;
 insert into public.social_usage_daily(profile_id,usage_date,seconds_used,updated_at)
 values(auth.uid(),current_date,delta_seconds,now())
 on conflict(profile_id,usage_date) do update
 set seconds_used=public.social_usage_daily.seconds_used+excluded.seconds_used, updated_at=now();
 return query select * from public.rcl_social_usage_status();
end $$;
grant execute on function public.rcl_social_usage_status() to authenticated;
grant execute on function public.rcl_record_social_usage(integer) to authenticated;

create or replace function public.create_privacy_request(kind text, request_details text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if kind not in ('access','correct','delete','appeal','other') then raise exception 'Invalid request type'; end if;
 insert into public.privacy_requests(profile_id,request_type,details) values(auth.uid(),kind,nullif(trim(request_details),''))
 returning id into rid; return rid;
end $$;
grant execute on function public.create_privacy_request(text,text) to authenticated;
