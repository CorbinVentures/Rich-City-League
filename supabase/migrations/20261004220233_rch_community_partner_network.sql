begin;

alter table public.network_organizations
  drop constraint if exists network_organizations_organization_type_check,
  add constraint network_organizations_organization_type_check
    check (organization_type in (
      'league','tournament','program','club','team','media','creator','facility','training','other',
      'social-club','car-club','motorcycle-club','run-club','couples-club','alumni',
      'community','nonprofit','business','venue','fitness','lifestyle','professional-group'
    )),
  drop constraint if exists network_organizations_region_check,
  add constraint network_organizations_region_check
    check (region in (
      'central-virginia','hampton-roads','northern-virginia','shenandoah',
      'southwest-virginia','tri-cities','statewide','other'
    ));

alter table public.network_partner_inquiries
  drop constraint if exists network_partner_inquiries_organization_type_check,
  add constraint network_partner_inquiries_organization_type_check
    check (organization_type in (
      'league','tournament','program','club','team','media','creator','facility','training','other',
      'social-club','car-club','motorcycle-club','run-club','couples-club','alumni',
      'community','nonprofit','business','venue','fitness','lifestyle','professional-group'
    )),
  drop constraint if exists network_partner_inquiries_region_check,
  add constraint network_partner_inquiries_region_check
    check (region in (
      'central-virginia','hampton-roads','northern-virginia','shenandoah',
      'southwest-virginia','tri-cities','statewide','other'
    )),
  drop constraint if exists network_partner_inquiries_plan_interest_check,
  add constraint network_partner_inquiries_plan_interest_check
    check (plan_interest in (
      'network','amplify','premier','unsure',
      'community','boost','partner-pro','business-advertising','major-sponsor'
    ));

alter table public.network_acquisition_prospects
  drop constraint if exists network_acquisition_prospects_organization_type_check,
  add constraint network_acquisition_prospects_organization_type_check
    check (organization_type in (
      'league','tournament','program','club','team','media','creator','facility','training','other',
      'social-club','car-club','motorcycle-club','run-club','couples-club','alumni',
      'community','nonprofit','business','venue','fitness','lifestyle','professional-group'
    )),
  drop constraint if exists network_acquisition_prospects_region_check,
  add constraint network_acquisition_prospects_region_check
    check (region in (
      'central-virginia','hampton-roads','northern-virginia','shenandoah',
      'southwest-virginia','tri-cities','statewide','other'
    ));

alter table public.network_events
  drop constraint if exists network_events_event_type_check,
  add constraint network_events_event_type_check
    check (event_type in (
      'league','tournament','tryout','showcase','camp','run','clinic','media','community','other',
      'car-meet','social','networking','nightlife','fitness','couples','fundraiser','meetup','expo'
    ));

create or replace function public.import_network_acquisition_prospects(p_rows jsonb)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_name text;
  v_type text;
  v_region text;
  v_website text;
  v_source text;
  v_contact_source text;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_existing boolean;
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be a JSON array'; end if;
  if jsonb_array_length(p_rows) > 100 then raise exception 'maximum 100 prospects per import'; end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_name := trim(coalesce(v_row->>'organization_name', v_row->>'name', ''));
    v_type := coalesce(nullif(trim(v_row->>'organization_type'), ''), 'program');
    v_region := coalesce(nullif(trim(v_row->>'region'), ''), 'central-virginia');
    v_website := nullif(trim(v_row->>'website_url'), '');
    v_source := trim(coalesce(v_row->>'source_url', ''));
    v_contact_source := nullif(trim(v_row->>'contact_source_url'), '');

    if char_length(v_name) < 2 then raise exception 'organization_name is required'; end if;
    if v_type not in (
      'league','tournament','program','club','team','media','creator','facility','training','other',
      'social-club','car-club','motorcycle-club','run-club','couples-club','alumni',
      'community','nonprofit','business','venue','fitness','lifestyle','professional-group'
    ) then raise exception 'invalid organization_type for %', v_name; end if;
    if v_region not in (
      'central-virginia','hampton-roads','northern-virginia','shenandoah',
      'southwest-virginia','tri-cities','statewide','other'
    ) then raise exception 'invalid region for %', v_name; end if;
    if v_source !~* '^https?://' then raise exception 'source_url must use http or https for %', v_name; end if;
    if v_website is not null and v_website !~* '^https?://' then raise exception 'website_url must use http or https for %', v_name; end if;
    if v_contact_source is not null and v_contact_source !~* '^https?://' then raise exception 'contact_source_url must use http or https for %', v_name; end if;

    select exists(
      select 1 from public.network_organizations o
      where lower(trim(o.name)) = lower(v_name)
         or (v_website is not null and o.website_url is not null and lower(trim(o.website_url)) = lower(v_website))
      union all
      select 1 from public.network_acquisition_prospects p
      where p.status <> 'archived'
        and (lower(trim(p.organization_name)) = lower(v_name)
          or (v_website is not null and p.website_url is not null and lower(trim(p.website_url)) = lower(v_website)))
    ) into v_existing;

    if v_existing then
      v_duplicates := v_duplicates + 1;
      continue;
    end if;

    insert into public.network_acquisition_prospects(
      organization_name, organization_type, region, city, description,
      website_url, instagram_url, facebook_url, x_url, youtube_url,
      source_url, source_label, source_checked_at,
      contact_name, contact_role, contact_email, contact_phone,
      contact_instagram_url, contact_source_url, contact_checked_at,
      notes, status, outreach_status, created_by, updated_by
    ) values (
      v_name, v_type, v_region, nullif(trim(v_row->>'city'), ''), nullif(trim(v_row->>'description'), ''),
      v_website, nullif(trim(v_row->>'instagram_url'), ''), nullif(trim(v_row->>'facebook_url'), ''), nullif(trim(v_row->>'x_url'), ''), nullif(trim(v_row->>'youtube_url'), ''),
      v_source, nullif(trim(v_row->>'source_label'), ''), coalesce(nullif(v_row->>'source_checked_at','')::timestamptz, now()),
      nullif(trim(v_row->>'contact_name'), ''), nullif(trim(v_row->>'contact_role'), ''), nullif(trim(v_row->>'contact_email'), ''), nullif(trim(v_row->>'contact_phone'), ''),
      nullif(trim(v_row->>'contact_instagram_url'), ''), v_contact_source,
      coalesce(nullif(v_row->>'contact_checked_at','')::timestamptz, case when nullif(trim(v_row->>'contact_name'), '') is not null
        or nullif(trim(v_row->>'contact_email'), '') is not null
        or nullif(trim(v_row->>'contact_phone'), '') is not null
        or nullif(trim(v_row->>'contact_instagram_url'), '') is not null then now() else null end),
      nullif(trim(v_row->>'notes'), ''), coalesce(nullif(trim(v_row->>'status'), ''), 'staged'), coalesce(nullif(trim(v_row->>'outreach_status'), ''), 'not-contacted'), (select auth.uid()), (select auth.uid())
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'duplicates', v_duplicates, 'total', jsonb_array_length(p_rows));
end;
$$;

commit;
