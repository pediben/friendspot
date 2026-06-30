# Friendspot — Dev Handoff

**Date:** July 1, 2026  
**Branch:** `main` · latest commit `99125f1b`  
**TestFlight:** Build 4 live · Build 5 ready to submit (EAS quota reset today)  
**Repo:** https://github.com/pediben/friendspot

---

## What Was Done This Session

### Features Added
| Feature | File |
|---|---|
| Spot picker redesign — vertical cards with member count, "New Spot" inline bottom sheet | `invites/create.tsx` |
| Invite tab header — Chat + Profile icons, "New Event" pill button | `invites/index.tsx` |
| Evite-style visual invite card — gradient/photo background, personal note on card | `invites/send.tsx` |
| Calendar picker — iOS ActionSheet to pick iCloud / Google / Exchange | `invites/send.tsx` |

### Bugs Fixed
| Fix | File |
|---|---|
| Profile setup routed to non-existent `/(auth)/contacts` → now `/(main)/circles` | `profile-setup.tsx` |
| Silent hang if session null → alert + redirect to sign-in | `profile-setup.tsx` |
| Avatar upload crash → wrapped in try/catch, non-fatal | `profile-setup.tsx` |
| Verify screen: no guard if `phone` param missing | `verify.tsx` |
| Resend OTP: no cooldown or error handling → 30s timer + error alert | `verify.tsx` |
| `useCircles` spinner stuck when unauthenticated | `hooks/useCircles.ts` |
| Null crash on orphaned circle_members row | `hooks/useCircles.ts` |
| Circle photo URL rendered as raw text in event cards | `hooks/useAllEvents.ts` |
| RC `logIn` called on every foreground → deduped with module var | `hooks/useSubscription.ts` |
| Lifetime entitlement stored expiry 1 year away → now sentinel `2099-12-31` | `hooks/useSubscription.ts` |
| "Start free trial" copy when no trial configured → "Subscribe annually" | `pro/index.tsx` |
| Failed purchase showed nothing → now shows Alert | `pro/index.tsx` |
| Spot not auto-selected when circles load async | `invites/create.tsx` |
| Double-submit race condition → ref-based guard | `invites/create.tsx` |
| Empty string `me` ID could reach DB → guarded | `invites/create.tsx` |
| `useEventDetail` never fetched circle name → always showed "your Spot" | `hooks/useEvents.ts` |
| Share link was bare `friendspot://` → now `friendspot.online/events/{id}` | `invites/send.tsx` |
| DM list crashed when `lastMessage` is null (new conversation) | `dms/index.tsx` |
| No empty state when tapping a calendar day with no events | `invites/index.tsx` |
| `buildNumber: "5"`, missing plist keys added | `app.config.js` |

---

## Build 5 — Submit Now

```bash
cd ~/Claude/Projects/FriendSpot

# Add RC API key as EAS secret (do this once)
eas secret:create --scope project --name EXPO_PUBLIC_RC_IOS_API_KEY --value appl_aDLXaTAGerefCULZDjULOjiYrhH

# Build + auto-submit to App Store Connect
eas build --platform ios --auto-submit
```

> **TestFlight note:** Accept the pending invite at `pedi.ben@gmail.com` and clear "Missing Compliance" on Build 4 in App Store Connect.

---

## Remaining Issues

### Should Fix Before Review
| Issue | File | Fix |
|---|---|---|
| Phone numbers uploaded as plaintext to `contact_imports.phone_hash` | `app/(auth)/contacts.tsx` | Either SHA-256 hash them or update App Store privacy nutrition label to declare "Phone Number" collection |
| RC API key hardcoded as fallback | `hooks/useSubscription.ts` line 54 | Use EAS secret (command above); then remove the `?? "appl_..."` fallback |

### Medium Priority
| Issue | Notes |
|---|---|
| Description field in "Create Spot" silently discarded | UI collects it, never passed to `createCircle` RPC |
| Android calendar picker always picks first calendar | Only iOS shows ActionSheet picker |
| "Encryption pending" has no timeout | If key distribution fails, recorder bar in Spot detail is blocked forever |
| Profile notifications/privacy items open "Coming soon" Alert | Add a visual disabled state or remove |

### Low Priority
| Issue | Notes |
|---|---|
| No first-run onboarding | New user sees empty tabs with no guidance |
| No forgot-password flow | Auth screen has no recovery path |
| RSVP counts not real-time | Stale until pull-to-refresh; no Supabase subscription |
| `runtimeVersion` not configured | Add `{ policy: "appVersion" }` to prevent OTA mismatch |
| Moments badges always show | Album/Expenses badges shown even on empty moments |

---

## Key Technical Details

### Stack
- **React Native** · Expo SDK 51 · Expo Router (file-based)
- **Supabase** — project `tocfspcqquxdcgoltrxc`, schema `friendspot`
- **RevenueCat** — `react-native-purchases` 10.4.0
- **LiveKit** — voice rooms via Edge Function
- **Hermes JS engine** — use `parseDateTime()` in `invites/create.tsx`, never `new Date(string)`

### Credentials
| Thing | Value |
|---|---|
| Bundle ID | `com.friendspot.app` |
| EAS Project ID | `59303b6b-1e01-43ec-a9c9-4593716bdd2b` |
| Expo owner | `pediben1986` |
| Apple ID | `pedi.ben@gmail.com` |
| RC iOS key | `appl_aDLXaTAGerefCULZDjULOjiYrhH` |
| RC entitlement | `"pro"` (lowercase — must match exactly) |
| Products | `com.friendspot.app.pro.monthly` ($4.99) · `com.friendspot.app.pro.annual` ($39.99) |

### Git Lock Files
The sandbox can't delete git lock files. When you see `fatal: cannot lock ref 'HEAD'`, run in Terminal:
```bash
rm -f ~/Claude/Projects/FriendSpot/.git/HEAD.lock ~/Claude/Projects/FriendSpot/.git/index.lock
```

### Invite Flow (end-to-end)
1. `invites/create.tsx` — user picks Spot + fills event details → `createEvent()` inserts to `spot_events`
2. `invites/send.tsx` — visual card shown (gradient + cover photo + personal note)
3. "Share Invite" → native share sheet with text + `friendspot.online/events/{eventId}` link
4. "Add to Calendar" → iOS ActionSheet → `expo-calendar` creates entry

### Spot Member Invite Flow
1. Spot detail → person+ icon → `shareSpotInvite()` in `lib/invites.ts`
2. Generates 6-char code, inserts to `spot_invites`, shares `friendspot.online/join/{code}`
3. Recipient → `joinSpotByCode()` → RPC `join_spot_by_invite` → key distribution via `pending_key_shares`

---

## File Map

```
app/
  (auth)/
    phone.tsx            Sign in / sign up (email + password)
    verify.tsx           OTP code entry (phone auth)
    profile-setup.tsx    New user profile → routes to /(main)/circles
  (main)/
    _layout.tsx          Tab bar + auth guard
    circles/
      index.tsx          Spots list, create Spot modal, free tier gate
      [id]/index.tsx     Spot detail, member invite, voice recorder
      [id]/settings.tsx  Spot settings
    invites/
      index.tsx          Calendar view + upcoming events list
      create.tsx         Create event, Spot picker, inline New Spot modal
      send.tsx           Visual invite card, share, calendar picker
    pro/index.tsx        RevenueCat paywall
    dms/                 Direct messages
    profile/             User profile + edit
    moments/             Moments / photo albums
    live/                Voice rooms (LiveKit)
    finance/             Expenses + bets

hooks/
  useAuth.ts             Auth store (Zustand)
  useCircles.ts          Spots + members, createCircle, realtime
  useEvents.ts           Events, useEventDetail (joins circle name)
  useAllEvents.ts        All events across all Spots (Invite tab)
  useSubscription.ts     RevenueCat Pro status, subscribe, restore

lib/
  supabase.ts            Supabase client + uploadFile
  invites.ts             Invite codes, shareSpotInvite, joinSpotByCode, key distribution
  keyExchange.ts         ECDH P-256 + AES-KW end-to-end encryption
  crypto.ts              AES-256 circle key generation
```

---

## Previous Session History (for context)

- **RevenueCat** fully configured: entitlement `pro`, Monthly + Annual packages mapped to App Store products
- **12 bugs** fixed (hooks import, date parsing, stale closure, RC config)
- **QE pass**: auth guard, pro gate race, double-tap, past date validation, dead links, event not found screen
- **Realtime schema**: `friendspot` — verify this matches actual Supabase schema (default is `public`)
- **E2EE**: ECDH P-256 + AES-KW circle keys; `pending_key_shares` distributes keys to new members
