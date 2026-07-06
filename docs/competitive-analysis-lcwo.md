# Competitive analysis — LCWO.net vs. our trainer

**Date:** 2026-07-04 · **Compared against:** https://lcwo.net (Learn CW Online),
the most popular free web CW trainer (Koch-method focused, large community).

LCWO is the incumbent for *serious* CW learners. It's receive-copy focused,
utilitarian, and deep on method + statistics. Our app is friendlier, mobile-first,
gamified, and — uniquely — teaches **sending** and simulates **conversations**.
This doc maps their features onto ours, prioritizes the gaps, and specs the ones
worth building.

---

## 1. Feature comparison

### ✅ Parity — we have an equivalent
| LCWO | Ours |
|---|---|
| Word training (copy words by ear) | **Hear words** (+ sentences) |
| Text-to-CW converter | **Translator** (Text↔Morse, bidirectional) |
| Account with settings/progress synced across devices | **Supabase accounts** (merge + sync) |
| Basic statistics | **Stats** (per-letter Send + Receive accuracy, time) |
| Adjustable effective speed (Farnsworth) | `farnsworth` + WPM (partial — see gaps) |

### 🏆 We exceed / they don't have it
- **Sending / keying practice** — LCWO is copy-only. We teach keying (Learn, Numbers, QSO) and even a **straight key** with sidetone.
- **QSO conversation simulator** ("On the air") — 20 scripted + freeform contacts, alternating send/copy. Nothing like it on LCWO.
- **Picture + sound mnemonics** — far gentler onboarding than raw Koch.
- **Gamification** — XP, levels, badges, streaks.
- **Accessibility** — one-switch scanning, audio-first, visual flash + haptics.
- **Modern mobile-first design**; **CW shorthand guide**; **Numbers & symbols** picture drill.

### ❌ Gaps — LCWO has it, we don't (yet)
| LCWO feature | What it is | Priority |
|---|---|---|
| **Koch-method course** | 40 lessons; chars sent at full speed, one new char added per lesson; you copy and get scored. The proven method for real fluency. | **P0** |
| **Configurable speed & tone** | Independent **character speed** + **effective speed** (Farnsworth), plus **tone/pitch (Hz)** and extra word spacing. | **P0** |
| **Code-group copy** | Random N-character groups (e.g. 5-char) sent at speed; pure copying stamina. | **P1** |
| **Callsign training** | Copy realistic callsigns (letters+digits+/). | **P1** |
| **Rich statistics & graphs** | Per-character error rates, **speed-over-time** graph, session history. | **P1** |
| **Plain-text training** | Copy real prose at a set speed/length; large corpora. | **P2** |
| **MP3 / offline practice files** | Download a lesson as an MP3 to practice offline. | **P2** |
| **Leaderboards / highscores** | Per-lesson top lists; compare with others. | **P2** |
| **Activity heatmap** | Calendar of practice activity (streak/retention). | **P2** |
| **Multi-language** (35+ UI + training text) | Localized UI and training corpora. | **P3** |

---

## 2. Prioritization rationale

- **P0 — build next.** These close the "serious learner" credibility gap and are
  reusable across the app: (1) a **Koch receive course** as an alternative,
  method-driven track, and (2) **full speed/tone controls** (which also improve
  every existing receive mode and the translator).
- **P1 — strong follow-ups.** Code-groups + callsign copy are small given our
  existing receive engine; richer stats/graphs boost motivation and retention.
- **P2/P3 — later.** Leaderboards, heatmap, plain-text corpora, and i18n are
  reach/retention plays, not core learning value.

Our strategic edge is **sending + conversation + friendliness**; we should reach
"good enough" on LCWO's copy/method/stats strengths without becoming a clone.

---

## 3. Feature specs (P0)

### 3.1 Koch-method receive course

**Goal.** An alternative, method-driven path to real copying fluency, sitting
next to our mnemonic "Hear letters".

**Behaviour.**
- 40 lessons. Lesson 1 = 2 characters (classic Koch starts **K, M**); each lesson
  adds one new character in Koch order (K M R S U A P T L O W I . N J E F 0 Y , V
  G 5 / Q 9 Z H 3 8 B ? 4 2 7 C 1 D 6 X).
- In a lesson, random **5-character groups** are sent continuously at the set
  **character speed** (default 20 WPM) with **Farnsworth** effective speed (e.g.
  10 WPM) via extra inter-char/word spacing. The learner types what they copy.
- Run for a set duration (default 60 s) or N groups; then score: **% correct**
  per character and overall. **≥ 90%** unlocks the next lesson.
- Show a per-character result grid (sent vs. copied) highlighting the confusers.

**Data / progress.** `koch: { lesson: number, best: Record<charCount, percent>,
history: [{lesson, pct, wpm, ts}] }` — synced like other progress.

**Reuse.** Web-Audio player (already variable-speed), the receive input pattern,
stats UI. New: Koch order table, lesson runner, scoring grid.

**Effort.** Medium. **Depends on:** 3.2 (speed controls).

### 3.2 Configurable speed & tone

**Goal.** Give real control over how the code sounds — the #1 thing LCWO users
tune. Improves every receive mode + the translator + QSO.

**Settings (add to Settings modal, sensible defaults):**
- **Character speed (WPM)** — how fast each character's elements are (default 18).
- **Effective speed (WPM)** — Farnsworth; ≤ character speed, stretches the gaps
  (default 12). Replaces today's boolean `farnsworth` with a real number; keep a
  "Beginner spacing" preset that sets effective ≈ 7.
- **Tone / pitch (Hz)** — sidetone frequency (default 640; range 400–1000).
- **Volume** — sidetone level.

**Implementation.** Extend `playMorse(opts)` to take `{ charWpm, effWpm, freq,
volume }` (it already separates element vs. gap timing — wire these through).
Update `useMorsePlayer` and the straight-key sidetone to read the same freq/vol.
Migrate `wpm`/`farnsworth` → `charWpm`/`effWpm` with back-compat in `hydrate`.

**Effort.** Small–medium. **Unlocks:** Koch, code groups, nicer QSO/translator.

### 3.3 Code-group & callsign copy (P1, specced for completeness)

- **Code groups:** copy random groups; configurable set (letters / +digits /
  +punct), group length (default 5), and speed. Reuses the receive input + the
  speed controls; scored like Koch lessons.
- **Callsign training:** generate plausible callsigns (`[1–2 letters][digit][1–3
  letters]`, optional `/P`,`/M`) and copy them — directly useful for on-air work
  and a natural bridge from "Numbers & symbols" + "On the air".

---

## 4. Recommendation

Build **P0** next (speed/tone controls, then the Koch course), then **P1**
(code-groups + callsign copy + a speed-over-time stats graph). Skip cloning
LCWO's community/i18n breadth; lean into our differentiators (**sending, QSO,
gamification, accessibility, design**).
