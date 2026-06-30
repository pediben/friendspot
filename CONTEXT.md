# FriendSpot — Project Context (Jun 25, 2026)

## App Overview
React Native / Expo SDK 51, Expo Router (file-based routing), Supabase backend on `friendspot` schema.

- **GitHub:** `https://github.com/pediben/friendspot.git` (push to `origin HEAD:main`)
- **Supabase project ID:** `tocfspcqquxdcgoltrxc`
- **Expo owner:** `pediben1986`
- **Bundle ID:** `com.friendspot.app`
- **Apple Team:** Pedram Bani (K7FU639GQU)
- **Apple ID:** pedi.ben@gmail.com
- **TestFlight:** Build 4 live (via EAS). Build 5 is in progress via local Xcode (see below).

---

## What Was Done This Session

### UI Polish (all screens)
- Design tokens across app: `BG "#0C0D0B"`, `CARD "#13150F"`, `BORDER "rgba(255,255,255,0.08)"`, `SAGE "#8FA876"`
- `LinearGradient` buttons and CTA elements throughout
- `circles/index.tsx` — larger monogram, gradient buttons, accent stripe
- `circles/[id]/index.tsx` — hero room card, 2-column feature cards, voice notes section
- `moments/index.tsx` — gradient add button, dark cards
- `live/index.tsx`, `finance/index.tsx` — consistent card styling

### Bug Fixes
- **Voice notes infinite spinner:** Added `setLoading(false)` in error path of `useVoiceNotes.ts`
- **Photo upload "No content provided":** Switched from `fetch().blob()` to `FormData` in `moments/[id]/index.tsx`
- **WebRTC "Couldn't join room":** Added `registerGlobals()` call at root `app/_layout.tsx`

### UX Changes
- `moments/create.tsx`: Renamed "SPOT" → "GROUP", added `location` field (TextInput, optional)
- `moments/create.tsx`: `createMoment` now passes `location: location.trim() || undefined`

### New Feature: Invitation-First Moment Detail
Complete rewrite of `app/(main)/moments/[id]/index.tsx`:
- **Hero:** title (30px), date pill with SAGE color, countdown ("In X days" / "Tomorrow!" / "Today!")
- **Location row:** tapping opens Apple Maps
- **Reaction strip:** 🎉 🔥 ❤️ 😂 👏 with per-emoji counts, toggle on/off
- **RSVP count bar:** Going (green) / Can't make it (red) / Pending (muted)
- **RSVP buttons:** LinearGradient active states, note input after RSVPing
- **Bring Something list:** add items, claim/unclaim, modal sheet for adding
- **Nudge button:** host-only, bell icon in header, sends notifications to pending guests
- **Album tab:** via camera icon in header
- **Secret planning tab:** via lock icon in header (planners only)

### New DB Tables (already created in Supabase)
```sql
-- moment_reactions
CREATE TABLE friendspot.moment_reactions (
  moment_id uuid REFERENCES friendspot.moments(id) ON DELETE CASCADE,
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji     text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (moment_id, user_id, emoji)
);

-- moment_contributions (bring-something list)
CREATE TABLE friendspot.moment_contributions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id  uuid REFERENCES friendspot.moments(id) ON DELETE CASCADE,
  label      text NOT NULL,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
```
RLS is enabled on both tables.

### Existing DB schema notes
- `moments` table has a `location` column (text)
- `moment_attendees`: `moment_id`, `user_id`, `rsvp_status` ("invited"|"going"|"maybe"|"declined"), `note` (text)
- Photo upload path: `photos/{userId}/{momentId}/{timestamp}.{ext}` via Supabase Storage bucket `photos`

### Git
All changes committed and pushed to `main`. Latest commit:
> `feat: invitation-first moment detail with reactions, contributions, countdown, nudge`

---

## Build 5 Status — IN PROGRESS (Xcode local build)

**Why local Xcode instead of EAS:** Free EAS plan exhausted for June. Resets July 1, 2026.

**Issues encountered and fixed:**
1. Signing: Set team to Pedram Bani, bundle ID to `com.friendspot.app` ✓
2. Build number: Set to 5 in Xcode General tab ✓
3. iPad icon missing: Removed iPad from Supported Destinations ✓
4. Missing iPhone icons: Generated all sizes via `sips` from 1024x1024 source ✓
5. CFBundleIconName: Confirmed present in Info.plist = "AppIcon" ✓
6. Derived data: Cleared `~/Library/Developer/Xcode/DerivedData/Friendspot-*` ✓

**Current state:** User was archiving and uploading to App Store Connect at end of session. Result unknown — upload may have succeeded or may still have icon validation errors from Apple servers.

**If icon errors persist:**
- The issue is Apple's server-side validation of the compiled `.car` file
- `actool` compiles correctly (verified via `xcrun actool` — generates `AppIcon60x60@2x.png` + `Assets.car`)
- Try: In Xcode General tab → App Icons and Launch Screen → check "Include all app icon assets"
- Alternative: Wait for EAS reset on July 1 and use `eas build --platform ios --profile production` from project directory

**Key files changed this session:**
```
app/_layout.tsx                        — registerGlobals() for WebRTC
app/(main)/circles/index.tsx           — UI polish
app/(main)/circles/[id]/index.tsx      — UI polish (hero room card, feature cards)
app/(main)/moments/index.tsx           — UI polish
app/(main)/moments/create.tsx          — location field, SPOT→GROUP
app/(main)/moments/[id]/index.tsx      — FULL REWRITE (invitation-first)
app/(main)/live/index.tsx              — UI polish
app/(main)/finance/index.tsx           — UI polish
hooks/useVoiceNotes.ts                 — spinner bug fix
ios/Friendspot/Images.xcassets/AppIcon.appiconset/  — all icon sizes added
```

---

## Technical Patterns to Remember

- **Git:** Use Desktop Commander MCP (runs on user's Mac). Pattern: `rm -f .git/config.lock && git add -A && git commit && git push origin HEAD:main`
- **Photo upload in RN:** Use `FormData` not `fetch().blob()` (local URIs return empty blobs)
- **WebRTC:** `registerGlobals()` from `@livekit/react-native-webrtc` must be called at app root
- **Supabase RLS workaround:** Use `SECURITY DEFINER` RPC functions for circle/moment creation
- **LinearGradient:** from `expo-linear-gradient`
- **Auth:** `useAuthStore()` → `session.user.id`

---

## Pending / Next Steps

1. **Confirm Build 5 uploaded to TestFlight** — check App Store Connect
2. **Test on device:** reactions, RSVP, contributions, nudge, album, voice notes, WebRTC room
3. **Submit to App Store** after TestFlight validation
4. **EAS resets July 1** — future builds use `cd ~/Claude/Projects/FriendSpot && eas build --platform ios --profile production`
