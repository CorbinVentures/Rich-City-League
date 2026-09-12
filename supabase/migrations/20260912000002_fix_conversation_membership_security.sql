-- Fix: Strengthen conversation membership write policy.
-- Previous policy allowed any authenticated user to add themselves to
-- any conversation by guessing the ID. Enforce creator authorization.

drop policy if exists "Users can join conversations" on public.conversations;

-- Update members join policy to enforce creator ownership
drop policy if exists "conversation creators manage membership" on public.conversation_members;
drop policy if exists "Users can add members" on public.conversation_members;

create policy "Users can add members"
  on public.conversation_members
  for insert
  to authenticated
  with check (
    -- Only the conversation creator or staff can add members.
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
    or public.is_staff_or_admin()
  );
