-- ─────────────────────────────────────────────────────────────────
-- E2EE key exchange tables
-- Apply via Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- 1. Per-user ECDH P-256 public keys
--    Each device generates a key pair on first launch.
--    Private key stays in SecureStore; public key is uploaded here.
CREATE TABLE IF NOT EXISTS friendspot.user_public_keys (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key    TEXT NOT NULL,  -- SPKI base64, P-256
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE friendspot.user_public_keys ENABLE ROW LEVEL SECURITY;

-- Anyone can read a public key (needed to encrypt for that person)
CREATE POLICY "public keys are readable by authenticated users"
  ON friendspot.user_public_keys FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the owner can upsert their own key
CREATE POLICY "users can upsert their own public key"
  ON friendspot.user_public_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update their own public key"
  ON friendspot.user_public_keys FOR UPDATE
  USING (auth.uid() = user_id);


-- 2. Per-circle per-member encrypted circle keys
--    circle_key is the AES-256-GCM symmetric key used to encrypt
--    voice notes and photos in that circle.
--    It is stored here encrypted with the member's ECDH-derived wrap key.
CREATE TABLE IF NOT EXISTS friendspot.circle_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     UUID NOT NULL REFERENCES friendspot.circles(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The AES-256 circle key, wrapped with an AES-KW key derived via ECDH
  -- between the inviter's private key and this user's public key.
  -- Stored as JSON: { "iv": "<base64>", "data": "<base64>" }
  encrypted_key TEXT NOT NULL,
  -- The ephemeral public key used by the inviter during ECDH.
  -- The recipient needs this to reconstruct the same shared secret.
  ephemeral_pub TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

ALTER TABLE friendspot.circle_keys ENABLE ROW LEVEL SECURITY;

-- Members of a circle can read their own encrypted key
CREATE POLICY "members can read their own circle key"
  ON friendspot.circle_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can insert keys (inviter adds a key for the joiner)
CREATE POLICY "authenticated users can insert circle keys"
  ON friendspot.circle_keys FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only the key owner can delete their entry
CREATE POLICY "users can delete their own circle key"
  ON friendspot.circle_keys FOR DELETE
  USING (auth.uid() = user_id);


-- 3. Pending key shares
--    When user A invites user B by code, B might not have registered their
--    public key yet. This table lets B register their key and claim the share.
CREATE TABLE IF NOT EXISTS friendspot.pending_key_shares (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code   TEXT NOT NULL,
  circle_id     UUID NOT NULL REFERENCES friendspot.circles(id) ON DELETE CASCADE,
  -- The current circle key, encrypted for the server to re-wrap for the joiner.
  -- Encrypted with the inviter's own key for transport; the joiner will request
  -- re-encryption via Edge Function after providing their public key.
  wrapped_for_server TEXT,  -- NULL until supported; currently unused
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at    TIMESTAMPTZ,
  UNIQUE (invite_code)
);

ALTER TABLE friendspot.pending_key_shares ENABLE ROW LEVEL SECURITY;

-- Joiners can read a pending share by invite code
CREATE POLICY "anyone authenticated can read pending shares"
  ON friendspot.pending_key_shares FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert pending shares"
  ON friendspot.pending_key_shares FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update pending shares"
  ON friendspot.pending_key_shares FOR UPDATE
  USING (auth.role() = 'authenticated');
