-- Social feeds need to read reaction totals for published posts.
-- Keep writes restricted to the authenticated user who owns the reaction.
alter table public.reactions enable row level security;

create policy "public view reactions"
  on public.reactions
  for select
  using (true);
