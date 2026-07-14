-- PolyNet: profile social links / WhatsApp + Polymart in-app chat
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

-- 1. Profile additions -------------------------------------------------
alter table profiles
  add column if not exists whatsapp_number text,
  add column if not exists social_links jsonb not null default '[]'::jsonb;

-- 2. Conversations -------------------------------------------------------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references marketplace_listings(id) on delete cascade,
  buyer_id uuid references profiles(id) on delete cascade,
  seller_id uuid references profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (listing_id, buyer_id)
);

alter table conversations enable row level security;

create policy "Participants can view their conversations"
  on conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Buyers can start a conversation"
  on conversations for insert
  with check (auth.uid() = buyer_id);

create policy "Participants can update last message preview"
  on conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 3. Chat messages -------------------------------------------------------
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;

create policy "Participants can view messages in their conversations"
  on chat_messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = chat_messages.conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

create policy "Participants can send messages in their conversations"
  on chat_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = chat_messages.conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

create index if not exists chat_messages_conversation_idx on chat_messages(conversation_id, created_at);
create index if not exists conversations_buyer_idx on conversations(buyer_id);
create index if not exists conversations_seller_idx on conversations(seller_id);
