begin;

alter table public.message_reactions
  drop constraint if exists message_reactions_reaction_key_check;

alter table public.message_reactions
  add constraint message_reactions_reaction_key_check
  check (reaction_key in ('like','love','fire','laugh','wow','clutch','hoop','facts','watch'));

commit;
