# Friendzone — Build Plan

> Deevan is shipped. This document covers everything needed to go from fork to App Store for Friendzone v1.

---

## 1. Supabase Schema

### What's reused from Deevan (no changes needed)
- `auth.users` — Supabase auth, phone/OTP flow
- `profiles` — display name, avatar, business card fields, bio
- `direct_messages` — 1:1 DMs between users in shared circles
- `blocks` / `reports` — safety infrastructure
- `push_tokens` — notification targeting

### What's adapted from Deevan

**`circles`** (adapted from `rooms` / `groups`)
```sql
create table circles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  emoji        text,                          -- optional circle avatar
  owner_id     uuid references profiles(id) not null,
  livekit_room text,                          -- persistent room name
  created_at   timestamptz default now()
);
```

**`circle_members`** (adapted from `follows` / `room_members`)
```sql
create table circle_members (
  circle_id  uuid references circles(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  role       text default 'member' check (role in ('admin', 'member')),
  invited_by uuid references profiles(id),
  joined_at  timestamptz default now(),
  primary key (circle_id, user_id)
);
```

### What's new

**`voice_notes`**
```sql
create table voice_notes (
  id           uuid primary key default gen_random_uuid(),
  circle_id    uuid references circles(id) on delete cascade not null,
  sender_id    uuid references profiles(id) not null,
  storage_path text not null,                -- Supabase Storage path (E2EE encrypted blob)
  duration_ms  int not null,                 -- 10s–60s enforced in app
  waveform     jsonb,                        -- optional amplitude array for playback UI
  created_at   timestamptz default now()
);
```

**`voice_note_reactions`** (v1.1 — create table now, populate later)
```sql
create table voice_note_reactions (
  id            uuid primary key default gen_random_uuid(),
  voice_note_id uuid references voice_notes(id) on delete cascade,
  user_id       uuid references profiles(id),
  emoji         text not null,
  created_at    timestamptz default now(),
  unique (voice_note_id, user_id)
);
```

**`moments`**
```sql
create table moments (
  id                  uuid primary key default gen_random_uuid(),
  circle_id           uuid references circles(id) on delete cascade not null,
  created_by          uuid references profiles(id) not null,
  title               text not null,
  event_date          date,
  has_secret_planning boolean default false,
  honoree_id          uuid references profiles(id),  -- hidden from this person
  created_at          timestamptz default now()
);
```

**`moment_members`** (secret planning group)
```sql
create table moment_members (
  moment_id uuid references moments(id) on delete cascade,
  user_id   uuid references profiles(id),
  primary key (moment_id, user_id)
);
```

**`photos`**
```sql
create table photos (
  id           uuid primary key default gen_random_uuid(),
  moment_id    uuid references moments(id) on delete cascade not null,
  uploaded_by  uuid references profiles(id) not null,
  storage_path text not null,
  caption      text,
  taken_at     timestamptz,
  created_at   timestamptz default now()
);
```

**`expenses`**
```sql
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  moment_id   uuid references moments(id) on delete cascade not null,
  paid_by     uuid references profiles(id) not null,
  amount      numeric(10,2) not null,
  currency    text default 'USD',
  category    text,                          -- food, transport, lodging, etc.
  description text,
  created_at  timestamptz default now()
);
```

**`expense_splits`**
```sql
create table expense_splits (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid references expenses(id) on delete cascade not null,
  user_id     uuid references profiles(id) not null,
  amount_owed numeric(10,2) not null,
  settled     boolean default false,
  settled_at  timestamptz,
  unique (expense_id, user_id)
);
```

### RLS patterns (follow Deevan conventions)
- `circles`: readable only by members (`circle_members` join)
- `voice_notes`, `photos`: readable only by circle members
- `moments`: readable by `moment_members` if secret planning, else by circle members
- `expense_splits`: readable only by the two parties in the split
- Storage buckets: `voice-notes`, `photos` — both private, scoped by `user_id` prefix

---

## 2. Screen Architecture

### Navigation structure

```
Root
├── AuthStack
│   ├── SplashScreen
│   ├── OnboardingScreen          (value prop, 3 slides)
│   ├── PhoneEntryScreen
│   ├── OTPVerifyScreen
│   ├── ProfileSetupScreen        (name, avatar — reused from Deevan)
│   └── ContactImportScreen       (NEW — show who's already on Friendzone)
│
└── MainTabs
    ├── CirclesTab
    │   ├── CirclesHomeScreen     (NEW — list of your circles)
    │   ├── CircleDetailScreen    (NEW — voice thread + live room CTA)
    │   ├── VoiceThreadScreen     (NEW — async voice notes feed)
    │   ├── LiveRoomScreen        (REUSE from Deevan, adapted)
    │   ├── CircleSettingsScreen  (members, rename, leave)
    │   └── InviteMembersScreen
    │
    ├── MomentsTab
    │   ├── MomentsListScreen     (NEW — all moments across circles)
    │   ├── MomentDetailScreen    (NEW — info + tabs)
    │   │   ├── PhotoAlbumTab     (NEW)
    │   │   ├── ExpensesTab       (NEW)
    │   │   └── SecretPlanningTab (NEW — hidden from honoree)
    │   └── CreateMomentScreen    (NEW)
    │
    ├── DMsTab
    │   ├── DMListScreen          (REUSE)
    │   └── DMThreadScreen        (REUSE)
    │
    └── ProfileTab
        ├── MyProfileScreen       (REUSE — business card)
        └── SettingsScreen        (REUSE)
```

### Key screen notes

**CirclesHomeScreen** — the main landing after auth. Grid or list of circles (Family, Squad, Work…). Each shows circle emoji, name, unread voice note count, live room indicator if anyone is active. "Create circle" FAB.

**CircleDetailScreen** — top half: Live Room bar (shows active members, tap to join). Bottom half: scrollable voice thread (VoiceThreadScreen embedded). Long-press a voice note to react (v1.1).

**VoiceThreadScreen** — feed of voice note bubbles. Each shows sender avatar, waveform, duration, timestamp. Record button at bottom (hold to record, release to send, 10s–60s).

**MomentDetailScreen** — three tabs: Album (photo grid), Expenses (who owes who, mark settled), Secret Planning (only visible to planning group). If you're the honoree, Secret Planning tab is hidden entirely — RLS enforces this server-side too.

**ContactImportScreen** — reads device contacts (with permission), shows which are already on Friendzone. One-tap "Invite to circle." This is the cold-start flywheel.

---

## 3. Build Order

Deevan is shipped. The starting point is a fork of that codebase.

### Week 1 — Fork, Rebrand, Adapt Core

**Day 1–2: Fork & rebrand**
- Fork Deevan repo → `friendzone`
- Swap app name, bundle ID, colors, icon, splash
- Update Supabase project (new project, run migrations above)
- Update LiveKit credentials

**Day 3–4: Adapt auth + profiles**
- Remove public discovery / follower graph
- Profiles visible only to users in shared circles (RLS update)
- Contact import screen (reads phone contacts → match against `profiles.phone`)

**Day 5–7: Adapt rooms → circles**
- Rename rooms to circles in DB and UI
- Always-on per-circle room (no "create room" flow — room is born with the circle)
- Invite-only: remove any public join mechanic

### Week 2 — Voice Notes + Circle Home

**Day 8–10: Async voice notes**
- Record screen (hold-to-record, waveform preview)
- Upload to Supabase Storage (E2EE: encrypt client-side before upload, decrypt on playback)
- VoiceThreadScreen — feed + playback

**Day 11–12: CirclesHomeScreen**
- Circle list with live presence indicator
- Create circle flow
- InviteMembersScreen (contact picker)

**Day 13–14: Polish voice thread**
- Unread count badges
- Push notification on new voice note
- Swipe-to-reply (optional v1, easy win)

### Week 3 — Moments, Albums, Expenses

**Day 15–16: Moment creation**
- CreateMomentScreen (title, date, circle, secret planning toggle, honoree picker)
- MomentsListScreen

**Day 17–18: Photo album**
- PhotoAlbumTab (grid, full-screen viewer)
- Upload from camera roll, RLS scoped to circle members

**Day 19–21: Expenses**
- ExpensesTab — log expense form, per-person breakdown
- "Mark as settled" confirmation between two parties
- Push notification: "You're all squared up with [name]"

### Week 4 — QA, TestFlight, Submit

- Full E2EE audit (voice notes + photos)
- Privacy policy + ToS live at a URL (required for App Store)
- TestFlight internal build → share with your first real friend group
- Fix bugs from first real usage
- App Store submission

---

## 4. App Store Strategy

### TestFlight rollout

**Internal (Days 1–3 of Week 4)**
Yourself + 2–3 trusted testers. Goal: catch crashes, verify E2EE, voice note record/playback on a real device.

**External — The Celebration Launch (Days 4–7)**
Pick a real upcoming birthday or event in your friend group. Create the Moment in the app. Invite everyone via TestFlight. This is not a "beta test" — it's the first real use case. You get 8–15 organic installs with a built-in reason to open the app.

Target: each external tester completes at least one voice note and one photo upload before you submit.

### App Store metadata

| Field | Value |
|---|---|
| Name | Friendzone |
| Subtitle | Your private circle, voice-first |
| Category | Social Networking |
| Secondary | Lifestyle |
| Keywords | friend group, voice notes, private, circles, moments, no strangers, group chat |
| Age rating | 12+ (chat features) |

**Screenshot strategy (6.7" required, 6.1" recommended):**
1. Circle home — "Your circles. No strangers."
2. Voice thread — hold-to-record UI
3. Live room — drop-in with friends
4. Moment + photo album — "The night, remembered together"
5. Expenses tab — "Who owes who. No awkwardness."

### Review risk areas & mitigations

**E2EE / encrypted content** — App Review cannot scan E2EE content. Include a clear statement in the review notes: "Voice notes and photos are end-to-end encrypted between users. Content is only accessible to circle members." Apple accepts this; they just want to know the encryption scheme.

**No public content** — this actually reduces risk. No UGC that strangers can see = lower content moderation bar. Mention in review notes: "All content is private and visible only to invited circle members."

**Microphone + Contacts permission strings** — write these carefully:
- Microphone: "Friendzone uses your microphone to record voice notes for your friend circles."
- Contacts: "Friendzone checks your contacts to show which friends are already on the app. Nothing is uploaded without your permission."

**Privacy policy must be live before submission.** Minimum required: data collected (phone number, voice audio, photos), how it's stored (Supabase, encrypted), how to delete your account.

### Post-launch growth loop

Every Moment is a natural invite event:
1. User creates a birthday Moment
2. App prompts: "Invite the group" → contact picker
3. Each invitee gets a push/SMS: "[Name] added you to [Event] on Friendzone"
4. They install, join the circle, drop a voice note

Target: each event = 8+ installs. Measure this as the primary growth metric in v1.

---

## Open questions before build starts

1. **Repo:** Fork Deevan privately or create a fresh repo and cherry-pick? (Recommendation: fork — keeps git history and CI/CD config)
2. **App icon:** "FZ" wordmark, abstract circle, or emoji-style?
3. **Name final call:** Friendzone vs Friendspot — locking in before App Store submission since the bundle ID is permanent.
4. **Voice note encryption:** Reuse Deevan's E2EE key exchange or implement a new scheme for the new circle data model?
