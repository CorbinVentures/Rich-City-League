-- Fix: Strengthen conversation membership write policy.
-- Previous policy allowed any authenticated user to add themselves to
-- any conversation by guessing the ID. Enforce creator authorization.

drop policy if exists "Users can join conversations" on public.conversations;

create policy "Users can join conversations"
  on public.conversations
  for insert
  to authenticated
  with check (
    -- Must be the creator or authorized by admin
    creator_id = auth.uid()
    or public.is_staff_or_admin()
  );

-- Update members join policy to enforce creator ownership
drop policy if exists "Users can add members" on public.conversation_members;

create policy "Users can add members"
  on public.conversation_members
  for insert
  to authenticated
  with check (
    -- Profile must exist and user must be the member (joining) or conversation creator
    profile_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.creator_id = auth.uid()
    )
    or public.is_staff_or_admin()
  );
