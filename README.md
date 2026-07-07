# Ditdah — Learn Morse Code

*Morse code, one dit at a time.* (Formerly "Ryan's Morse Code Trainer".)

Learn the Morse alphabet the friendly way — every letter is paired with a
memorable picture and sound, so you recall a *rhythm* instead of memorising
abstract dots and dashes. A personal React remake inspired by
[Morse Learn](https://morse-learn.acecentre.net/) from Ace Centre (itself built
on the original by Tania Finlayson, Use All Five, and the Google Creative Lab).

## Features

- **Mnemonic learning loop** — each letter shows a hand-drawn picture (our own
  SVG recreations: E = a spider for `·`, T = a tower for `−`, V = the notes of
  Beethoven's 5th for `···−`, and so on) plus its dot/dash pattern.
- **Three ways to play** — keyboard (`J`/`.` = dot, `K`/`-` = dash, `Space` =
  enter, `⌫` = delete), on-screen buttons, or an assistive switch.
- **One-switch scanning mode** — operate the whole trainer from a single switch.
- **Audio-first** — Morse tones, correct/wrong cues, and spoken hints via the
  Web Audio API and SpeechSynthesis. Fully learnable with visuals off.
- **Live decode preview** — see which letter your dots/dashes currently spell.
- **Spaced review** — letters are introduced easiest-first and mixed back in.
- **Progress that travels** — saved locally, exportable as a portable code
  (Get Code / Load From Code), no account needed.
- **Statistics** — per-letter accuracy, answers, and time played.
- **Morse reference board**, onboarding, and an About screen.
- **Optional, consent-gated anonymous analytics** (`/api/track`, `/api/stats`,
  `/api/data-dump`).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

## Deploy (Vercel)

This is a Vite app with serverless functions under `/api`. Deploy with:

```bash
vercel          # preview
vercel --prod   # production
```

### Analytics storage (optional)

Analytics aggregate into an Upstash Redis (REST) if configured; otherwise the
endpoints are graceful no-ops and the game works fully without a database. Set:

```
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

(`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are also accepted.)

## Credits

Inspired by Morse Learn (Ace Centre) and the original Tania Finlayson / Use All
Five / Google Creative Lab trainer. Learn more at [g.co/morse](https://g.co/morse).
Built with React + Vite. Mnemonic artwork is original to this project.
