-- Keep message writes scoped to the sender's authorized conversation and notify
-- recipients through the existing notification system.

drop policy if exists "senders delete messages" on public.messages;

create policy "senders manage own messages"
  on public.messages
  for update
  to authenticated
  using (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  )
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, title, body, link)
  select cm.profile_id,
         new.sender_id,
         'message',
         'NEW MESSAGE',
         'You have a new RCL Direct message.',
         '/messages/' || new.conversation_id
  from public.conversation_members cm
  left join public.notification_preferences np on np.profile_id = cm.profile_id
  left join public.blocks b on b.blocker_id = cm.profile_id and b.blocked_id = new.sender_id
  where cm.conversation_id = new.conversation_id
    and cm.profile_id <> new.sender_id
    and coalesce(np.messages, true)
    and b.blocker_id is null;
  return new;
end;
$$;

drop trigger if exists notify_new_message_after_insert on public.messages;
create trigger notify_new_message_after_insert
  after insert on public.messages
  for each row execute procedure public.notify_new_message();

alter publication supabase_realtime add table public.conversation_members;
