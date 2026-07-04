// Supabase client — OPTIONAL. If the env vars aren't set, `supabaseEnabled` is
// false and the whole account layer stays dormant (the app runs guest-only on
// local storage). Configure by adding these to your environment / Vercel:
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY   (use the Supabase *publishable* key, sb_publishable_…,
//                             which is the new name for the anon key)
//
// SECURITY: this runs in the browser, so only the publishable/anon key belongs
// here. The *secret* key (sb_secret_… / service_role) bypasses Row-Level
// Security and must never ship in client code — we hard-refuse it below.
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

const isSecretKey = Boolean(rawKey && (rawKey.startsWith('sb_secret_') || rawKey.startsWith('sbp_')));
if (isSecretKey) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Refusing to use a SECRET Supabase key in the browser. ' +
      'Replace VITE_SUPABASE_ANON_KEY with the publishable key (sb_publishable_…).',
  );
}

const anonKey = isSecretKey ? undefined : rawKey;

export const supabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
