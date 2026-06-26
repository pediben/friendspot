-- ─────────────────────────────────────────────────────────────────────────
-- Growth system: push_tokens · contact_imports · spot_invites
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Push tokens ───────────────────────────────────────────────────────
-- Stores one row per device per user. A user can have multiple devices.
CREATE TABLE IF NOT EXISTS friendspot.push_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES friendspot.profiles(id) ON DELETE CASCADE,
  token      text        NOT NULL,
  platform   text        NOT NULL DEFAULT 'ios',  -- 'ios' | 'android'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON friendspot.push_tokens(user_id);

ALTER TABLE friendspot.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_own" ON friendspot.push_tokens
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 2. Contact imports ───────────────────────────────────────────────────
-- Each row = one phone number from a user's address book (E.164, e.g. +12125550123).
-- Used to match new sign-ups against existing users' contact lists.
CREATE TABLE IF NOT EXISTS friendspot.contact_imports (
  user_id    uuid NOT NULL REFERENCES friendspot.profiles(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  PRIMARY KEY (user_id, phone_e164)
);

CREATE INDEX IF NOT EXISTS contact_imports_phone_idx ON friendspot.contact_imports(phone_e164);

ALTER TABLE friendspot.contact_imports ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own contact list
CREATE POLICY "contact_imports_own" ON friendspot.contact_imports
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- The notify-new-member Edge Function runs as service_role so it bypasses RLS.


-- ── 3. Spot invites ──────────────────────────────────────────────────────
-- Short-lived invite codes for sharing a Spot via link or SMS.
CREATE TABLE IF NOT EXISTS friendspot.spot_invites (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  uuid        NOT NULL REFERENCES friendspot.circles(id) ON DELETE CASCADE,
  created_by uuid        NOT NULL REFERENCES friendspot.profiles(id),
  code       text        NOT NULL UNIQUE,          -- 6-char Crockford Base32
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  uses       int         NOT NULL DEFAULT 0,
  max_uses   int         NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spot_invites_code_idx    ON friendspot.spot_invites(code);
CREATE INDEX IF NOT EXISTS spot_invites_circle_idx  ON friendspot.spot_invites(circle_id);

ALTER TABLE friendspot.spot_invites ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can look up an invite by code (to preview & join)
CREATE POLICY "spot_invites_select_by_code" ON friendspot.spot_invites
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND expires_at > now()
    AND uses < max_uses
  );

-- Only Spot admins/members can create invites
CREATE POLICY "spot_invites_insert" ON friendspot.spot_invites
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM friendspot.circle_members
      WHERE circle_id = spot_invites.circle_id
        AND user_id = auth.uid()
    )
  );

-- Creator can delete their own invite
CREATE POLICY "spot_invites_delete" ON friendspot.spot_invites
  FOR DELETE USING (auth.uid() = created_by);


-- ── 4. SECURITY DEFINER: join_spot_by_invite ─────────────────────────────
-- Called from the app to join a Spot using an invite code.
-- Atomically: validates code, increments use count, adds member.
CREATE OR REPLACE FUNCTION friendspot.join_spot_by_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friendspot
AS $$
DECLARE
  v_invite  friendspot.spot_invites%ROWTYPE;
  v_circle  friendspot.circles%ROWTYPE;
BEGIN
  -- Lock the invite row
  SELECT * INTO v_invite
  FROM friendspot.spot_invites
  WHERE code = p_code
    AND expires_at > now()
    AND uses < max_uses
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invite not found or expired');
  END IF;

  SELECT * INTO v_circle FROM friendspot.circles WHERE id = v_invite.circle_id;

  -- Already a member?
  IF EXISTS (
    SELECT 1 FROM friendspot.circle_members
    WHERE circle_id = v_invite.circle_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'circle_id',   v_circle.id,
      'circle_name', v_circle.name,
      'already_member', true
    );
  END IF;

  -- Add member
  INSERT INTO friendspot.circle_members (circle_id, user_id, role, invited_by)
  VALUES (v_invite.circle_id, auth.uid(), 'member', v_invite.created_by);

  -- Increment use count
  UPDATE friendspot.spot_invites SET uses = uses + 1 WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'circle_id',   v_circle.id,
    'circle_name', v_circle.name,
    'joined', true
  );
END;
$$;
