# What's next for Ditdah

Written 2026-07-31. Read `docs/PROJECT-STATE.md` first for context.

Everything currently committed is deployed and passing: 197 unit tests, 176 E2E,
`ditdah.me` returning 200.

---

## Blocked on Ryan (dashboard work, no code needed)

### 1. Daily digest: two integrations
Runbook: `docs/daily-digest-setup.md`. The pipeline is built and deployed but
inert, and says so honestly:

```
POST /api/pulse        -> {"ok":true,"stored":false}
GET  /api/digest?dry=1 -> {"reason":"analytics store not configured"}
```

- **A store.** Vercel → Storage → Marketplace → Upstash Redis, connect to the
  project. Sets `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically. Redeploy,
  then `curl -X POST https://ditdah.me/api/pulse` should report `"stored":true`.
- **A mailer.** A Resend API key. `DIGEST_TO` already defaults to
  `ryanbyrd@gmail.com`. `CRON_SECRET` is **already set** (2026-08-16), so
  `/api/digest` and `/api/keepalive` now 401 without Vercel Cron's bearer
  header. Note `vercel env pull` writes it back as `CRON_SECRET=""`, so the
  value is not recoverable that way; read it in the dashboard, or just set a
  new one.

Counters only start accruing once the store exists, so the first useful digest is
the day after.

### 2. Sign-in emails are unbranded
The built-in Supabase mailer sends from `noreply@mail.app.supabase.io` with a
"powered by Supabase" footer and an opt-out link that is **Supabase's, not ours**
— a user clicking it can stop receiving their own sign-in links. Its hourly cap
is also tiny by design, so email sign-in barely works for real users.

Fix: custom SMTP (Resend, Postmark, SendGrid) under Authentication → Emails, then
paste the branded templates already written in `docs/email-templates/`. Raising
the cap raises the abuse ceiling, so enable the CAPTCHA under Attack Protection
at the same time. Details in `docs/google-sign-in-setup.md`.

### 3. Optional: Google consent-screen branding
Set **App name** under Google Auth Platform → Branding so the consent screen
reads "Sign in to Ditdah" rather than the raw Supabase hostname. An app *logo*
triggers a slow verification review; the name does not.

---

## Ready to build, needs a decision

### A. Real mnemonic text for A-Z (the one open accessibility gap)
The mnemonic picture in Learn now names its purpose, but a screen-reader learner
still cannot get the actual memory hook, because the mnemonics exist only in the
images and the sounds-alike audio. `mnemonics.tsx`'s comments describe our unused
SVG recreations and **do not match the shipped art**, so they cannot be reused.

The fix is content work: view all 26 PNGs and write a short hook per letter, the
way the numbers drill already has (`hint: 'Candle'`). That would give honest alt
text and could double as visible text under the picture.

Ask first: should the hook also be **visible**, or alt-text only? Showing it
changes the learning UX.

### B. Digest under-reports two rows
"Answers keyed" and "letters learned" ride the **consent-gated** event stream,
and Tracking Consent defaults off, so they will read near zero while visitors and
shares read true. Either move them onto the same aggregate footing as the rest,
or relabel them in the email so the difference is obvious. Deliberately left
alone rather than quietly widening what the consent toggle covers.

### C. Gaze decoder still untested on real hardware
Built and behind a default-off setting. The decode machine is verified through a
dev simulator, but live eye tracking has never run. Needs a webcam session to
tune dwell time, centre-band width and mirror, then set those as defaults and
decide whether it leaves beta.

### D. No URL routing
Every mode is React state (`mode` in `AppContext`, mirrored to `rmct.mode` in
localStorage). Only `#about` touches the URL. So the Translator, Koch, the cave
and the rest are all `https://ditdah.me/`, which means no deep links, no
shareable link to a mode, the browser Back button leaves the site instead of
going back a screen, and analytics cannot tell the modes apart.

Fix is a hash router (`#/translator`), which is the cheap option and matches the
existing `#about` handling, or real paths via `history.pushState` plus a Vercel
rewrite. Worth doing before any SEO push, since right now there is exactly one
indexable URL.

---

## iOS app

An iPhone build for the App Store is specced in **[IOS-PRD.md](IOS-PRD.md)**,
following the Capacitor shell that shipped Hymn Dictionary. Decisions already
made: guest-only (no sign-in, which sidesteps Sign in with Apple and the
account-deletion rule), gaze input cut from v1, free with no purchases.

The two real risks are that iOS silences WKWebView audio with the ring switch
(fatal for a Morse trainer, needs an AVAudioSession category set natively and a
physical device to verify) and that going full-screen tends to expose safe-area
bugs Safari's chrome was hiding — that happened twice on Hymn Dictionary.

---

## Smaller follow-ups

- **Canonical domain.** Done: `vercel.json` now redirects `www.ditdah.me` to the
  apex (came in with the growth-engine M0 commit).
- **CallSignReady** (`~/signal-up`) still needs its Google client wired up. Its
  setup doc now carries the branding warning. One Google Cloud project can hold
  both clients; Ditdah's lives in "PTL Creative".
- **Bundle size.** The main chunk is ~600KB (~170KB gzipped) and Vite warns about
  it. WebGazer/TensorFlow is already a separate lazy chunk. Supabase is the next
  candidate to split.
- **No README** describing the project for a newcomer to the repo.
- **Cave content** is a single 7-room map. More rooms and monsters would be cheap
  to add; the data shape is in `src/data/cave.ts` and integrity is test-covered.
