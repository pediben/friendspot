# Friendspot — Full Project Buildup
**Last updated:** 2026-06-17  
**Status:** First TestFlight build uploaded. Live & $ tab fixes applied. Rebuild needed.

---

## What is Friendspot?

A private, radically-private social network for friend groups. Voice-first, E2EE, no algorithm. Built on Expo + Supabase + LiveKit.

- **Display name:** Friendspot
- **Bundle ID:** `com.friendspot.app`
- **App Store listing:** "Friendspot App" (App Store Connect App ID: 6781542972)
- **EAS owner / slug:** `pediben1986` / `friendspot`
- **EAS Project ID:** `59303b6b-1e01-43ec-a9c9-4593716bdd2b`
- **Apple Developer Team:** Pedram Bani (team ID: `K7FU639GQU`)
- **Apple Distribution Certificate:** `9A4D93AZPF`
- **Contact email:** `pedi.ben@gmail.com`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK ~51 (prebuild / hand-made native) |
| Language | React Native / TypeScript |
| Auth + DB | Supabase (project ref: `tocfspcqquxdcgoltrxc`, Deevan.app project) |
| Voice | LiveKit Cloud (`wss://bato-project-epm2okyn.livekit.cloud`) |
| Voice client | `@livekit/react-native` ^2.3.0 |
| Routing | expo-router (file-based, tabs under `app/(main)/`) |
| Icons | `@expo/vector-icons` Ionicons |
| Edge functions | Supabase Edge Functions (livekit-token, notify-new-member) |
| CI/CD | EAS Build (production profile) + Xcode archive for TestFlight |

---

## Local Dev Setup

```bash
# From project directory:
cd ~/Documents/Claude/Projects/friendspot

# Full native build (required after any native/asset change)
npx expo run:ios

# JS-only hot reload — press 'r' in Metro terminal
# Full rebuild needed for: native module changes, Info.plist, icons, splash
```

**When testing on physical iPhone via cable:**
1. Run `npx expo start` on Mac
2. Build runs, app opens on phone
3. If "Could not connect to development server" → tap Reload JS on phone

**Git remote:** (not confirmed — check with `git remote -v`)  
**Push policy:** push only after working feature lands.

---

## Brand / Design Tokens

| Token | Value |
|---|---|
| Background | `#0C0D0B` (near-black, warm) |
| Card | `rgba(255,255,255,0.04–0.06)` |
| Border | `rgba(255,255,255,0.07–0.09)` |
| Text | `#F4F5F0` (warm white) |
| Muted | `rgba(244,245,240,0.4–0.5)` |
| Faint | `rgba(244,245,240,0.18–0.22)` |
| Sage (primary) | `#8FA876` |
| Sage dim | `#5A7A4A` |
| Green | `#4ADE80` |
| Red | `#F87171` |
| Orange | `#FB923C` |

Spot accent palette: sage · violet · teal · rose · blue · gold  
All tokens live in `constants/Colors.ts`.

---

## App Structure

```
app/
  (auth)/          — onboarding, sign in/up, contacts
  (main)/
    _layout.tsx    — Tab bar: Spots · Moments · Live · $
                     Messages + Me hidden (accessed via header icons on Spots screen)
    circles/       — Spots tab
      index.tsx    — Spot list + create sheet
      [id]/
        index.tsx  — Spot detail
        room.tsx   — LiveKit voice room (drop-in)
        private-rooms.tsx
        bets.tsx   — Bets feature
        expenses.tsx — Split expenses
        lottery.tsx  — Rounds (ROSCA)
        settings.tsx
    moments/       — Moments tab
    live/
      index.tsx    — Lists all spots with Room + Private buttons
    finance/
      index.tsx    — Lists all spots with Bets / Rounds / Split buttons
    dms/           — Messages (hidden from tab bar, accessed via header icon)
    profile/       — Me screen (hidden from tab bar, accessed via header icon)
    stories/       — Hidden routes
```

---

## Key Files

| File | Purpose |
|---|---|
| `app.config.js` | Expo config — name, bundle ID, EAS project ID |
| `eas.json` | Build profiles — dev / preview / production |
| `ios/Friendzone/Info.plist` | Native iOS config — display name, permissions, URL schemes |
| `constants/Colors.ts` | All design tokens |
| `lib/supabase.ts` | Supabase client |
| `lib/livekit.ts` | Token fetching helpers (calls livekit-token edge function) |
| `hooks/useCircles.ts` | Loads user's circles with members; realtime subscription |
| `hooks/useAuth.ts` | Auth state (session, user) |
| `types/database.ts` | All DB types. Key: `CircleWithMembers = Circle & { members: Profile[]; member_count: number }` |

---

## Database (Supabase — `tocfspcqquxdcgoltrxc`, schema: `friendspot`)

### Core tables
- `circles` — `name`, `icon` (colorId string: sage/violet/teal/rose/blue/gold), `created_by`
- `circle_members` — circle_id, user_id, role
- `profiles` — auth.uid FK, display_name, avatar_url
- `moments` — photos / stories per circle
- `direct_messages` — DMs between users
- `expenses` / `expense_splits` — split expense tracking
- `bets` / `bet_entries` — betting feature
- `circle_private_rooms` / `circle_private_room_members` — E2EE private voice rooms
- `notifications` — push notification log
- `coin_transactions` — in-app coin economy (for bets)

### Edge Functions
- `livekit-token` — mints LiveKit JWT after validating circle membership. Accepts `circle_id` or `private_room_id`.
- `notify-new-member` — triggered by DB webhook on `circle_members` insert; sends push notification to circle members.

### DB Webhook
- Trigger: INSERT on `friendspot.circle_members`
- Target: `notify-new-member` edge function

---

## Features Built

### Auth & Profile
- Sign up / sign in / sign out
- Profile setup + edit
- Contacts import (`app/(auth)/contacts.tsx`)

### Spots (Circles)
- Spot list with member avatars and count
- Create spot with name + color picker
- Full spot detail screen (`circles/[id]/index.tsx`)

### Moments
- Moments tab (stories/photo sharing per spot)

### Live (Voice Rooms)
- Live tab lists all spots with "Room" and "Private" buttons
- Drop-in room (`room.tsx`): persistent LiveKit voice room per circle
  - Participants grid, mic toggle, leave
  - Auto-reconnect (40s window before "failed" UI)
- Private rooms (`private-rooms.tsx`): E2EE via LiveKit

### $ (Finance)
- Finance tab lists all spots with Bets / Rounds / Split buttons
- Bets (`bets.tsx`): create/join bets within a spot
- Rounds (`lottery.tsx`): rotating savings pool (ROSCA / Sandogh)
- Split (`expenses.tsx`): shared expense tracking with settlement

### Messages
- DMs screen (accessed via header icon on Spots screen)

### Notifications
- `notify-new-member` edge function wired to DB webhook

---

## Tab Bar Layout (final)

Bottom bar (4 visible tabs): **Spots · Moments · Live · $**

Top-right header on Spots screen: **Messages icon · Me icon · + (create spot)**

Messages and Me tabs exist in the router but are hidden from the tab bar (`tabBarButton: () => null`).

---

## Build History

| Build | Key event |
|---|---|
| First archive | Uploaded to TestFlight via Xcode. App Store Connect name "Friendspot App" (ID 6781542972). Bundle `com.friendspot.app`. |
| — | Tab bar redesigned: Messages + Me moved to header icons, 4-tab bottom bar |
| — | Live tab freeze fixed (configureAudio removed) |
| — | $ tab field name bugs fixed |
| — | Info.plist renamed Friendzone → Friendspot |
| — | eas.json project ID corrected |
| **⚠️ PENDING** | Rebuild + new TestFlight archive needed to ship all above fixes |

---

## Apple / EAS Credentials

| Item | Value |
|---|---|
| Apple ID | `pedi.ben@gmail.com` |
| Team | Pedram Bani (`K7FU639GQU`) |
| Distribution cert | `9A4D93AZPF` |
| Bundle ID | `com.friendspot.app` |
| ASC App ID | `6781542972` |
| EAS project ID | `59303b6b-1e01-43ec-a9c9-4593716bdd2b` |

---

## Known Bugs / Open Items

### Must fix before next TestFlight
- [ ] **Rebuild required** — run `npx expo run:ios` then archive in Xcode to ship all June 17 fixes

### Code issues
- [ ] `stories/[userId]` route warning: "_layout.tsx references it but route name may not match actual folder. Low priority.
- [ ] `app.config.js` scheme field — verify it says `friendspot` not `friendzone`
- [ ] `lib/livekit.ts` and `lib/crypto.ts` and `app/(auth)/contacts.tsx` still contain "Friendzone" string references (cosmetic only)

### Features not yet built / tested
- [ ] Push notifications end-to-end test on device
- [ ] Moments tab — verify photo upload works
- [ ] Private rooms E2EE flow
- [ ] DMs full flow
- [ ] Bets / Rounds / Split — verify DB queries work (screens exist, not tested)

### Infra
- [ ] LiveKit URL in `eas.json` still points to Deevan's LiveKit project (`bato-project-epm2okyn`). Fine if sharing the same LiveKit account; create a new LiveKit project if you want separation.
- [ ] Privacy policy — Pedram mentioned adding IP-protection language instead of filing patent

---

## Common Pitfalls

1. **Hot reload vs rebuild** — `r` in Metro = JS only. Info.plist, native modules, icons need full `npx expo run:ios`.
2. **"Could not connect to development server"** on iPhone — Metro must be running on Mac. Tap Reload JS on phone.
3. **`CircleWithMembers` field names** — color is stored as `item.icon` (a colorId string like "sage"), and members array is `item.members` (not `item.circle_members`).
4. **LiveKit AudioSession** — `@livekit/react-native` v2.x only has `startAudioSession()` / `stopAudioSession()`. There is no `configureAudio()` method.
5. **App Store name** — registered as "Friendspot App" (not just "Friendspot" — that name was taken). Can rename after launch via App Store Connect → App Information.
6. **Xcode archive signing** — Team must be set to "Pedram Bani" in Xcode → Friendzone project → Signing & Capabilities. If it shows "No team", re-select it.

---

*For session context, see conversation history or ask Claude to summarize recent changes.*
