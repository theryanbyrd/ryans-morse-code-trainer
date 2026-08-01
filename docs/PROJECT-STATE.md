# Ditdah: project state and handoff

Written 2026-07-31. Read this first when picking the project back up, then
`docs/NEXT.md` for what to do next.

---

## What this is

**Ditdah** teaches Morse code, one dit at a time. A React + Vite + TypeScript SPA,
no framework beyond that, plain CSS with custom properties.

| | |
|---|---|
| Repo | `~/ryans-morse-code-trainer`, branch `main`, GitHub `theryanbyrd/ryans-morse-code-trainer` |
| Live | **https://ditdah.me** (also `www`, and `ryans-morse-code-trainer.vercel.app`) |
| Deploy | Vercel **CLI only**: `vercel --prod --yes` then `vercel alias set <url> ryans-morse-code-trainer.vercel.app`. Pushing to GitHub does **not** deploy. |
| Accounts | Supabase project `mdqxlftzqsuerdvxfxjz` |
| Analytics | Google Analytics `G-1VFENLPCL1` (unconditional, in `index.html`) |
| Licence | Apache-2.0, a remake of Ace Centre's Morse Learn |

### Commands

```bash
npm run dev          # vite dev server (or the "morse" entry in ~/.claude/launch.json)
npm test             # 197 Vitest unit tests
npm run test:e2e     # 176 Playwright tests, desktop Chromium + mobile WebKit
npm run build        # tsc -b && vite build
```

**Two gh accounts on this Mac.** Pushes fail with a 403 for `punkgenius`. Fix:
`gh auth switch --user theryanbyrd`.

---

## Feature inventory

Modes, all reachable from the mode menu:

- **Learn** — word-based sending drill, picture/sound mnemonics, adaptive hints
- **Numbers & symbols** — 0-9 and punctuation, own SVG art plus generated audio
- **Koch course** — 39 lessons, copy 5-char groups, 90% to advance
- **Hear letters / Hear words** — listening, XP, levels, streaks, badges
- **On the air** — 20 scripted CW QSOs, send and copy, CW shorthand guide
- **Signal Squadron** — arcade shooter, key an invader's character and fire
- **Cave of Echoes** — crawl, key directions, Morse duels with monsters
- **Translator** — text to Morse and back, play or flash
- **Gaze input** (beta, default off) — WebGazer, look left = dit, right = dah

Accessibility inputs: **one-switch scanning**, **Single Key** (short = dit, long =
dah, everywhere you send), keyboard (`J`/`.` dot, `K`/`-` dash), gaze.

### Accounts and sync

Optional throughout; guests keep everything in localStorage. Signing in **merges**
rather than overwrites. All six `SaveState` slices sync: `settings`, `progress`,
`receive`, `numbers`, `koch`, `cave`.

`src/lib/cloud.ts` has a **mechanical guard test** that fails if a new slice is
added to `SaveState` without being merged, because forgetting that silently wipes
the slice when a guest signs in. Keep it.

Sign-in: **Google is live and verified end to end**, plus email magic link.

---

## Testing

- **197 unit tests** (Vitest) over pure logic: morse codec, the cloud merge,
  storage codec and migrations, session, receive, numbers, koch, plus content
  integrity for QSO scenarios and the cave graph.
- **176 E2E tests** (Playwright) against the **production bundle** via
  `vite preview`, not the dev server.
- **42 accessibility tests** including an axe-core sweep of 15 screens.

Config is isolated: `vitest.config.ts` is separate from `vite.config.ts`, tests
are excluded from `tsconfig.app.json` so `tsc -b` never ships them, and
`tsconfig.test.json` typechecks them.

**Both suites are mutation-verified.** When adding tests, break the thing on
purpose and confirm the suite fails. Twice in this project a mutation "passed"
and both times it was a bad mutation rather than a test gap, so check which it is
before trusting a green result.

---

## Hard-won gotchas

**Playwright**
- `addInitScript` runs on *every* navigation. Seeding must be epoch-guarded or a
  reload wipes the state a persistence test is checking. `e2e/helpers.ts` does
  this; do not add a bare `addInitScript` that writes storage.
- `isVisible()` does not auto-wait. `boot()` waits for React to mount first.
- Learn pauses ~480ms between letters and locks input ~320ms, so waits need
  ~900ms. Use `settle(page)`.
- A wrong answer must be the **same length** as the target, because the app
  auto-commits on length match.
- `/api/*` legitimately fails under `vite preview` (no functions runtime).
- Run with 4 workers; 8 starves the single preview server and looks like timeouts.

**Accessibility**
- axe reports contrast failures mid-animation. `audit()` waits 400ms first.
- **Do not use the comments in `src/data/mnemonics.tsx` as alt text.** They
  describe our unused SVG recreations, not the shipped Ace Centre PNGs. `A.png`
  is two hands showing a dot and a dash, not "an archer"; `M.png` is a "MIKE"
  heart tattoo. There is no text list of the real mnemonics anywhere.

**CSS**
- `Game` and `NumbersDrill` share `.letter-card` / `.letter-circle`, so media
  queries leak between modes. A short-screen rule written for Learn once blanked
  the whole Numbers drill.
- Badge modifier classes collide with screen-container classes (`.mode-badge.game`
  vs the `.game` container).
- Reduced-motion must zero `animation-delay`, not just duration.

**Colour tokens (WCAG AA).** The brand coral `--red #ff5b6a` is only 2.82:1 on
cream, so it is for fills and dark backgrounds only. Text on light surfaces uses
`--red-text`; fills carrying white text use `--red-solid` / `--green-solid`.
Check contrast before introducing a colour.

**Other**
- Installing a React dependency while the dev server runs leaves a stale Vite
  optimizer and produces "Invalid hook call" errors that persist in the tool's
  console store even after a restart. `rm -rf node_modules/.vite`, restart, and
  verify with a fresh error capture rather than trusting the old log.
- Backticks inside a double-quoted `git commit -m` get command-substituted. Use
  `-F -` with a quoted heredoc for messages containing code.
- `freshProgress()` pre-seeds all 26 letters at zero; assert on values, not on
  key absence.
- `decode()` returns lowercase.

---

## Where things live

```
src/
  components/     UI. Icons.tsx wraps Phosphor behind app-semantic names.
  data/           morse, words, qso, koch, numsym, cave, cwGuide, mnemonics
  lib/            storage (SaveState + migrations), cloud (merge), session,
                  receive, numbers, audio, morsePlayer, analytics, supabase
  state/          AppContext (all progress + sync), AuthContext
api/              Vercel functions: track, pulse, digest, stats, _lib
e2e/              Playwright specs + helpers
docs/             setup runbooks, email templates, this file
```

`api/*` compiles with **nodenext**: relative imports need an explicit `.js`
extension. Files prefixed `_` are not routes.

---

## Design system

Twilight gradient background, coral and amber accents, cream cards, Poppins.
Icons are **Phosphor**, one family, bold weight; emoji are allowed only as game
art and celebration, never as UI icons. Zero em-dashes in visible copy (a
deliberate rule from the design-taste pass; keep new copy dash-free).

Two skill-driven passes shaped this: `ui-ux-pro-max` (installed into
`.claude/skills/`, which is gitignored) and `~/.agents/skills/design-taste-frontend`.
Design tokens are persisted at `design-system/MASTER.md`.
