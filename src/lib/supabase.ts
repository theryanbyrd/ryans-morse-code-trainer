// Supabase client — OPTIONAL. If the env vars aren't set, `supabaseEnabled` is
// false and the whole account layer stays dormant (the app runs guest-only on
// local storage). Configure by adding these to your environment / Vercel:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
