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
- **A mailer.** A Resend API key, plus `CRON_SECRET` (any long random string;
  it stops anyone who finds the URL from making the app send mail). `DIGEST_TO`
  already defaults to `ryanbyrd@gmail.com`.

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

---

## Smaller follow-ups

- **Canonical domain.** `ditdah.me` and `www.ditdah.me` both serve the site.
  Pick one and set the other to redirect in Vercel → Settings → Domains.
- **CallSignReady** (`~/signal-up`) still needs its Google client wired up. Its
  setup doc now carries the branding warning. One Google Cloud project can hold
  both clients; Ditdah's lives in "PTL Creative".
- **Bundle size.** The main chunk is ~600KB (~170KB gzipped) and Vite warns about
  it. WebGazer/TensorFlow is already a separate lazy chunk. Supabase is the next
  candidate to split.
- **No README** describing the project for a newcomer to the repo.
- **Cave content** is a single 7-room map. More rooms and monsters would be cheap
  to add; the data shape is in `src/data/cave.ts` and integrity is test-covered.
