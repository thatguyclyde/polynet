-- Notifications table for in-app activity alerts
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'message', 'report', 'system')),
  content text not null,
  read boolean not null default false,
  source_user_id uuid null references profiles(id) on delete set null,
  source_type text null,
  source_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_read_created
  on notifications (user_id, read, created_at desc);

alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can insert notifications"
  on notifications for insert
  with check (auth.role() = 'authenticated');

-- Optional: keep all app activity readable from the client side via a
-- single table, with unread badges and a small notification panel.

-- Triggered inserts for common activity types so the notification table is
-- populated even if a client forgets to call the helper explicitly.
create or replace function notify_on_like_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and new.user_id <> auth.uid() then
    insert into notifications (user_id, type, content, source_user_id, source_type, source_id, metadata)
    values (
      new.user_id,
      'like',
      'Someone liked your post',
      auth.uid(),
      'feed_post',
      new.post_id,
      jsonb_build_object('post_id', new.post_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_like_insert on post_likes;
create trigger trg_notify_on_like_insert
  after insert on post_likes
  for each row execute function notify_on_like_insert();

create or replace function notify_on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare _post_author uuid;
begin
  select author_id into _post_author from feed_posts where id = new.post_id;

  if _post_author is not null and _post_author <> new.author_id then
    insert into notifications (user_id, type, content, source_user_id, source_type, source_id, metadata)
    values (
      _post_author,
      'comment',
      'Someone commented on your post',
      new.author_id,
      'feed_post',
      new.post_id,
      jsonb_build_object('post_id', new.post_id, 'comment_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_comment_insert on feed_comments;
create trigger trg_notify_on_comment_insert
  after insert on feed_comments
  for each row execute function notify_on_comment_insert();

create or replace function notify_on_chat_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare _recipient uuid;
begin
  select case when buyer_id = new.sender_id then seller_id else buyer_id end
  into _recipient
  from conversations
  where id = new.conversation_id;

  if _recipient is not null and _recipient <> new.sender_id then
    insert into notifications (user_id, type, content, source_user_id, source_type, source_id, metadata)
    values (
      _recipient,
      'message',
      'You have a new message',
      new.sender_id,
      'chat_message',
      new.id,
      jsonb_build_object('conversation_id', new.conversation_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_chat_message_insert on chat_messages;
create trigger trg_notify_on_chat_message_insert
  after insert on chat_messages
  for each row execute function notify_on_chat_message_insert();

create or replace function notify_on_report_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, type, content, source_user_id, source_type, source_id, metadata)
  values (
    new.reporter_id,
    'report',
    'Your report was submitted successfully',
    new.reporter_id,
    'report',
    new.id,
    jsonb_build_object('report_id', new.id, 'target_type', new.target_type)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_on_report_insert on reports;
create trigger trg_notify_on_report_insert
  after insert on reports
  for each row execute function notify_on_report_insert();
