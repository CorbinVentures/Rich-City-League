alter table public.profiles add column if not exists is_vip boolean not null default false;
alter table public.profiles add column if not exists vip_label text not null default 'VIP';

comment on column public.profiles.is_vip is 'Admin-controlled VIP verification for star players, celebrities, and notable RCL members.';
comment on column public.profiles.vip_label is 'Public verification badge label; defaults to VIP.';

create or replace function public.protect_vip_profile_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.is_vip is distinct from old.is_vip or new.vip_label is distinct from old.vip_label)
     and not public.is_admin() then
    raise exception 'VIP verification is controlled by RCL administrators';
  end if;
  return new;
end; $$;

drop trigger if exists protect_vip_profile_fields on public.profiles;
create trigger protect_vip_profile_fields
before update on public.profiles
for each row execute function public.protect_vip_profile_fields();
