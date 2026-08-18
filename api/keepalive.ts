/// <reference types="node" />
// GET /api/keepalive — keeps the Supabase project from being auto-paused.
//
// Supabase pauses free-tier projects after 7 days of inactivity. Ditdah only
// talks to Supabase when somebody signs in, so a quiet week is enough to pause
// the project. While paused the hostname stops resolving entirely (NXDOMAIN),
// so every auth call dies at DNS and the browser reports the generic "Failed to
// fetch" / "Load failed". That is what happened on 2026-08-06.
//
// Vercel Cron calls this daily (see vercel.json), which leaves 7x margin.
//
// It issues a real PostgREST query rather than hitting /auth/v1/health, because
// the health endpoint is served by the auth gateway and never touches Postgres.
// RLS means an anonymous select returns an empty array, but the query still
// executes on the database, which is the activity that matters.
//
// Env (already set for the client build; no new secrets needed):
//   VITE_SUPABASE_URL / SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY
//   CRON_SECRET  optional, same guard the digest uses

type Req = { method?: string; headers?: Record<string, string | string[] | undefined> };
type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabaseConfigured = Boolean(URL_ && KEY);

export type PingResult = {
  ok: boolean;
  status: number | null;
  ms: number;
  error?: string;
};

/** One cheap authenticated read against user_state. Never throws. */
export async function pingSupabase(fetchImpl: typeof fetch = fetch): Promise<PingResult> {
  const started = Date.now();
  try {
    const res = await fetchImpl(`${URL_}/rest/v1/user_state?select=user_id&limit=1`, {
      method: 'GET',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      signal: AbortSignal.timeout(20_000),
    });
    // A paused or deleted project never gets this far: it fails at DNS.
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      status: null,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  const secret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization;
  if (secret && auth !== `Bearer ${secret}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  if (!supabaseConfigured) {
    // Say what is missing rather than reporting a healthy ping we never made.
    res.status(200).json({ ok: false, pinged: false, reason: 'supabase env not configured' });
    return;
  }

  const result = await pingSupabase();

  // 5xx tells Vercel the cron run failed, so it shows up as a failure in the
  // dashboard instead of looking like a successful no-op.
  res.status(result.ok ? 200 : 503).json({
    ok: result.ok,
    pinged: true,
    status: result.status,
    ms: result.ms,
    ...(result.error ? { error: result.error } : {}),
  });
}
