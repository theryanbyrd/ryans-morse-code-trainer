# Feature Spec — Receive (Listening) Mode + User Accounts

**Product:** Ryan's Morse Code Trainer
**Status:** Draft for review
**Author:** generated with Claude, 2026-07-01
**Related:** builds on the existing Send (typing) trainer

---

## 1. Summary

Today the app teaches **sending** Morse: you see a letter and tap its dot/dash
pattern. This spec adds **receiving**: you *hear* Morse and identify what was
sent. It also introduces **user accounts** so a learner's history and progress
persist across devices and across both modes.

The app opens on a **mode-select screen** — *Send* or *Receive* — and Receive
mode reuses the letters the learner already knows, starting letter-by-letter and
graduating to words, mirroring the Send progression.

---

## 2. Goals / Non-goals

### Goals
- Teach **decoding** (ear → letter/word) for the letters the learner has learned.
- Let the learner **pick Send or Receive** up front, and switch any time.
- **Real timing**: play Morse with correct dit/dah spacing at an adjustable speed
  (WPM), with Farnsworth spacing for beginners.
- Introduce **accounts** so progress/history is saved and syncs across devices,
  while keeping **guest play** frictionless.
- Stay accessible: audio-first, large targets, switch/keyboard operable, and a
  visual fallback for the audio.

### Non-goals
- Real-world straight-key / iambic-paddle timing input (Send mode stays discrete).
- Numbers, punctuation, prosigns, callsigns, QSO simulation (future).
- Social features, leaderboards, real-time multiplayer.
- Teaching Koch-method from scratch as the *only* path (we gate on already-learned
  letters instead; a Koch track is a possible future option — see Open Decisions).

---

## 3. Mode selection (new landing screen)

After the existing Start screen (“Press any button to Start”), show a **Choose a
mode** screen:

```
        Learn Morse Code
   ┌───────────────┐   ┌───────────────┐
   │   ✍  SEND     │   │   👂  RECEIVE  │
   │  Tap the code │   │ Hear & decode │
   └───────────────┘   └───────────────┘
        (your progress: 7/26)   (locked until you learn 3 letters)
```

- Two large, switch-scannable cards. Remembers the last-used mode and offers it
  as the default next launch.
- **Receive is gated**: available once the learner has learned at least
  `MIN_LETTERS_TO_RECEIVE` (proposed **3**, matching Send's starting set e/t/a).
  Before that it shows “Learn a few letters in Send first”.
- Mode is switchable at any time via the settings/menu; the gear + help chrome
  stays global. Each card shows a small progress indicator for that mode.
- Onboarding: a one-time, skippable Receive tutorial (2 slides: “Listen, then pick
  the letter you heard” / “Tap replay to hear it again”).

---

## 4. Receive mode — UX

### 4.1 Letter phase (default entry)
1. The app **plays a single letter** in Morse (e.g. `S = di-di-dit`).
2. The learner **identifies** it. Two input styles, escalating with mastery:
   - **Recognise (multiple choice)** — 3–6 large letter tiles, one correct, the
     rest drawn from other *learned* letters (confusable letters preferred, e.g.
     E/I/S, T/M/O). Touch/switch/keyboard friendly. This is the beginner default.
   - **Recall (type it)** — no choices; the learner types/says the letter. Unlocks
     per-letter once it's reliably recognised.
3. **Feedback** (reuses Send's cues): correct → the recorded “correct” clip and
   advance; wrong → “wrong”, reveal the answer (show letter + its dot/dash +,
   optionally, the Send mnemonic picture), then replay and let them retry.
4. **Controls**: **Replay** (hear again), **Slower** (drop WPM for this item),
   **Reveal** (show the answer), and the persistent gear/help.

### 4.2 Word phase
- Unlocks after the learner has mastered *receiving* the letters currently in play
  (own threshold, see 4.4). Uses the **same word list / pacing engine** as Send
  (`src/data/words.ts`, `pickWord`) filtered to letters in play.
- The app plays a **whole word** with correct inter-character and word spacing;
  the learner **types the word**. Per-letter live echo as they type (like Send's
  live decode, but for characters they've entered).
- Partial credit + targeted retry: on submit, highlight which letters were right;
  replay and let them fix the rest.

### 4.3 Audio & timing (important — differs from Send)
- Send mode plays fixed recorded `dot.mp3`/`dash.mp3`. **Receive needs variable
  speed**, so it should **synthesize a sidetone via Web Audio** (a clean sine at
  ~600–700 Hz with click-free envelopes) using standard Morse unit timing:
  - dit = 1 unit, dah = 3 units, intra-character gap = 1, inter-character = 3,
    word gap = 7.
  - **WPM** setting (PARIS standard). Proposed default **12 WPM character speed**.
  - **Farnsworth**: keep character speed fast but stretch the gaps for beginners
    (e.g. effective 6–8 WPM). Exposed as a simple “Spacing: Beginner / Normal”
    plus a WPM slider in settings.
- **Tone/pitch**, **volume**, and **speed** are user settings, persisted per user.
- **Visual fallback** (accessibility / deaf-plus-learning, or noisy rooms): an
  optional on-screen **flash/lamp** that blinks the same timing as the audio, and
  a haptic buzz on mobile (`navigator.vibrate`) mirroring dits/dahs.

### 4.4 Progression & mastery model
- Receive draws its letter pool from the learner's **Send-learned letters** (a
  shared “known letters” set). You only get tested on receiving letters you've
  already learned to send.
- Receive keeps its **own per-letter receive-score** (independent of Send), so a
  letter can be “learned to send” but still “new to receive”. Reuse the existing
  score model: +1 correct / −1 wrong, hint/reveal follows last outcome, “mastered
  to receive” at a threshold; multiple-choice → free-recall promotion per letter.
- Spaced review: mix already-mastered letters back in (reuse Send's review cadence).
- Word phase gates on receive-mastery of the in-play letters.

---

## 5. User accounts & history

### 5.1 Why now
Progress is currently anonymous `localStorage` with a manual “Get Code / Load From
Code”. Two modes × cross-device history makes a real account worthwhile: save and
sync history automatically, and power a Stats/History view.

### 5.2 Principles
- **Guest-first**: you can still play both modes with no account (local storage).
- **Account is optional but recommended** to save history and sync devices.
- **Seamless migration**: on first sign-in, merge the guest's local progress into
  the account (both Send and Receive), then keep syncing.
- **Privacy**: minimal PII (email or OAuth id only); existing anonymous analytics
  stays consent-gated and separate from account data.

### 5.3 Auth approach (recommendation)
This is a **Vite SPA + serverless `/api`**, so the cleanest options are hosted
auth that work without Next.js:
- **Recommended: Supabase** — email magic-link + Google OAuth, Postgres for the
  history tables, generous free tier, simple JS client, Row-Level Security so a
  user only reads their own rows. One dependency covers auth **and** storage.
- Alternatives: **Clerk** (great DX, auth only — still need a DB), or a custom
  **magic-link + JWT** on our existing `/api` with Vercel Postgres/KV (most work).

See Open Decisions.

### 5.4 Data model (illustrative)
```
user            { id, email, created_at, display_name? }
settings        { user_id, send:{…}, receive:{ wpm, farnsworth, tone, volume, visual },
                  sound, speech_hints, … }               // mirrors local Settings
letter_progress { user_id, letter, mode('send'|'receive'),
                  attempts, correct, wrong, score, mastered, promoted_to_recall,
                  updated_at }
sessions        { id, user_id, mode, started_at, ended_at,
                  answered, correct, ms_played }
events          { id, user_id, session_id, ts, mode, kind('answer'|'letter_learned'
                  |'word_complete'|…), letter?, word?, correct?, latency_ms? }
```
- The local `SaveState` maps onto `settings` + `letter_progress`; the portable
  “code” continues to work offline and as an import path.
- **History view**: per-letter accuracy for *both* modes, time played, streaks,
  a calendar/heatmap of activity, and “letters you receive slower than you send”.

---

## 6. Screens / Information architecture

```
Start ("Press any button")
└── Mode Select  ▶ Send | Receive     (+ account chip: Sign in / avatar)
    ├── Send  (existing trainer)
    ├── Receive
    │   ├── Receive onboarding (first time, skippable)
    │   ├── Letter phase  (multiple-choice → recall)
    │   └── Word phase    (type the word you heard)
    ├── Account
    │   ├── Sign in / Sign up (magic link / Google)  ·  Continue as guest
    │   └── Profile (display name, sign out, delete account/data)
    └── History & Stats   (per-mode, cross-device)
Global chrome: gear (settings incl. WPM/Farnsworth/tone), help, account chip.
```

---

## 7. Epics & user stories (with acceptance criteria)

### Epic R — Receive the alphabet
**R1. Choose to receive**
> As a learner, I want to pick Send or Receive when I open the app.
- Given ≥3 learned letters, the Receive card is enabled; tapping it starts Receive.
- The chosen mode is remembered as the next-launch default.
- With <3 learned letters, Receive is visibly locked with an explanation.

**R2. Identify a heard letter**
> As a learner, I want to hear a letter and pick what I heard.
- A learned letter is played at the current WPM/spacing.
- Multiple-choice offers the correct letter among distractors drawn from learned
  (confusable-preferred) letters.
- Correct → success cue + advance; wrong → error cue, reveal, replay, retry.
- Replay and Slower controls are always available and don't count as an attempt.

**R3. Graduate to recall**
> As a learner, once I reliably recognise a letter, I want to type it without choices.
- A per-letter receive-score promotes the letter from multiple-choice to free recall.
- Free-recall accepts keyboard, on-screen letters, and switch input.

**R4. Receive words**
> As a learner, I want to decode whole words once I know the letters.
- Unlocks after receiving the in-play letters is mastered.
- Plays a word with correct spacing; the learner types it; per-letter correctness
  is shown; replay + targeted retry on mistakes.

**R5. Control the speed**
> As a learner, I want to set how fast/spaced the Morse is.
- WPM slider + Beginner/Normal spacing (Farnsworth) in settings; applied live and
  persisted (per account when signed in).

**R6. Receive without sound**
> As a learner in a quiet-required setting or with hearing loss, I want a visual/haptic option.
- Optional on-screen flash and mobile vibration mirror the audio timing.

### Epic A — Accounts & history
**A1. Play as guest** — no sign-in required; progress saved locally as today.
**A2. Create an account / sign in** — magic link or Google; lightweight.
**A3. Merge on sign-in** — first sign-in merges local Send+Receive progress into
the account without data loss; conflicts resolve to the higher score/attempt count.
**A4. Sync across devices** — signing in on a new device restores full history.
**A5. Review history** — a Stats/History screen shows both modes, per-letter
accuracy, time played, streaks, and an activity heatmap.
**A6. Own my data** — sign out, export, and delete account/data are available;
analytics remains separate and consent-gated.

---

## 8. Functional requirements (summary)
- **FR-R1** Mode-select screen; Receive gated on ≥`MIN_LETTERS_TO_RECEIVE` learned; last mode remembered.
- **FR-R2** Web-Audio Morse playback with correct unit timing, WPM + Farnsworth, tone/volume settings.
- **FR-R3** Letter phase: multiple-choice → free-recall promotion per learned letter, with replay/slower/reveal.
- **FR-R4** Word phase reusing the existing word list/pacing, with per-letter grading + retry.
- **FR-R5** Independent receive-score per letter; spaced review; word gating.
- **FR-R6** Optional visual flash + haptic mirror of the audio.
- **FR-A1** Guest play unchanged (local storage) for both modes.
- **FR-A2** Optional auth (recommended Supabase: magic link + Google).
- **FR-A3** First-sign-in merge of local progress; thereafter cloud sync.
- **FR-A4** History/Stats screen across both modes and devices.
- **FR-A5** Export + account/data deletion; analytics stays separate/consented.

## 9. Non-functional requirements
- **Accessibility:** audio-first with visual/haptic fallback; large targets; full
  switch + keyboard operation incl. one-switch scanning of choices; WCAG contrast.
- **Latency:** synthesized tones start instantly; UI stays responsive during playback.
- **Offline:** guest play fully offline; sync resumes when back online.
- **Privacy/security:** minimal PII; per-user row-level isolation; no analytics tie to identity.
- **Cost:** stay within free tiers where possible; auth/storage optional at deploy time.

## 10. Technical integration notes
- **Reuse:** `data/morse.ts` (patterns), `data/words.ts` + `lib/session.ts`
  (pacing/word pick), settings/stats UI patterns, one-switch scanner.
- **New:** a Web-Audio Morse player (`lib/morsePlayer.ts`) for timed dit/dah
  sidetone (Send keeps recorded mp3s); a Receive game component mirroring Game.tsx;
  a mode router above the current screens; an auth/data layer (client + `/api` or
  Supabase client) with a local↔cloud sync adapter behind the existing storage API.
- **Storage abstraction:** wrap current `lib/storage.ts` behind a small interface
  so the same calls hit localStorage (guest) or the account (signed-in) — keeps the
  game code identical for both.

## 11. Phased rollout
- **M1 — Receive letters (guest only):** mode-select, Web-Audio player, letter phase
  multiple-choice, WPM/Farnsworth, reveal/replay. Ships value with zero backend.
- **M2 — Recall + words:** free-recall promotion, word phase, visual/haptic fallback.
- **M3 — Accounts:** auth + cloud storage, first-sign-in merge, cross-device sync.
- **M4 — History:** Stats/History screen across modes; export/delete.

## 12. Decisions (locked 2026-07-01)
1. **Auth:** Supabase (auth + Postgres).
2. **Accounts:** optional, guest-first.
3. **First receive input:** multiple-choice first.
4. **Letter pool:** gate Receive on Send-learned letters.
5. **Default speed:** 12 WPM char / Beginner Farnsworth (default; adjustable).
6. **Build order:** M1 (Receive letters, guest-only, no backend) first; accounts in M3.

### Original open questions (for reference)
1. **Auth provider:** Supabase (auth+DB in one, recommended) vs Clerk (+separate DB)
   vs custom magic-link/JWT on our `/api` + Vercel Postgres.
2. **Accounts required or optional?** Recommended: optional, guest-first with
   sign-in to save/sync. Confirm.
3. **First receive input:** multiple-choice-first (recommended, beginner-friendly,
   switch-friendly) vs type-from-the-start.
4. **Letter pool source:** gate Receive on Send-learned letters (recommended) vs a
   separate Koch-style receive track that ignores Send progress.
5. **Default speed:** 12 WPM char / Beginner (Farnsworth ~7 WPM effective) — OK?
6. **Scope of v1:** ship M1 (Receive letters, guest-only) first and add accounts in
   M3, or hold Receive until accounts exist?
```
