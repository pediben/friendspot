-- ============================================================
-- Friendspot: Circle Private Rooms
-- Applied: 2026-06-15
-- ============================================================
-- Adds private sub-rooms scoped to each circle, mirroring
-- Deevan's Private Rooms feature. Two modes:
--   standard  — 6-digit passcode, bcrypt-hashed server-side
--   encrypted — word passphrase is the LiveKit E2EE key seed;
--               server is blind to audio content
-- ============================================================

-- Ensure pgcrypto is available (for crypt/gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Ensure the circles table has a livekit_room column
-- (the edge function reads this; the types were generated without it)
ALTER TABLE friendspot.circles
  ADD COLUMN IF NOT EXISTS livekit_room text;

-- Back-fill: set livekit_room = 'circle-{id}' for any existing circles
UPDATE friendspot.circles
  SET livekit_room = 'circle-' || id::text
  WHERE livekit_room IS NULL;

-- Make it non-nullable with a default going forward
ALTER TABLE friendspot.circles
  ALTER COLUMN livekit_room SET DEFAULT 'circle-' || gen_random_uuid()::text;

-- ------------------------------------------------------------------
-- TABLE: circle_private_rooms
-- ------------------------------------------------------------------
CREATE TABLE friendspot.circle_private_rooms (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id   uuid        NOT NULL REFERENCES friendspot.circles(id) ON DELETE CASCADE,
  created_by  uuid        NOT NULL REFERENCES auth.users(id),
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  description text,
  room_mode   text        NOT NULL CHECK (room_mode IN ('standard', 'encrypted')),
  -- Human-readable code, XXXXXXXX (8 chars, no separators stored).
  -- Displayed as XXXX-XXXX in UI.
  room_code   text        NOT NULL CHECK (room_code ~ '^[0-9A-Z]{8}$'),
  -- bcrypt hash of 6-digit passcode — only set for standard rooms.
  passcode_hash text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Standard rooms MUST have a passcode hash
  CONSTRAINT standard_needs_hash CHECK (
    room_mode != 'standard' OR passcode_hash IS NOT NULL
  )
);

-- Active room codes must be globally unique
CREATE UNIQUE INDEX circle_private_rooms_code_active_idx
  ON friendspot.circle_private_rooms(room_code)
  WHERE is_active = true;

-- Index for listing rooms per circle
CREATE INDEX circle_private_rooms_circle_id_idx
  ON friendspot.circle_private_rooms(circle_id)
  WHERE is_active = true;

-- ------------------------------------------------------------------
-- TABLE: circle_private_room_members
-- Tracks which users have been granted access to a private room.
-- For standard rooms: populated by join_standard_private_room().
-- For encrypted rooms: populated on first token request (server-blind).
-- ------------------------------------------------------------------
CREATE TABLE friendspot.circle_private_room_members (
  private_room_id uuid        NOT NULL REFERENCES friendspot.circle_private_rooms(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (private_room_id, user_id)
);

CREATE INDEX circle_private_room_members_user_idx
  ON friendspot.circle_private_room_members(user_id);

-- ------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------------
ALTER TABLE friendspot.circle_private_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendspot.circle_private_room_members ENABLE ROW LEVEL SECURITY;

-- Circle members can see private rooms in their circle (no passcode_hash)
CREATE POLICY "circle members see private rooms"
  ON friendspot.circle_private_rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendspot.circle_members cm
      WHERE cm.circle_id = friendspot.circle_private_rooms.circle_id
        AND cm.user_id   = auth.uid()
    )
  );

-- Circle members can create private rooms in their circle
CREATE POLICY "circle members create private rooms"
  ON friendspot.circle_private_rooms
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM friendspot.circle_members cm
      WHERE cm.circle_id = friendspot.circle_private_rooms.circle_id
        AND cm.user_id   = auth.uid()
    )
  );

-- Room creator (or circle admin/owner) can update (e.g. deactivate)
CREATE POLICY "creator or admin can update private room"
  ON friendspot.circle_private_rooms
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendspot.circle_members cm
      WHERE cm.circle_id = friendspot.circle_private_rooms.circle_id
        AND cm.user_id   = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

-- Users can see their own membership rows
CREATE POLICY "see own private room membership"
  ON friendspot.circle_private_room_members
  FOR SELECT
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------
-- FUNCTION: find_private_room_by_code
-- Returns room metadata (no passcode_hash) for the code entry screen.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION friendspot.find_private_room_by_code(p_code text)
RETURNS TABLE (
  id          uuid,
  circle_id   uuid,
  name        text,
  room_mode   text,
  is_active   boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = friendspot, public, extensions
AS $$
  SELECT r.id, r.circle_id, r.name, r.room_mode, r.is_active
  FROM   friendspot.circle_private_rooms r
  WHERE  r.room_code  = upper(regexp_replace(p_code, '[\s\-]+', '', 'g'))
    AND  r.is_active  = true
  LIMIT 1;
$$;

-- ------------------------------------------------------------------
-- FUNCTION: join_standard_private_room
-- Verifies the 6-digit passcode using pgcrypto, then grants access
-- by inserting into circle_private_room_members.
-- Returns the room row on success; raises an exception on failure.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION friendspot.join_standard_private_room(
  p_code     text,
  p_passcode text
)
RETURNS TABLE (
  id        uuid,
  circle_id uuid,
  name      text,
  room_mode text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friendspot, public, extensions
AS $$
DECLARE
  v_room friendspot.circle_private_rooms;
BEGIN
  -- Look up the room
  SELECT * INTO v_room
  FROM   friendspot.circle_private_rooms
  WHERE  room_code = upper(regexp_replace(p_code, '[\s\-]+', '', 'g'))
    AND  is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_room.room_mode != 'standard' THEN
    RAISE EXCEPTION 'Room is not a standard-passcode room' USING ERRCODE = 'P0003';
  END IF;

  -- Verify passcode against bcrypt hash
  IF extensions.crypt(p_passcode, v_room.passcode_hash) != v_room.passcode_hash THEN
    RAISE EXCEPTION 'Incorrect passcode' USING ERRCODE = 'P0004';
  END IF;

  -- Grant membership (idempotent)
  INSERT INTO friendspot.circle_private_room_members (private_room_id, user_id)
  VALUES (v_room.id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_room.id, v_room.circle_id, v_room.name, v_room.room_mode;
END;
$$;

-- ------------------------------------------------------------------
-- FUNCTION: create_standard_private_room
-- Hashes the passcode server-side so the client never stores the hash.
-- Returns the new room's id.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION friendspot.create_standard_private_room(
  p_circle_id   uuid,
  p_name        text,
  p_room_code   text,  -- normalized 8-char code (no dashes)
  p_passcode    text   -- plain 6-digit code; hashed here
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friendspot, public, extensions
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Caller must be a circle member
  IF NOT EXISTS (
    SELECT 1 FROM friendspot.circle_members
    WHERE circle_id = p_circle_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a circle member' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO friendspot.circle_private_rooms (
    circle_id, created_by, name, room_mode, room_code, passcode_hash
  ) VALUES (
    p_circle_id,
    auth.uid(),
    p_name,
    'standard',
    upper(regexp_replace(p_room_code, '[\s\-]+', '', 'g')),
    extensions.crypt(p_passcode, extensions.gen_salt('bf'))
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ------------------------------------------------------------------
-- FUNCTION: grant_encrypted_room_access
-- For encrypted rooms, we can't verify the passphrase server-side
-- (server is blind). Just verify circle membership then grant access.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION friendspot.grant_encrypted_room_access(
  p_room_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friendspot, public
AS $$
DECLARE
  v_circle_id uuid;
BEGIN
  SELECT circle_id INTO v_circle_id
  FROM   friendspot.circle_private_rooms
  WHERE  id = p_room_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Caller must be a circle member
  IF NOT EXISTS (
    SELECT 1 FROM friendspot.circle_members
    WHERE circle_id = v_circle_id AND user_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO friendspot.circle_private_room_members (private_room_id, user_id)
  VALUES (p_room_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;
