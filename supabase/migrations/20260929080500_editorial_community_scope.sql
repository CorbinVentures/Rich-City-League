begin;

alter table public.editorial_publications
  drop constraint if exists editorial_publications_account_key_check;

alter table public.editorial_publications
  add constraint editorial_publications_account_key_check
  check (account_key in ('rcl-business','rva-hoops','rcl-community'));

comment on table public.editorial_publications is
  'Tracks sourced automated publications for RCL Business, RVA Hoops and RCL Community.';

commit;
