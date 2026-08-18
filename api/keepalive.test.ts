import { describe, it, expect } from 'vitest';
import { pingSupabase } from './keepalive.js';

/** A fetch stand-in that records the request and returns a canned response. */
function fakeFetch(res: { status: number; ok?: boolean } | Error) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const impl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    if (res instanceof Error) throw res;
    return { ok: res.ok ?? (res.status >= 200 && res.status < 300), status: res.status };
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('pingSupabase', () => {
  it('queries the database, not the auth health endpoint', async () => {
    // The whole point is to generate *database* activity. /auth/v1/health is
    // served by the auth gateway and never reaches Postgres, so pinging it
    // would let the project pause while the check still reported success.
    const { impl, calls } = fakeFetch({ status: 200 });
    await pingSupabase(impl);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/rest/v1/user_state');
    expect(calls[0].url).not.toContain('/auth/v1/health');
  });

  it('asks for a single column and a single row', async () => {
    const { impl, calls } = fakeFetch({ status: 200 });
    await pingSupabase(impl);
    expect(calls[0].url).toContain('select=user_id');
    expect(calls[0].url).toContain('limit=1');
  });

  it('sends the api key both ways PostgREST accepts', async () => {
    const { impl, calls } = fakeFetch({ status: 200 });
    await pingSupabase(impl);
    expect(calls[0].headers).toHaveProperty('apikey');
    expect(calls[0].headers.Authorization).toMatch(/^Bearer /);
  });

  it('reports ok on a 200', async () => {
    const { impl } = fakeFetch({ status: 200 });
    const r = await pingSupabase(impl);
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
  });

  it('reports not-ok on a server error rather than throwing', async () => {
    const { impl } = fakeFetch({ status: 500 });
    const r = await pingSupabase(impl);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(500);
  });

  it('survives the paused-project case, where the host does not resolve', async () => {
    // This is the actual 2026-08-06 failure: NXDOMAIN, so fetch rejects before
    // any response exists. The cron must report it, not crash the function.
    const { impl } = fakeFetch(new TypeError('fetch failed'));
    const r = await pingSupabase(impl);
    expect(r.ok).toBe(false);
    expect(r.status).toBeNull();
    expect(r.error).toContain('fetch failed');
  });

  it('always reports a duration', async () => {
    const { impl } = fakeFetch({ status: 200 });
    const r = await pingSupabase(impl);
    expect(r.ms).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.ms)).toBe(true);
  });
});
