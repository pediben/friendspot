# Friendspot — Dev Handoff

**Date:** June 16, 2026 (updated)
**Status:** Growth system built — contact notifications, push tokens, Spot invite links.

---

## Naming Changes (June 16) ✅

| Old name | New name | Notes |
|---|---|---|
| Circles / Squads | **Spots** | Tab label, home screen, create sheet, detail header |
| Lottery | **Rounds** | UI text, empty state, button labels — ROSCA framing |

File paths (`/circles/`, `/lottery/`) unchanged (routing still works).

---

## What's Working ✅

- Full React Native / Expo SDK 51 project scaffolded
- App runs on iPhone (Expo Go)
- Supabase project wired up (`friendspot` schema on Deevan.app project)
- v2 schema applied (16 tables, all with RLS)
- TypeScript clean (only pre-existing crypto.ts strict-TS5 errors remain)
- LiveKit Edge Function deployed

### Features

| Feature | Status | Notes |
|---|---|---|
| Spots (groups) | ✅ | Full CRUD, color palette, member avatars |
| Voice notes | ✅ | Record + play per Spot |
| Group Room | ✅ | LiveKit drop-in voice per Spot |
| Private Rooms | ✅ | Passcode + E2EE, Crockford Base32 room codes |
| Bets | ✅ | Polymarket-style with virtual coins |
| Rounds (ROSCA) | ✅ | Rotating savings pool — join, contribute, select recipient |
| Moments | ✅ | Events with secret planning group |
| Moments photos | ✅ | Signed URL photo grid — upload + display working |
| Split expenses | ✅ | Per-moment expense splitting with settle flow |
| Profile photo | ✅ | Set at onboarding, editable via Edit Profile screen |
| Edit Profile | ✅ | `/(main)/profile/edit` — name, bio, avatar |
| Stories (24h) | ✅ | DB migration + StoryRing component + viewer + add screen |
| DMs | 🔧 | List screen exists, thread screen pending |

---

## Stories — New (June 16) ✅

**DB:** `supabase/migrations/20260616_stories.sql`
- `friendspot.stories` — 24h expiry, RLS: visible to anyone in a shared Spot
- `friendspot.story_views` — tracks who's seen each story

**Screens:**
- `app/(main)/stories/[userId].tsx` — viewer with progress bars, tap left/right, hold to pause
- `app/(main)/stories/add.tsx` — pick photo + optional caption, posts for 24h

**Component:**
- `components/ui/StoryRing.tsx` — animated gold ring if active stories; pulse animation for unseen

**Entry points:** Profile card `+` button → Add Story; avatar ring → view stories.

**Storage bucket:** Create `stories` bucket in Supabase Dashboard (private).

---

## Rounds (ROSCA) ✅

Renamed from Lottery. Framing: everyone contributes → one person receives the full pot → rotate until all have received.

**DB:** Uses existing `circle_lotteries` + `lottery_entries` tables (no migration needed).

**Screens:** `app/(main)/circles/[id]/lottery.tsx` (path unchanged), `lottery/create.tsx`

---

## Blocked ⛔

### Phone auth (Twilio) not configured
**To unblock:**
1. Go to [console.twilio.com](https://console.twilio.com)
2. Copy **Account SID** + **Auth Token** + phone number
3. Supabase → Auth → Providers → Phone → enable Twilio → paste credentials

---

## Project Details

| Thing | Value |
|---|---|
| Supabase project | `tocfspcqquxdcgoltrxc` (Deevan.app — shared) |
| Friendspot schema | `friendspot` (isolated) |
| Supabase URL | `https://tocfspcqquxdcgoltrxc.supabase.co` |
| App bundle ID | `com.friendzone.app` |
| Expo SDK | 51 |
| LiveKit Edge Fn | Deployed ✅ |
| Resend domain | `infalert.com` ✅ fully verified |

---

## Growth System — New (June 16) ✅

### "Your contact just joined" notifications
When a new user signs up, everyone who had their phone number saved in their own contacts automatically gets a push notification: *"[Name] just joined Friendspot 👋 — tap to add them to a Spot."*

**How it works:**
1. At sign-up, `contacts.tsx` reads the device address book and saves all phone numbers to `contact_imports` (normalized E.164)
2. The `notify-new-member` Edge Function is triggered by a Supabase DB webhook on `profiles` INSERT
3. It looks up everyone who has the new user's phone in their `contact_imports`, fetches their push tokens, and sends Expo push notifications

**To activate:** Set up the DB webhook in Supabase Dashboard → Database → Webhooks → profiles INSERT → `notify-new-member` function URL.

### Push notifications
- `hooks/useNotifications.ts` — requests permission, gets Expo push token, saves to `push_tokens` table
- Called from root `_layout.tsx` on every app open
- Handles notification taps (navigates based on `data.type`)
- Add `EXPO_PUBLIC_EAS_PROJECT_ID` to `.env` once you run `eas build`

### Spot invite links
- Any Spot member can tap the **person-add icon** (top-right of Spot screen) to generate an invite
- Generates a 6-char Crockford Base32 code (e.g. `A1B2C3`), stored in `spot_invites` table
- Share sheet opens with message + link: `https://friendspot.app/join/A1B2C3`
- Deep link: `friendzone://join/A1B2C3`
- Join screen (`/(main)/join`): shows Spot name preview, one-tap join
- Also accessible from Spots home via the enter-outline icon

**DB:** `supabase/migrations/20260616_growth.sql`
- `push_tokens` — Expo push tokens per device
- `contact_imports` — address book phone numbers per user
- `spot_invites` — invite codes with expiry + use limit
- SECURITY DEFINER `join_spot_by_invite(code)` — atomic join with collision-safe member insert

**Edge Function:** `supabase/functions/notify-new-member/index.ts`

---

## App Reorganization ✅ (June 16)

**4-tab navigation** replacing the old 2-visible-tab layout:

| Tab | Screen | Notes |
|---|---|---|
| Spots | `circles/index` | Join (enter icon) + Create (+) in header only — DMs/Profile buttons removed |
| Moments | `moments/index` | Unchanged |
| Messages | `dms/index` | Now a real conversation list — was hidden before |
| Me | `profile/index` | Was hidden before; heading now "Me", no back button |

**DMs fully built:**
- `hooks/useDirectMessages.ts` — `useConversations()` + `useThread(userId)` with Supabase realtime
- `app/(main)/dms/index.tsx` — conversation list with last message preview + unread badge
- `app/(main)/dms/[id].tsx` — full thread screen with text send, auto-scroll, mark-read
- `lib/timeAgo.ts` — shared relative-time helper
- `supabase/migrations/20260616_direct_messages.sql` — table + RLS (must share a Spot to DM)

**Apply migration:** paste `20260616_direct_messages.sql` in Supabase Dashboard → SQL Editor.

---

## Moment Templates ✅ (June 16)

Luxury / minimal template picker on the create moment screen. No emojis — uses Ionicons only.

**Templates:** New moment (blank), Birthday, Wedding, Graduation, Baby Shower, Party, Bachelorette/Stag, Trip, Road Trip, Getaway, Beach Day, Dinner, Game Night, Sports — 14 total, all free.

Each template pre-fills: title, secret planning toggle. User can override everything.

**Files:**
- `lib/momentTemplates.ts` — template definitions (icon, name, color, hint, hasSecret)
- `app/(main)/moments/create.tsx` — redesigned with horizontal FlatList template picker at top

---

## About Screen + IP Notice ✅ (June 16)

`app/(main)/about.tsx` — new screen accessible from Profile → About Friendspot.

Shows: Friendspot logo mark, tagline, version, **Patent Pending notice**, Privacy Policy / Terms / Contact links, full copyright.

Profile screen updated with "About Friendspot" menu item.

> **Important:** The "Patent Pending" text in-app is a statement of intent. To actually file:
> 1. Consult a patent attorney (provisional application is ~$1,500–3,000 and buys you 12 months)
> 2. File a **Provisional Patent Application (PPA)** with the USPTO covering: the ROSCA + social + events combined model, the Spots/Rounds mechanic, and the secret planning group feature
> 3. Once filed, you can legally say "Patent Pending" and have a 12-month window to file the full utility patent

---

## Still Pending

- [ ] Set Twilio credentials in Supabase Auth → Providers → Phone
- [ ] Add `EXPO_PUBLIC_EAS_PROJECT_ID` to `.env` (run `eas init` to get it)
- [ ] Apply `20260616_fix_profiles.sql` migration via Supabase dashboard (CRITICAL — fixes email signup)
- [ ] Apply `20260616_growth.sql` migration via Supabase dashboard
- [ ] Apply `20260616_e2ee.sql` migration via Supabase dashboard (new — E2EE tables)
- [ ] Deploy `notify-new-member` Edge Function: `supabase functions deploy notify-new-member`
- [ ] Set up DB webhook: Supabase Dashboard → Database → Webhooks → profiles INSERT → notify-new-member URL
- [ ] Create `stories` storage bucket in Supabase Dashboard (private)
- [ ] Set LiveKit secrets (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`)
- [ ] Create Supabase Storage buckets: `voice-notes`, `photos`, `stories` (all private)
- [ ] Apply `20260616_stories.sql` migration via Supabase dashboard
- [ ] File Provisional Patent Application (USPTO) — consult attorney first
- [ ] Apply `20260616_direct_messages.sql` migration in Supabase Dashboard
- [x] Build Spot settings screen (`app/(main)/circles/[id]/settings.tsx`) ✅
- [x] Wire StoryRing into Spot member list + DMs contacts list ✅ (via `hooks/useStoriesStatus.ts`)
- [x] Implement real E2EE key exchange ✅ — ECDH P-256 + AES-KW, see lib/keyExchange.ts + hooks/useCircleKey.ts + supabase/migrations/20260616_e2ee.sql
- [x] Auth flow audited + fixed ✅
  - Fixed: profiles.phone UNIQUE NOT NULL violated by email users → migration 20260616_fix_profiles.sql
  - Fixed: returning users routed to /contacts instead of /(main)/circles
  - Fixed: display_name not written to user_metadata (broke new-vs-returning check)
  - Fixed: "Friendzone" branding in contacts.tsx
  - Apply migration: 20260616_fix_profiles.sql in Supabase Dashboard → SQL Editor

---

## How to Run

```bash
cd ~/Documents/Claude/Projects/friendspot
npx expo start --ios
```

---

## Key Files

```
app/(main)/_layout.tsx                     ← tab nav ("Spots", "Moments")
app/(main)/circles/index.tsx               ← Spots home screen
app/(main)/circles/[id]/index.tsx          ← Spot detail (voice + feature bars)
app/(main)/circles/[id]/lottery.tsx        ← Rounds (ROSCA) screen
app/(main)/circles/[id]/lottery/create.tsx ← Create round
app/(main)/profile/index.tsx               ← Profile (story ring + add story btn)
app/(main)/profile/edit.tsx                ← Edit name / bio / avatar ← NEW
app/(main)/stories/[userId].tsx            ← Story viewer ← NEW
app/(main)/stories/add.tsx                 ← Add story ← NEW
app/(main)/moments/[id]/index.tsx          ← Moment detail (album, expenses, planning)
components/ui/StoryRing.tsx                ← Animated story ring ← NEW
lib/supabase.ts                            ← Supabase client + helpers
supabase/migrations/20260616_stories.sql   ← Stories tables ← NEW
```
