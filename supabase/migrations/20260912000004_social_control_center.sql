-- Make social reactions configurable by administrators and preserve moderated content.

create table if not exists public.reaction_types (
  id text primary key,
  emoji text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.reaction_types (id, emoji, label, sort_order)
values
  ('bucket', '🏀', 'BUCKET', 10),
  ('heat', '🔥', 'HEAT CHECK', 20),
  ('strong', '💪', 'TOUGH', 30),
  ('locked', '🔒', 'LOCKED UP', 40),
  ('money', '🎯', 'PURE', 50),
  ('watch', '👀', 'I SEE YOU', 60),
  ('king', '👏', 'SALUTE', 70),
  ('certified', '🧊', 'COLD BLOODED', 80),
  ('highlight', '😂', 'THAT''S CRAZY', 90),
  ('champ', '🏆', 'CHAMPIONSHIP', 100)
on conflict (id) do update
set emoji = excluded.emoji, label = excluded.label, sort_order = excluded.sort_order;

alter table public.reactions drop constraint if exists reactions_type_check;
alter table public.reactions
  add constraint reactions_type_fkey
  foreign key (type) references public.reaction_types(id);

-- Keep the most recent reaction when old data contains multiple reactions per user/post.
with ranked as (
  select id, row_number() over (
    partition by post_id, user_id
    order by created_at desc, id desc
  ) as row_number
  from public.reactions
)
delete from public.reactions
where id in (select id from ranked where row_number > 1);

drop index if exists public.reactions_post_user_type_idx;
create unique index if not exists reactions_one_per_post_idx
  on public.reactions (post_id, user_id);

alter table public.audit_logs
  add column if not exists resource_type text,
  add column if not exists resource_id uuid,
  add column if not exists reason text,
  add column if not exists before_state jsonb,
  add column if not exists after_state jsonb;

alter table public.reaction_types enable row level security;
drop policy if exists "public reaction types" on public.reaction_types;
create policy "public reaction types"
  on public.reaction_types for select using (is_active or public.is_staff_or_admin());
drop policy if exists "staff manage reaction types" on public.reaction_types;
create policy "staff manage reaction types"
  on public.reaction_types for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

drop function if exists public.log_action(uuid, text, text);
create or replace function public.log_action(
  target_user_id uuid,
  action_text text,
  details_text text,
  target_resource_type text default null,
  target_resource_id uuid default null,
  action_reason text default null,
  previous_state jsonb default null,
  next_state jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    user_id, action, details, resource_type, resource_id, reason, before_state, after_state
  )
  values (
    target_user_id, action_text, details_text, target_resource_type,
    target_resource_id, action_reason, previous_state, next_state
  );
end;
$$;
