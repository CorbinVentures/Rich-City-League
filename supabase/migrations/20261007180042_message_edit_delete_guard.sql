begin;

create or replace function public.prevent_message_edits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $message_guard$
begin
  if public.is_staff_or_admin() then
    return new;
  end if;

  if auth.uid() is null or old.sender_id <> auth.uid() then
    raise exception 'Only the sender can modify this message';
  end if;

  if new.id is distinct from old.id
    or new.conversation_id is distinct from old.conversation_id
    or new.sender_id is distinct from old.sender_id
    or new.attachment_url is distinct from old.attachment_url
    or new.reply_to_id is distinct from old.reply_to_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Message identity and attachments cannot be changed';
  end if;

  if old.deleted_at is not null then
    if new is distinct from old then
      raise exception 'Deleted messages cannot be modified';
    end if;
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if new.deleted_at is null
      or new.body is distinct from old.body
      or new.edited_at is distinct from old.edited_at
    then
      raise exception 'Invalid message deletion';
    end if;
    return new;
  end if;

  if new.body is distinct from old.body then
    if char_length(trim(new.body)) = 0 then
      raise exception 'Message body cannot be empty';
    end if;
    new.edited_at := clock_timestamp();
    return new;
  end if;

  if new.edited_at is distinct from old.edited_at then
    raise exception 'Edit timestamp can only change with message content';
  end if;

  return new;
end;
$message_guard$;

revoke all on function public.prevent_message_edits() from public, anon, authenticated;

commit;
