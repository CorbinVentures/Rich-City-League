-- Production applied this migration to restore the founder's admin authorization.
-- Guard the replay so a fresh local database without that production profile remains valid.
begin;
alter table public.profiles disable trigger protect_profile_authorization_fields;
alter table public.profiles disable trigger protect_profile_privileged_fields;
insert into public.profile_roles(profile_id,role,status,verified_at,verified_by)
select id,'admin'::public.app_role,'active',now(),id from public.profiles where id='4abe61a2-9e9b-4f60-833d-22f6159a0802'
on conflict (profile_id,role) do update set status='active',verified_at=excluded.verified_at,verified_by=excluded.verified_by;
update public.profiles set role='admin'::public.app_role where id='4abe61a2-9e9b-4f60-833d-22f6159a0802';
alter table public.profiles enable trigger protect_profile_privileged_fields;
alter table public.profiles enable trigger protect_profile_authorization_fields;
commit;
