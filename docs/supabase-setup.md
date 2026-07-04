# Supabase setup (optional — enables accounts + cross-device sync)

Accounts are **off by default**. Everyone can play as a guest with local storage.
To turn on sign-in and cloud sync, do this once:

## 1. Create a Supabase project
- Go to https://supabase.com → New project. Pick a name/region; save the DB password.

## 2. Create the table
- Dashboard → **SQL Editor** → New query → paste the contents of
  [`supabase/schema.sql`](../supabase/schema.sql) → **Run**.
- This creates `public.user_state` with Row-Level Security so each user only
  sees their own row.

## 3. Configure auth
- Dashboard → **Authentication → Providers**:
  - **Email** is on by default → magic-link sign-in works immediately.
  - (Optional) **Google**: enable it and add your Google OAuth client id/secret.
- Dashboard → **Authentication → URL Configuration**:
  - Set **Site URL** to your app URL (e.g. `https://ryans-morse-code-trainer.vercel.app`).
  - Add the same URL (and `http://localhost:5173` for dev) to **Redirect URLs**.

## 4. Add the keys
Dashboard → **Project Settings → API Keys**. Copy the **Project URL** and the
**Publishable key** (`sb_publishable_…`).

> ⚠️ Use the **Publishable** key (the new name for the anon key) — it's
> browser-safe. **Never** use the **Secret** key (`sb_secret_…` / service_role):
> it bypasses Row-Level Security, and Vite bakes `VITE_*` vars into the public
> JS bundle. The app hard-refuses a secret key and logs an error if you try.

Local dev — create `.env.local` (see [`.env.example`](../.env.example)):
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
```

Vercel — Project → **Settings → Environment Variables**, add the same two keys
(Production + Preview), then redeploy:
```
vercel --prod
```

## What happens once configured
- A **Sign in** chip appears in the top bar.
- Signing in (magic link or Google) **merges** your current on-device progress
  into your account, then keeps it synced. Sign in on another device to pick up
  where you left off.
- The anon key is safe to expose in the browser; RLS protects the data.
