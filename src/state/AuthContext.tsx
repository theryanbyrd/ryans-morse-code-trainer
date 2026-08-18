import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { isNetworkFailure, reportError } from '../lib/errorLog';

// When the backend is unreachable the browser hands us its own wording, which
// is meaningless to a learner: Chrome says "Failed to fetch", Safari says "Load
// failed". Say what is actually true, and reassure them nothing is lost.
const OFFLINE_MESSAGE =
  'Cannot reach the sign-in service right now. Your progress is safe on this device, so you can keep playing as a guest and sign in later.';

/** Log an auth failure and turn it into something worth reading. */
function authFailure(message: string, where: string): { ok: false; error: string } {
  reportError('auth', new Error(message), where);
  return { ok: false, error: isNetworkFailure(message) ? OFFLINE_MESSAGE : message };
}

type AuthCtx = {
  enabled: boolean;
  ready: boolean;
  googleEnabled: boolean;
  user: User | null;
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabaseEnabled);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUser(data.session?.user ?? null);
        setReady(true);
      })
      .catch((err) => {
        // This is the call that failed silently for ten days while the Supabase
        // project was paused. Report it, and still mark auth ready so the app
        // settles into guest mode instead of hanging.
        reportError('auth', err, 'getSession');
        setReady(true);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    // Only surface the Google button if the provider is actually enabled.
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;
    if (url && key) {
      fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setGoogleEnabled(Boolean(d?.external?.google)))
        .catch((err) => reportError('auth', err, 'authSettings'));
    }
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      enabled: supabaseEnabled,
      ready,
      googleEnabled,
      user,
      async signInWithEmail(email) {
        if (!supabase) return { ok: false, error: 'Sign-in is not configured.' };
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        return error ? authFailure(error.message, 'signInWithEmail') : { ok: true };
      },
      async signInWithGoogle() {
        if (!supabase) return { ok: false, error: 'Sign-in is not configured.' };
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        return error ? authFailure(error.message, 'signInWithGoogle') : { ok: true };
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
    }),
    [ready, googleEnabled, user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
