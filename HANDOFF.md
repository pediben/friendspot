# Friendspot — Dev Handoff

**Date:** June 15, 2026  
**Status:** Schema upgraded, TypeScript clean. Auth blocked on Twilio. Resend DNS in progress.

---

## What's Working ✅

- Full React Native / Expo SDK 51 project scaffolded
- App runs on iPhone (Expo Go) — onboarding + phone entry screens visible
- Supabase project wired up (using Deevan.app project, `friendspot` schema)
- **v2 schema applied** (16 tables, all with RLS enabled):
  - profiles, contact_imports, blocks, reports
  - circles, circle_members, circle_invites
  - circle_messages (voice + text + photo unified), message_reactions
  - direct_messages
  - moments, moment_attendees, photos
  - expenses (integer cents), expense_splits, notifications
  - SECURITY DEFINER helper functions (no RLS recursion)
- TypeScript clean (only pre-existing Deno + crypto.ts strict-TS5 errors remain)
- LiveKit Edge Function deployed to Supabase
- DOMException / TextDecoder / TextEncoder polyfills in `index.js`

---

## Blocked ⛔

### 1. Phone auth (Twilio) not configured
Twilio account was created and verified but the console was down June 14.

**To unblock:**
1. Go to [console.twilio.com](https://console.twilio.com)
2. Copy **Account SID** (starts with `AC...`)
3. Reveal and copy **Auth Token**
4. Get a phone number (free trial number)
5. In Supabase → Auth → Providers → Phone → enable Twilio → paste credentials

### 2. Resend DNS — `infalert.com` — ✅ RESOLVED

Domain fully verified on Resend (June 15, 2026). All three records verified: DKIM, MX, SPF.

---

## Project Details

| Thing | Value |
|---|---|
| Supabase project | `tocfspcqquxdcgoltrxc` (Deevan.app — shared) |
| Friendspot schema | `friendspot` (isolated from Deevan tables) |
| App bundle ID | `com.friendzone.app` |
| Expo SDK | 51 |
| Project path | `~/Documents/Claude/Projects/friendspot` |
| LiveKit Edge Fn | Deployed ✅ (needs LIVEKIT_URL/KEY/SECRET secrets set) |
| Resend domain | `infalert.com` (DNS managed on Namecheap) |

---

## Still Pending

- [ ] Set Twilio credentials in Supabase Auth → Providers → Phone
- [ ] Set LiveKit secrets in Supabase (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`)
- [ ] Create Supabase Storage buckets: `voice-notes` and `photos` (private)
- [ ] Test full auth flow (phone → OTP → profile setup → contacts)
- [ ] Build circle settings screen (`app/(main)/circles/[id]/settings.tsx`)
- [ ] Build DM thread screen (`app/(main)/dms/[id].tsx`)
- [ ] Implement real E2EE key exchange (currently using mock key in useVoiceNotes)
- [ ] Fill in `EXPO_PUBLIC_LIVEKIT_URL` in `.env` once LiveKit host is known
- [ ] Fix pre-existing `lib/crypto.ts` TypeScript 5 strict buffer types (does not affect runtime)
---

## Friend Bets — ✅ BUILT (June 15, 2026)

Polymarket-style prediction markets scoped to a circle. Binary, multi-outcome, and pool bets. Virtual coins only (real Stripe stakes future work).

**Screens:**
- `app/(main)/circles/[id]/bets.tsx` — list (open/resolved), coin balance header, FAB to create
- `app/(main)/circles/[id]/bet/create.tsx` — 3 bet types, options editor, stake cap, optional close date
- `app/(main)/circles/[id]/bet/[betId].tsx` — live breakdown with parimutuel odds bars, place bet modal, creator resolve/cancel

**DB** (`supabase/migrations/20260615_friend_bets.sql`)
- `friendspot.bets`, `friendspot.bet_entries`, `friendspot.coin_transactions`
- `friendspot.profiles.coins` — running balance (default 1000)
- SECURITY DEFINER: `place_bet()` (atomic deduct), `resolve_bet()` (parimutuel payout), `cancel_bet()` (full refund)

**Entry point:** amber "Bets →" bar on circle detail screen (below Private rooms bar)

---

## Rooms + Private Rooms — ✅ BUILT (June 15, 2026)

Fully implemented. Each circle now has:

**Drop-in room** (`app/(main)/circles/[id]/room.tsx`)
- Persistent LiveKit voice room for all circle members
- Audio session configured for loudspeaker, Bluetooth
- Participant grid with speaking indicators
- Mute toggle, leave button, 40-second reconnect window
- Entry: green "Drop-in room" bar on circle detail screen

**Private rooms** (`app/(main)/circles/[id]/private-rooms.tsx` + subdirectory)
- `private-rooms.tsx` — lists active private rooms, explains Standard vs E2EE
- `private-room/create.tsx` — creates Standard (6-digit passcode) or Encrypted (word passphrase) room; generates room code automatically
- `private-room/join.tsx` — 2-step: enter room code → enter passcode/passphrase
- `private-room/[roomId].tsx` — voice room with LiveKit E2EE via `useRNE2EEManager`
- Entry: purple "Private rooms" bar below the drop-in room bar

**DB** (`supabase/migrations/20260615_circle_private_rooms.sql`)
- `circle_private_rooms` table with RLS
- `circle_private_room_members` table (tracks access grants)
- SECURITY DEFINER functions: `find_private_room_by_code`, `join_standard_private_room`, `create_standard_private_room`, `grant_encrypted_room_access`
- bcrypt passode hashing via pgcrypto

**Edge function** (`supabase/functions/livekit-token/` — v5)
- Now handles both `{ circle_id }` (drop-in) and `{ private_room_id }` (private room)
- Private room tokens use room name `private-{roomId}`

**Utilities**
- `lib/passphrase.ts` — 256-word Diceware generator + normalizer
- `lib/roomCode.ts` — Crockford Base32 room code generator (XXXX-XXXX format)

---

## How to Run the App

```bash
cd ~/Documents/Claude/Projects/friendspot
npx expo start --ios
```

---

## Key Files

```
index.js                          ← entry point + web API polyfills
app.config.js                     ← Expo config (no @livekit/react-native plugin)
app/_layout.tsx                   ← root layout + Supabase auth listener
lib/supabase.ts                   ← Supabase client (schema: "friendspot")
lib/livekit.ts                    ← LiveKit token fetcher
lib/crypto.ts                     ← AES-256-GCM E2EE helpers
hooks/useAuth.ts                  ← Zustand auth store
hooks/useCircles.ts               ← circles + realtime (friendspot schema)
hooks/useVoiceNotes.ts            ← circle_messages (kind=voice) + realtime
hooks/useMoments.ts               ← moments + moment_attendees
types/database.ts                 ← Supabase TypeScript types (v2 schema)
supabase/functions/livekit-token/ ← deployed Edge Function
.env                              ← Supabase URL + anon key (filled in)
```

---

## Schema Changes (v1 → v2)

| Old table | New table | Key change |
|---|---|---|
| `voice_notes` | `circle_messages` | Unified voice/text/photo; `kind` column |
| `voice_note_reactions` | `message_reactions` | On `circle_messages` |
| `moment_members` | `moment_attendees` | Added `rsvp_status` |
| `expenses` | `expenses` | `amount` float → `amount_cents` int |
| `expense_splits` | `expense_splits` | `user_id`/`amount_owed` → `owed_by`/`amount_cents` |
| — | `circle_invites` | New: invite flow |
| — | `direct_messages` | New: 1:1 DMs |
| — | `notifications` | New: push notification records |
| — | `contact_imports` | New: hashed contact matching |
| — | `blocks` / `reports` | New: safety |
