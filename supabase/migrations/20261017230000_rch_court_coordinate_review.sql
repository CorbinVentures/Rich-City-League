begin;
-- Source-backed coordinates are proposed and approved separately. A court
-- collection record never becomes verified merely because a coordinate exists.
create table public.rch_court_coordinate_reviews(
 id uuid primary key default gen_random_uuid(),
 court_slug text not null references public.basketball_locations(slug) on delete cascade,
 proposed_latitude double precision not null check(proposed_latitude between 36.45 and 39.65),
 proposed_longitude double precision not null check(proposed_longitude between -83.85 and -74.95),
 evidence_url text not null check(char_length(evidence_url) between 12 and 1200 and evidence_url ~ '^https://'),
 evidence_notes text not null check(char_length(evidence_notes) between 24 and 3000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 submitted_by uuid not null references public.profiles(id),
 submitted_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 review_notes text,
 previous_latitude double precision,
 previous_longitude double precision
);
create unique index rch_one_pending_court_coordinate_review
 on public.rch_court_coordinate_reviews(court_slug) where status='pending';
create index rch_court_coordinate_review_queue
 on public.rch_court_coordinate_reviews(status,submitted_at desc);
alter table public.rch_court_coordinate_reviews enable row level security;
revoke all on public.rch_court_coordinate_reviews from public,anon,authenticated;
grant select on public.rch_court_coordinate_reviews to authenticated;
create policy rch_coordinate_reviews_staff_read
 on public.rch_court_coordinate_reviews for select to authenticated
 using (public.is_staff_or_admin());

create table public.rch_court_coordinate_audit(
 id bigint generated always as identity primary key,
 court_slug text not null,
 review_id uuid not null,
 actor_id uuid not null,
 occurred_at timestamptz not null default now(),
 action text not null check(action in ('approved','rejected')),
 from_latitude double precision,
 from_longitude double precision,
 to_latitude double precision,
 to_longitude double precision,
 evidence_url text not null,
 review_notes text not null
);
create index rch_coordinate_audit_court_time on public.rch_court_coordinate_audit(court_slug,occurred_at desc);
alter table public.rch_court_coordinate_audit enable row level security;
revoke all on public.rch_court_coordinate_audit from public,anon,authenticated;
grant select on public.rch_court_coordinate_audit to authenticated;
create policy rch_coordinate_audit_staff_read
 on public.rch_court_coordinate_audit for select to authenticated
 using (public.is_staff_or_admin());

create function public.rch_propose_court_coordinates(
 p_court text,p_lat double precision,p_lon double precision,
 p_evidence_url text,p_notes text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_user uuid:=auth.uid();
begin
 if v_user is null or not public.is_staff_or_admin() then raise exception 'Staff access required';end if;
 if p_lat is null or p_lon is null or p_lat not between 36.45 and 39.65
  or p_lon not between -83.85 and -74.95 then raise exception 'Coordinates outside Virginia bounds';end if;
 if p_evidence_url is null or p_evidence_url !~ '^https://' or char_length(p_evidence_url)>1200
  or char_length(p_evidence_url)<12 then raise exception 'HTTPS evidence URL required';end if;
 if p_notes is null or char_length(trim(p_notes))<24 or char_length(p_notes)>3000
  then raise exception 'A substantive evidence explanation is required';end if;
 perform 1 from public.basketball_locations where slug=p_court and is_active=true;
 if not found then raise exception 'Unknown or inactive court';end if;
 insert into public.rch_court_coordinate_reviews(
  court_slug,proposed_latitude,proposed_longitude,evidence_url,evidence_notes,submitted_by)
 values(p_court,p_lat,p_lon,p_evidence_url,trim(p_notes),v_user)
 returning id into v_id;
 return v_id;
end $$;

create function public.rch_resolve_court_coordinate_review(
 p_review uuid,p_approve boolean,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_review public.rch_court_coordinate_reviews%rowtype;
 v_court public.basketball_locations%rowtype;v_actor uuid:=auth.uid();
begin
 if v_actor is null or not public.is_staff_or_admin() then raise exception 'Staff access required';end if;
 if p_approve is null or p_reason is null or char_length(trim(p_reason))<16 or char_length(p_reason)>2000
  then raise exception 'A documented approval/rejection decision is required';end if;
 select * into v_review from public.rch_court_coordinate_reviews where id=p_review for update;
 if not found or v_review.status<>'pending' then raise exception 'Review not found or already decided';end if;
 select * into v_court from public.basketball_locations where slug=v_review.court_slug for update;
 if not found or not v_court.is_active then raise exception 'Inactive court';end if;
 update public.rch_court_coordinate_reviews
  set status=case when p_approve then 'approved' else 'rejected' end,
      reviewed_by=v_actor,reviewed_at=now(),review_notes=trim(p_reason),
      previous_latitude=v_court.latitude,previous_longitude=v_court.longitude
 where id=p_review;
 if p_approve then
  perform set_config('rch.coordinate_approval','reviewed',true);
  update public.basketball_locations
    set latitude=v_review.proposed_latitude,longitude=v_review.proposed_longitude,
        updated_at=now()
    where slug=v_review.court_slug;
 end if;
 insert into public.rch_court_coordinate_audit(
 court_slug,review_id,actor_id,action,from_latitude,from_longitude,
 to_latitude,to_longitude,evidence_url,review_notes)
 values(v_review.court_slug,p_review,v_actor,case when p_approve then 'approved' else 'rejected' end,
 v_court.latitude,v_court.longitude,
 case when p_approve then v_review.proposed_latitude else v_court.latitude end,
 case when p_approve then v_review.proposed_longitude else v_court.longitude end,
 v_review.evidence_url,trim(p_reason));
 return jsonb_build_object('court_slug',v_review.court_slug,'review_id',p_review,
  'approved',p_approve,'status',case when p_approve then 'approved' else 'rejected' end);
end $$;
-- Prevent ordinary staff form updates from silently bypassing evidence review.
-- Service-role maintenance with no end-user JWT is not restricted.
create function public.rch_guard_court_coordinates()
returns trigger language plpgsql security definer set search_path='' as $
begin
 if (old.latitude is distinct from new.latitude or old.longitude is distinct from new.longitude)
  and auth.uid() is not null
  and coalesce(current_setting('rch.coordinate_approval',true),'')<>'reviewed'
 then raise exception 'Court coordinates require an approved geographic review';
 end if;
 return new;
end $;
create trigger rch_guard_court_latlon_change
 before update of latitude,longitude on public.basketball_locations
 for each row execute function public.rch_guard_court_coordinates();

revoke all on function public.rch_propose_court_coordinates(text,double precision,double precision,text,text) from public,anon,authenticated;
revoke all on function public.rch_resolve_court_coordinate_review(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.rch_propose_court_coordinates(text,double precision,double precision,text,text) to authenticated;
grant execute on function public.rch_resolve_court_coordinate_review(uuid,boolean,text) to authenticated;
comment on table public.rch_court_coordinate_reviews is
'Internal evidence-reviewed coordinate corrections. Coordinate approval does not confirm a court is publicly playable or grant basketball REP.';
comment on table public.rch_court_coordinate_audit is
'Append-only audit of approved and rejected court-coordinate edits.';
commit;