# Feature specs — Gaze decoder + Morse learning games

**Status:** Draft for review · **Date:** 2026-07-04
Three specs: (1) a webcam **gaze decoder** input, (2) a **space-shooter** game,
(3) a **cave-crawl** adventure. Games 2 & 3 are new menu options in Ditty; the
gaze decoder is a new input method / mini-tool.

> Build note: the gaze decoder needs a real webcam to test, which our dev/preview
> harness can't provide — so it's specced (not built) here. The two games are
> "ideate + spec" per the request. Recommended build order in §4.

---

## 1. Gaze decoder (accessibility input)

**Inspiration:** https://morsecode.world/labs/gaze-decoder/ — look **left = dit**,
**right = dah**; the screen splits into a green "dit" half and a red "dah" half.

**Goal.** Let someone key Morse **with their eyes** — a powerful accessibility
input for people who can't use hands/switches. Fits Ditty's audio-first,
switch-friendly ethos.

**How it works.**
- Webcam + browser **eye-gaze estimation**. Recommended lib: **WebGazer.js**
  (`webgazer` on npm) — a self-contained regression model over webcam + a short
  mouse-based calibration. We only need coarse **left vs. right** discrimination,
  which webgazer handles far more reliably than precise point-of-gaze.
- Screen is split into **DIT (left)** and **DAH (right)** zones (mirror the
  reference: green left, red/coral right, a neutral center = "rest").
- **Dwell timing:** looking into a zone for a dwell threshold (e.g. 400 ms,
  configurable) emits a dit or dah. Returning to center for an inter-character
  gap (derived from WPM) **commits the character**; a longer gap = word space.
  Decode the dit/dah stream via `PATTERN_TO_CHAR_FULL` into text.
- Live feedback: highlight the active zone, show the dit/dash buffer + the
  decoded text so far (reuse `LiveDecode`).

**Calibration flow.** One-time (per session): show 5–9 dots; the user looks at
each and clicks (or dwells). Store the webgazer model. Provide a "recalibrate"
button and a live "confidence" indicator; warn on poor lighting / no face.

**UI & placement.**
- New setting **`gazeInput` (default off)**, in the accessibility group.
- A **"Gaze input" tool** (mode or overlay): camera-permission prompt → calibrate
  → the split DIT/DAH screen with decoded output. As a v2, allow gaze to drive
  the actual keypad in Learn/QSO (emit `dot`/`dash` actions), reusing the same
  `KeyAction` interface the straight key uses.

**Privacy.** All processing is **on-device**; **no video leaves the browser**.
State this prominently at the permission prompt. Camera is released on exit.

**Settings.** Dwell time, WPM (commit timing), zone sensitivity, mirror on/off.

**Effort:** Medium–large (webgazer integration, calibration UX, dwell/commit
state machine, camera lifecycle). **Risks:** accuracy varies with lighting/webcam;
needs real-device testing; webgazer adds bundle weight (lazy-load it, only when
the feature is enabled). **Fallback:** if no face/low confidence, show guidance
and keep the on-screen keypad available.

---

## 2. Game — "Signal Squadron" (Morse space shooter)

**Concept.** A retro space shooter where **you fly and fire by keying Morse**.
Reinforces *sending* under gentle time pressure — the fun counterpart to drills.

**Core loop.**
- Your ship sits at the bottom. Waves of invaders descend (Space-Invaders style).
- **Piloting keys** (key the letter's code): **L** = move left, **R** = move
  right, **U** = thrust up, **D** = duck down, **F** = fire.
- **Targeted mode (unlocks later):** each invader wears a **letter/number**; key
  that character to fire a homing shot at it. This is the real teaching hook —
  you must recall many characters fast. (Great synergy with the Numbers drill.)
- Waves speed up; a wave clears when all invaders are destroyed. 3 lives; an
  invader reaching the bottom costs a life.

**Difficulty ↔ learning.** Character set grows with level (start with the letters
you've *learned* in Ditty, then add numbers/symbols). Enemy descent speed maps to
your **effective WPM** — faster copy/keying = harder.

**Controls.** Reuse the existing keypad (dot/dash/delete) or the **straight key**;
each completed character triggers its action. Optional: hold-to-repeat move.

**Scoring / juice.** Points per kill (bonus for fast/accurate keys), combo meter,
end-of-wave accuracy %, high score (synced). Chunky pixel sprites, CRT glow on the
twilight theme, dit/dah SFX on key, explosion flashes.

**Data.** `arcade: { highScore, wavesCleared }` in storage (cloud-merged). Pure
client-side; no new deps (Canvas or absolutely-positioned DOM sprites).

**MVP scope.** Single screen, one enemy type, piloting keys L/R/F only + targeted
letters from the learned set; 3 lives; score + high score. **Effort:** Medium.

---

## 3. Game — "Cave of Echoes" (Morse cave-crawl)

**Concept.** A retro dungeon/cave crawl (inspired by **CaveQuest**, 1985 —
https://crpgaddict.blogspot.com/2016/03/game-214-cavequest-1985.html) where
**every action and every monster fight is done in Morse**. Uniquely exercises
*both* sending and receiving in a story context.

**Core loop.**
- Explore a small grid of caves/rooms (retro tile map). **Move** by keying
  **N/S/E/W** (or **U/D/L/R**). A room may hold treasure, a locked door, or a
  monster.
- **Combat = Morse duel.** A monster has a **weakness word/letter**. Two modes,
  escalating:
  - *Send:* the monster shows a rune (letter/short word); **key it correctly** to
    strike. Wrong keying = you take damage.
  - *Receive:* the monster **sends** an attack in Morse (played by ear); **copy &
    type it** to block/counter. (This is the hook — decode under pressure.)
- **Commands** are keyed words: `HIT`, `RUN`, `MAP`, `USE` — each a short Morse
  string. Doors open with a keyed code; NPCs speak in Morse and give clues.
- Win a room → move on; HP + inventory persist. A handful of rooms → a boss that
  demands a longer received message.

**Learning value.** Highest of the three — natural, contextual send **and** copy,
with words and prosigns, at your chosen speed. A gentle bridge from drills to the
QSO simulator.

**UI.** Simple top-down room view (emoji/pixel tiles) + a Morse input bar (keypad
or straight key) + a "copy" input for received attacks + an HP/inventory strip. A
scrolling log (reuse the QSO rig-log styling) narrates the adventure.

**Data.** `quest: { room, hp, inventory[], cleared[] }` (cloud-merged). Content:
a small hand-authored map (JSON) of rooms/monsters/weaknesses — extensible later.

**MVP scope.** 4–6 rooms, 2–3 monster types (send-to-hit only), one keyed command
(`HIT`), a locked door with a keyed code, one boss with a received message.
**Effort:** Medium–large (map/content + combat state machine), but reuses the
QsoSend keying and QsoReceive copying components almost wholesale.

---

## 4. Recommendation & build order

1. **Signal Squadron (MVP)** — most fun-per-effort, pure client-side, reuses
   keying; great retention hook. Ship first.
2. **Cave of Echoes (MVP)** — highest learning value; reuses QSO send/receive
   components; a bit more content work.
3. **Gaze decoder** — highest-impact accessibility feature but needs
   webcam testing and webgazer integration; build behind `gazeInput` (default
   off), lazy-loaded, after a device-testing pass.

All three are additive menu options / inputs — none disturb the existing modes.
