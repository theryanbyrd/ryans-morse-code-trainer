# Enabling "Sign in with Google" on ditdah.me

The app code is already finished. Accounts, cloud sync and the Google button are
built and tested; the button stays hidden until Supabase reports that the Google
provider is on. Everything below is dashboard configuration that needs your own
Google and Supabase logins.

Project: **`mdqxlftzqsuerdvxfxjz`** (Supabase) · Live at **https://ditdah.me**

---

## Step 1 — Create Google OAuth credentials

1. Open the [Google Cloud Console](https://console.cloud.google.com/), create (or
   pick) a project, e.g. "Ditdah".
2. **APIs & Services → OAuth consent screen**
   - User type: **External**, then **Publish** it (while it is in Testing, only
     accounts you list by hand can sign in).
   - Authorised domain: `supabase.co` (that is where the callback lands).
   - Scopes: the defaults (`email`, `profile`, `openid`) are all that is needed.
   - Set the branding as below, or the consent screen looks broken.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised JavaScript origins**
     ```
     https://ditdah.me
     https://www.ditdah.me
     ```
   - **Authorised redirect URI** (exactly one, and it is Supabase's, not ours)
     ```
     https://mdqxlftzqsuerdvxfxjz.supabase.co/auth/v1/callback
     ```
4. Copy the **Client ID** and **Client secret**.

### Branding: do not skip, or the consent screen shows a raw hostname

Google names the app on its consent screen from **Google Auth Platform →
Branding**. With it unset, Google falls back to the redirect domain, so users see
"Sign in to **mdqxlftzqsuerdvxfxjz.supabase.co**", which looks like a phishing
page.

- **App name**: `Ditdah`
- **User support email**: yours
- **App home page**: `https://ditdah.me`
- **Authorised domain**: `ditdah.me`

The heading then reads "Sign in to Ditdah".

Two caveats:
- Uploading an **app logo triggers Google's verification review** (days, sometimes
  longer). The app *name* does not, because `email`/`profile` are non-sensitive
  scopes. Set the name now; treat the logo as optional.
- The `supabase.co` host can still appear in the small print, because it really is
  the redirect target. Removing it entirely needs a **Supabase custom auth domain**
  (`auth.ditdah.me`), which is a paid add-on (Pro plan + custom domain). If you
  ever do that, the redirect URI in the Google client has to change to match.

---

## Step 2 — Turn the provider on in Supabase

**Authentication → Providers → Google**: enable it, paste the Client ID and
Client secret, save.

That is the only switch the app reads. Within a page refresh the "Sign in with
Google" button appears on its own, because the app queries `/auth/v1/settings`
and only renders the button when `external.google` is true.

---

## Step 3 — Allow the ditdah.me redirect (do not skip)

**Authentication → URL Configuration**

- **Site URL**: `https://ditdah.me`
- **Redirect URLs**: add every origin the app is served from
  ```
  https://ditdah.me/**
  https://www.ditdah.me/**
  https://ryans-morse-code-trainer.vercel.app/**
  http://localhost:5173/**
  ```

This matters beyond Google. The app asks Supabase to return the user to
`window.location.origin`, and Supabase refuses any origin not on this list. The
custom domain was added *after* accounts were first set up, so if `ditdah.me` is
not listed then **the existing email magic-link sign-in is already broken on the
custom domain** and would send people to the old vercel.app URL. Worth checking
even if you decide against Google.

---

## Step 4 — Check it

1. Open https://ditdah.me in a private window, click **Sign in**.
2. The Google button should be there. Sign in with a Gmail account.
3. You should land back on ditdah.me, signed in, with your initial in the header.
4. Learn a couple of letters, then open the same account in another browser: the
   progress should follow you.

---

## What gets saved

One JSON row per user in the `user_state` table, protected by row-level security
(a user can only read and write their own row, enforced by
`supabase/schema.sql`). It holds every progress slice:

| Slice      | Contents                                                        |
|------------|-----------------------------------------------------------------|
| `settings` | speed, tone, volume, accessibility options                        |
| `progress` | per-letter scores and stats for Learn                             |
| `receive`  | listening scores, XP, level, streaks, badges                      |
| `numbers`  | numbers and symbols drill                                         |
| `koch`     | furthest lesson reached and best score per lesson                 |
| `cave`     | Cave of Echoes crawl: room, HP, cleared rooms, doors, loot         |

Signing in **merges** guest progress with whatever is already on the account
rather than overwriting either side: the higher score per character wins, badges
are unioned, and counters take the maximum. So playing as a guest first and
signing in later never loses work. That merge is covered by unit tests in
`src/lib/cloud.test.ts`, including a guard that fails the build if a future
progress slice is added without being merged.

Cave of Echoes crawls merge generously: rooms cleared, doors opened and loot are
kept from both sides, beating the boss on any device counts, and you are stood
where the further-along crawl had reached.

---

## Email abuse, rate limits and unsubscribe

The magic-link endpoint takes an arbitrary address and emails it, so it is worth
being deliberate about abuse. Anyone can POST to `/auth/v1/otp`; without limits a
script could use the project to mail someone repeatedly.

**What already protects it**

- **A per-address cooldown.** Supabase refuses a second link to the same address
  inside a minimum interval (60s by default) and answers `429` with
  "For security purposes, you can only request this after N seconds".
- **An hourly cap on emails sent**, project-wide. On the built-in email service
  this is deliberately tiny (a couple of messages an hour) and Supabase documents
  that service as **for testing, not production**.
- **Row-level security** means a flood costs email quota but cannot touch anyone's
  saved progress.

Check and tune both under **Authentication → Rate Limits** and
**Authentication → Emails**.

**The real fix is a CAPTCHA, not an unsubscribe link**

Supabase supports hCaptcha and Cloudflare Turnstile on auth endpoints
(**Authentication → Attack Protection**). Turning it on and passing the token
through `signInWithOtp({ options: { captchaToken } })` is what actually stops a
bot enumerating addresses. Rate limits only bound the blast radius.

**On unsubscribe links:** a sign-in link is a *transactional* message that the
recipient just asked for, not marketing, so it is outside what unsubscribe rules
target and mail providers do not expect one. Adding one would also be a griefing
vector, since an attacker could unsubscribe a victim from their own sign-in
emails. The right answers to unwanted auth email are the CAPTCHA and the rate
limits above.

**The default email is unbranded, and its opt-out is not yours**

What the built-in service actually sends today:

- from `noreply@mail.app.supabase.io`, signed as "Supabase Auth"
- a generic "Confirm your email address" body with no Ditdah branding
- a footer reading "You're receiving this email because you signed up for an
  application **powered by Supabase**"
- an **"Opt out of these emails"** link that belongs to Supabase, not to us

That opt-out is worth understanding before relying on it as the answer to the
spam question above. It unsubscribes the recipient from the shared Supabase
mailer, so a user who clicks it may stop receiving *our* sign-in links as well.
It is a liability, not a safeguard, and a proper transactional setup does not
carry one.

**Fixing both problems at once**

Configure **custom SMTP** (Resend, Postmark, SendGrid) under
**Authentication → Emails → SMTP Settings**, sending from an address on
`ditdah.me`. That:

- drops the Supabase from-address, footer and opt-out link
- raises the tiny test-only cap so email sign-in works for real users
- adds bounce and complaint handling

Then paste the branded templates from `docs/email-templates/` into
**Authentication → Emails → Templates**. Both are needed, because
`signInWithOtp` sends **Confirm signup** to a new address and **Magic Link** to a
returning one, and it was the new-user path that looked unbranded.

Raising the sending cap raises the abuse ceiling too, so turn the CAPTCHA on at
the same time.

Google sign-in sidesteps all of this: it sends no email at all.

---

## Notes

- The browser only ever gets the Supabase **publishable** key
  (`sb_publishable_…`). The code hard-refuses a secret key, and the deployed
  bundle has been checked for leaks.
- Accounts are optional throughout: guests keep playing on local storage, and the
  account UI stays hidden entirely when Supabase env vars are absent.
- Google's branding rules are followed on the button (their exact wording, their
  unmodified four-colour mark, white surface); E2E tests assert this so a future
  restyle cannot quietly break compliance.
