-- Trigger: call send-push-notification when a new chat message is inserted
create or replace function notify_on_new_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Call the Edge Function to notify the recipient. Wrap the HTTP call
  -- in an exception handler so that if pg_net isn't available or the
  -- call fails for any reason it doesn't abort the INSERT of the chat
  -- message itself (we don't want push failures to break chat delivery).
  BEGIN
    perform net.http_post(
      url := '<SUPABASE_PROJECT_URL>/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'title', 'New message',
        'body', coalesce(new.body, 'You have a new message'),
        'url', '/chats',
        'user_id', new.recipient_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the failure as a NOTICE so it's visible in DB logs but
    -- crucially do NOT re-raise — allow the insert to succeed.
    RAISE NOTICE 'notify_on_new_chat_message: push call failed: %', SQLERRM;
  END;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_new_chat_message on chat_messages;
create trigger trg_notify_on_new_chat_message
  after insert on chat_messages
  for each row execute function notify_on_new_chat_message();
