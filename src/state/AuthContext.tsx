import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '../lib/supabase';

type AuthCtx = {
  enabled: boolean;
  ready: boolean;
  user: User | null;
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabaseEnabled);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      enabled: supabaseEnabled,
      ready,
      user,
      async signInWithEmail(email) {
        if (!supabase) return { ok: false, error: 'Sign-in is not configured.' };
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      async signInWithGoogle() {
        if (!supabase) return { ok: false, error: 'Sign-in is not configured.' };
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
    }),
    [ready, user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
