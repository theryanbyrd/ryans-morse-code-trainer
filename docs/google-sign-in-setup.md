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
   - App name: `Ditdah`, support email: yours.
   - Authorised domain: `supabase.co` (that is where the callback lands).
   - Scopes: the defaults (`email`, `profile`, `openid`) are all that is needed.
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

Signing in **merges** guest progress with whatever is already on the account
rather than overwriting either side: the higher score per character wins, badges
are unioned, and counters take the maximum. So playing as a guest first and
signing in later never loses work. That merge is covered by unit tests in
`src/lib/cloud.test.ts`, including a guard that fails the build if a future
progress slice is added without being merged.

Cave of Echoes progress (`rmct.cave`) is currently **device-local only** and is
not part of the synced state.

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
