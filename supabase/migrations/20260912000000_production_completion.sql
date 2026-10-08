-- Close the message authorization gap left by the initial social migration.
-- A sender may soft-delete a message, but may not rewrite its content or identity.

create or replace function public.prevent_message_edits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff_or_admin()
    and (
      new.conversation_id is distinct from old.conversation_id
      or new.sender_id is distinct from old.sender_id
      or new.body is distinct from old.body
      or new.attachment_url is distinct from old.attachment_url
      or new.reply_to_id is distinct from old.reply_to_id
    ) then
    raise exception 'Message content cannot be edited';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_message_edits on public.messages;
create trigger protect_message_edits
before update on public.messages
for each row execute procedure public.prevent_message_edits();

drop policy if exists "senders delete messages" on public.messages;
create policy "senders delete messages"
on public.messages for delete
using (sender_id = auth.uid() or public.is_staff_or_admin());
