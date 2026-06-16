# Friendzone — Project Brief

> **One sentence:** The private world where your real friend circles live — voice, rooms, moments, and memories — invisible to everyone else.

This document is the working context for the Friendzone project. It captures the vision, current status, scope, tech, and the decisions already locked so work can continue without re-deriving everything.

---

## Status snapshot

- **Stage:** Pre-build, v1 scope locked.
- **Platform:** iOS first — React Native / Expo.
- **Infrastructure:** Reuses the Deevan codebase (LiveKit + Supabase + E2EE).
- **Audience:** General — all friend groups (not a niche vertical).
- **Names on the table:** **Friendzone** (lead — memorable, emotional, owns the word ironically) vs **Friendspot** (backup — clean but generic).

---

## What it is

A radically private, voice-first social app organized around named **circles** (Family, Squad, Work) rather than a public follower graph. There is no public content, no ads, no brand accounts, no algorithmic strangers. Only your contacts know you exist. It's where a real friend group plans things, talks, and keeps its memories — the opposite emotional register of Instagram or LinkedIn.

### The 5 pillars

1. **Radically Private** — zero public content ever, E2EE rooms, contacts-only visibility. The "who can see this" anxiety disappears.
2. **Voice First** — async voice notes are the default language of the app, not text. Drop-in live rooms when people are around.
3. **Circles, Not Followers** — named, invite-only circles, each with its own room, thread, and album.
4. **Moments First** — events/gatherings with secret planning groups and shared photo albums afterward.
5. **Fair Between Friends** — lightweight expense splitting anchored to Moments (tracking only — see constraints).

---

## Feature set (organized)

**Circles & People** — named invite-only circles; friends-only profiles; reused business card; contact import to see who's already on the app.

**Communication** — voice-first group thread per circle (text secondary, no read receipts); 1:1 DMs between people in shared circles; voice-note emoji reactions (v1.1).

**Live Rooms** — persistent drop-in voice room per circle; E2EE by default via LiveKit; raise-hand / promote-to-speaker consent handshake.

**Moments & Events** — create a moment/event; secret planning group (hidden from the honoree); shared photo album per event; memory recaps.

**Split Expenses** — optional 💸 Expenses tab inside a Moment; log who paid / amount / category; per-person "who owes what" breakdown; manual "mark as settled" confirmation between friends. **No money moves through the app.**

**Smart Notifications** — birthdays, job/life celebrations, expense reminders, "all squared up," event nudges.

---

## Tech & reuse map (the Deevan head start)

~60–70% of v1 is already built and confirmed working in Deevan. That codebase is the real competitive advantage.

**Reuse directly:** LiveKit voice rooms + E2EE · Supabase auth + RLS patterns · private room/passcode logic · DM / chat infrastructure · block + report + safety · business card fields · gatherings/meetups · push notifications.

**Adapt:** rooms → per-circle, always-on · follows → circles (invite-only) · profiles → friends-only visibility · suggested people → contacts-first.

**Build new:** async voice notes (10–60s clips) · event/moment creation · shared photo album per event · private stories · contact import · memory recaps · the circle home screen · expense tracking tables/screens.

---

## Roadmap

- **v1 — The wedge:** circles, voice notes, live rooms, moments, albums. ~3 weeks of new build on top of Deevan.
- **v1.1 — After launch:** split expenses + celebration intelligence + voice-note reactions. 4–6 weeks out.
- **v2 — Social layer:** private stories (circles only), circle feed, memory recaps, friends-of-friends suggestions, contact import.
- **v3 — Full private world:** multiple circles each with own room/album, workshops/shared sessions, smart presence.
- **v4 — Monetization:** premium tier (larger circles, longer voice notes, more albums). No ads ever — privacy is the brand promise.

---

## Cold-start strategy

- **The Celebration Launch** — every birthday/event forces a whole friend group to join at once with a built-in deadline. One event ≈ 8–15 new users in a single moment.
- **Contacts = instant network** — surface which phone contacts are already on the app at signup, so the friend group moves together. No stranger discovery.

---

## Success metrics (the only 3 that matter for v1)

1. The **whole group returns** in week 2.
2. Each event brings **8+ people** in.
3. Circles send **3+ voice notes per week** after an event ends.

---

## Locked decisions & constraints

- **No money movement.** Split expenses is tracking + notifications only — no money transmission, KYC, banking partners, or PCI scope. This is what keeps the build to weeks, not 12–18 months. If real payment movement is ever revisited, embed a licensed provider (Stripe Connect / deep-link to Venmo-PayPal-CashApp / Splitwise) rather than building it.
- **No true lottery / winner-takes-all.** Any monthly pooled-money "lottery" must be a rotating savings committee (ROSCA — everyone gets the pot eventually, nobody loses) or a prize-linked-savings "save to win" model. Winner-takes-all gambling is out — it's illegal without a license and exposes users to liability.
- **Don't build two apps in parallel.** Ship Deevan first (already in App Review), learn from real users, then build Friendzone as the general-audience version on the proven codebase.
- **E2EE is non-negotiable** — it's the brand promise, not an optional setting.

---

## Open / next steps

- Supabase schema (circles, voice notes, moments, photo albums, expenses + expense_splits with a `settled` boolean).
- React Native screens (circle home, voice thread, moment + expenses tab).
- App Store submission strategy.
