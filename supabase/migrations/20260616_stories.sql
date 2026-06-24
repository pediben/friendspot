-- ─────────────────────────────────────────────────────────────
-- Stories (24-hour ephemeral content)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS friendspot.stories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid        NOT NULL REFERENCES friendspot.profiles(id) ON DELETE CASCADE,
  media_url   text        NOT NULL,          -- storage path in 'stories' bucket
  media_type  text        NOT NULL DEFAULT 'photo', -- 'photo' | 'video'
  caption     text,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stories_author_idx    ON friendspot.stories(author_id);
CREATE INDEX IF NOT EXISTS stories_expires_idx   ON friendspot.stories(expires_at);

-- Story views (for "seen by" indicator)
CREATE TABLE IF NOT EXISTS friendspot.story_views (
  story_id   uuid        NOT NULL REFERENCES friendspot.stories(id) ON DELETE CASCADE,
  viewer_id  uuid        NOT NULL REFERENCES friendspot.profiles(id) ON DELETE CASCADE,
  viewed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE friendspot.stories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendspot.story_views ENABLE ROW LEVEL SECURITY;

-- Authors can insert / delete their own stories
CREATE POLICY "stories_insert" ON friendspot.stories
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "stories_delete" ON friendspot.stories
  FOR DELETE USING (auth.uid() = author_id);

-- Visible to anyone in a shared circle (or just friends-only — simplified: any auth user)
CREATE POLICY "stories_select" ON friendspot.stories
  FOR SELECT USING (
    -- Not expired
    expires_at > now()
    AND (
      -- My own stories
      auth.uid() = author_id
      OR
      -- Author is in a shared circle with me
      EXISTS (
        SELECT 1 FROM friendspot.circle_members cm1
        JOIN friendspot.circle_members cm2
          ON cm1.circle_id = cm2.circle_id
        WHERE cm1.user_id = auth.uid()
          AND cm2.user_id = friendspot.stories.author_id
      )
    )
  );

-- Views: insert by authenticated users, read own views or author seeing who viewed
CREATE POLICY "story_views_insert" ON friendspot.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "story_views_select" ON friendspot.story_views
  FOR SELECT USING (
    auth.uid() = viewer_id
    OR EXISTS (
      SELECT 1 FROM friendspot.stories s
      WHERE s.id = story_id AND s.author_id = auth.uid()
    )
  );

-- ─── Supabase Storage bucket (run once via dashboard or CLI) ──
-- supabase storage create stories --public=false
