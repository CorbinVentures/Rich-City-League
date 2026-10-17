-- Parks & Recreation source intake: staff can propose county/city basketball
-- facilities, but cannot silently promote them to verified locations.
create table public.rch_official_facility_reviews(
 id uuid primary key default gen_random_uuid(),
 facility_name text not null check(char_length(trim(facility_name)) between 3 and 160),
 locality text not null check(char_length(trim(locality)) between 2 and 90),
 street_address text,
 venue_type text not null check(venue_type in ('outdoor','indoor','mixed')),
 access_type text not null check(access_type in ('public','free_pass','membership','reservation','varies')),
 agency_name text not null check(char_length(trim(agency_name)) between 10 and 200),
 official_source_url text not null check(official_source_url ~ '^https://' and char_length(official_source_url) between 14 and 1200),
 basketball_evidence text not null check(char_length(trim(basketball_evidence)) between 24 and 2500),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 submitted_by uuid not null references public.profiles(id),
 submitted_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 review_notes text,
 approved_slug text references public.basketball_locations(slug)
);
create index rch_official_facility_reviews_queue on public.rch_official_facility_reviews(status,submitted_at desc);
alter table public.rch_official_facility_reviews enable row level security;
revoke all on public.rch_official_facility_reviews from public,anon,authenticated;
grant select on public.rch_official_facility_reviews to authenticated;
create policy rch_staff_reads_official_facility_reviews on public.rch_official_facility_reviews
 for select to authenticated using (public.is_staff_or_admin());

create function public.rch_submit_official_basketball_facility(
 p_name text,p_locality text,p_address text,p_venue text,p_access text,
 p_agency text,p_source_url text,p_evidence text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_user uuid:=auth.uid();
begin
 if v_user is null or not public.is_staff_or_admin() then raise exception 'Staff access required';end if;
 if p_name is null or char_length(trim(p_name)) not between 3 and 160
  or p_locality is null or char_length(trim(p_locality)) not between 2 and 90
  or p_venue not in ('outdoor','indoor','mixed')
  or p_access not in ('public','free_pass','membership','reservation','varies')
  or p_agency is null or char_length(trim(p_agency)) not between 10 and 200
  or p_agency !~* '(parks?|recreation|prcf)'
  or p_source_url is null or p_source_url !~ '^https://' or char_length(p_source_url) not between 14 and 1200
  or p_evidence is null or char_length(trim(p_evidence)) not between 24 and 2500
  or (p_address is not null and char_length(p_address)>350)
 then raise exception 'Complete official agency basketball evidence, venue and access fields are required';end if;
 if exists(select 1 from public.basketball_locations b
  where lower(trim(b.name))=lower(trim(p_name))
    and lower(trim(b.locality))=lower(trim(p_locality))
    and b.verification_status in ('official','provider') and b.is_active)
 then raise exception 'Source-backed venue already exists in this locality';end if;
 insert into public.rch_official_facility_reviews(
 facility_name,locality,street_address,venue_type,access_type,
 agency_name,official_source_url,basketball_evidence,submitted_by)
 values(trim(p_name),trim(p_locality),nullif(trim(coalesce(p_address,'')),''),
  p_venue,p_access,trim(p_agency),trim(p_source_url),trim(p_evidence),v_user)
 returning id into v_id;
 return v_id;
end $$;

create function public.rch_review_official_basketball_facility(
 p_review uuid,p_approve boolean,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.rch_official_facility_reviews%rowtype;
 v_user uuid:=auth.uid();v_slug text;
begin
 if v_user is null or not public.is_staff_or_admin() then raise exception 'Staff access required';end if;
 if p_approve is null or p_reason is null or char_length(trim(p_reason)) not between 24 and 2000
 then raise exception 'Review must document independent basketball-amenity evidence and access';end if;
 select * into v_row from public.rch_official_facility_reviews where id=p_review for update;
 if not found or v_row.status<>'pending' then raise exception 'Source proposal missing or already reviewed';end if;
 if p_approve then
  if exists(select 1 from public.basketball_locations b
    where lower(trim(b.name))=lower(trim(v_row.facility_name))
      and lower(trim(b.locality))=lower(trim(v_row.locality))
      and b.verification_status in ('official','provider') and b.is_active)
   then raise exception 'Existing official venue: review for duplicate before approval';end if;
  v_slug:='pr-official-'||replace(v_row.id::text,'-','');
  insert into public.basketball_locations(
    slug,name,address,locality,area,region,venue_type,access_type,
    latitude,longitude,verification_status,source_label,source_url,last_verified_on,notes,is_active)
  values(v_slug,v_row.facility_name,coalesce(v_row.street_address,'Street address pending facility verification'),
    v_row.locality,v_row.locality,'VA',v_row.venue_type,v_row.access_type,
    null,null,'official',v_row.agency_name,v_row.official_source_url,current_date,
    'Official Parks & Recreation basketball facility. Evidence: '||v_row.basketball_evidence||
     '. Access and court-center coordinates require separate review. Staff decision: '||trim(p_reason),
    true);
 end if;
 update public.rch_official_facility_reviews
  set status=case when p_approve then 'approved' else 'rejected' end,
      reviewed_by=v_user,reviewed_at=now(),review_notes=trim(p_reason),approved_slug=v_slug
 where id=p_review;
 return jsonb_build_object('approved',p_approve,'facility_slug',v_slug,'review_id',p_review);
end $$;

revoke all on function public.rch_submit_official_basketball_facility(text,text,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.rch_review_official_basketball_facility(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.rch_submit_official_basketball_facility(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.rch_review_official_basketball_facility(uuid,boolean,text) to authenticated;
comment on table public.rch_official_facility_reviews is 'Staff source review queue for official city/county basketball facilities; no automatic geocoding, REP or open-gym availability.';
