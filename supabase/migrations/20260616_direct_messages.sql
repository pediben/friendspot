-- Direct messages (1-on-1) between users who share at least one Spot
-- ─────────────────────────────────────────────────────────────────

create table if not exists friendspot.direct_messages (
  id               uuid primary key default gen_random_uuid(),
  sender_id        uuid not null references friendspot.profiles(id) on delete cascade,
  recipient_id     uuid not null references friendspot.profiles(id) on delete cascade,
  kind             text not null default 'text' check (kind in ('text', 'voice', 'photo')),
  body             text,
  media_url        text,
  duration_seconds int,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);

-- Index for fetching threads quickly
create index if not exists dm_sender_recipient on friendspot.direct_messages (sender_id, recipient_id, created_at desc);
create index if not exists dm_recipient_sender on friendspot.direct_messages (recipient_id, sender_id, created_at desc);

alter table friendspot.direct_messages enable row level security;

-- Participants can see their own messages
create policy "dm: participants can view"
  on friendspot.direct_messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Sender inserts; must share a Spot with recipient
create policy "dm: sender can insert"
  on friendspot.direct_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from friendspot.circle_members a
      join friendspot.circle_members b
        on a.circle_id = b.circle_id
      where a.user_id = auth.uid()
        and b.user_id = recipient_id
    )
  );

-- Recipient can mark as read (update read_at only)
create policy "dm: recipient can mark read"
  on friendspot.direct_messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Participants can delete their own sent messages
create policy "dm: sender can delete"
  on friendspot.direct_messages for delete
  using (sender_id = auth.uid());
