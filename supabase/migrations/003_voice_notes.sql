-- 003_voice_notes.sql

create table if not exists voice_notes (
  id           uuid primary key default gen_random_uuid(),
  circle_id    uuid references circles(id) on delete cascade not null,
  sender_id    uuid references profiles(id) not null,
  storage_path text not null,
  duration_ms  int not null check (duration_ms >= 1000 and duration_ms <= 60000),
  waveform     jsonb,  -- array of amplitude values (0–1) for playback UI
  created_at   timestamptz default now() not null
);

create table if not exists voice_note_reactions (
  id            uuid primary key default gen_random_uuid(),
  voice_note_id uuid references voice_notes(id) on delete cascade not null,
  user_id       uuid references profiles(id) not null,
  emoji         text not null,
  created_at    timestamptz default now() not null,
  unique (voice_note_id, user_id)
);

-- Indexes
create index voice_notes_circle_id_idx on voice_notes(circle_id);
create index voice_notes_created_at_idx on voice_notes(created_at desc);

-- RLS
alter table voice_notes enable row level security;
alter table voice_note_reactions enable row level security;

-- Voice notes visible only to circle members
create policy "voice_notes: circle members only" on voice_notes
  for select using (
    exists (
      select 1 from circle_members
      where circle_id = voice_notes.circle_id and user_id = auth.uid()
    )
  );

-- Circle members can insert voice notes
create policy "voice_notes: circle members insert" on voice_notes
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from circle_members
      where circle_id = voice_notes.circle_id and user_id = auth.uid()
    )
  );

-- Reactions: visible to circle members
create policy "voice_note_reactions: circle members only" on voice_note_reactions
  for select using (
    exists (
      select 1 from voice_notes vn
      join circle_members cm on cm.circle_id = vn.circle_id
      where vn.id = voice_note_reactions.voice_note_id and cm.user_id = auth.uid()
    )
  );

-- Reactions: circle members can react
create policy "voice_note_reactions: insert" on voice_note_reactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from voice_notes vn
      join circle_members cm on cm.circle_id = vn.circle_id
      where vn.id = voice_note_reactions.voice_note_id and cm.user_id = auth.uid()
    )
  );

-- Reactions: only own reactions deletable
create policy "voice_note_reactions: delete own" on voice_note_reactions
  for delete using (user_id = auth.uid());

-- Storage bucket (run once via Supabase dashboard or CLI)
-- insert into storage.buckets (id, name, public) values ('voice-notes', 'voice-notes', false);
