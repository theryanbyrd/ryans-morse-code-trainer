import { describe, it, expect } from 'vitest';
import { secretsMatch, sessionValue, parseCookies, isAuthed, requireAdmin, COOKIE } from './_admin.js';

describe('secretsMatch', () => {
  it('matches identical secrets', () => {
    expect(secretsMatch('hunter2', 'hunter2')).toBe(true);
  });

  it('rejects different secrets, including different lengths', () => {
    // Hashing both before comparing is what makes the different-length case
    // safe: timingSafeEqual throws on unequal buffers, and hand-padding would
    // reintroduce a length oracle.
    expect(secretsMatch('hunter2', 'hunter3')).toBe(false);
    expect(secretsMatch('short', 'a-much-longer-secret-value')).toBe(false);
  });

  it('rejects empty input rather than treating it as a match', () => {
    expect(secretsMatch('', '')).toBe(false);
    expect(secretsMatch('', 'x')).toBe(false);
    expect(secretsMatch('x', '')).toBe(false);
  });
});

describe('sessionValue', () => {
  it('never returns the token itself', () => {
    const v = sessionValue('super-secret-token', 'salt');
    expect(v).not.toContain('super-secret-token');
    expect(v).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes with the salt, so rotating the salt invalidates sessions', () => {
    expect(sessionValue('t', 'a')).not.toBe(sessionValue('t', 'b'));
  });
});

describe('parseCookies', () => {
  it('parses a normal cookie header', () => {
    expect(parseCookies('a=1; b=two')).toEqual({ a: '1', b: 'two' });
  });
  it('survives junk', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('nonsense')).toEqual({});
  });
});

describe('isAuthed', () => {
  const token = 'the-admin-token';
  it('refuses when ADMIN_TOKEN is unset, rather than defaulting open', () => {
    delete process.env.ADMIN_TOKEN;
    const good = sessionValue(token, 'ditdah');
    expect(isAuthed({ headers: { cookie: `${COOKIE}=${good}` } })).toBe(false);
  });

  it('accepts a cookie derived from the configured token', () => {
    process.env.ADMIN_TOKEN = token;
    delete process.env.PULSE_SALT;
    const good = sessionValue(token, 'ditdah');
    expect(isAuthed({ headers: { cookie: `${COOKIE}=${good}` } })).toBe(true);
  });

  it('rejects a forged or absent cookie', () => {
    process.env.ADMIN_TOKEN = token;
    expect(isAuthed({ headers: { cookie: `${COOKIE}=deadbeef` } })).toBe(false);
    expect(isAuthed({ headers: {} })).toBe(false);
  });
});

/** Minimal stand-in for the Vercel response. */
function fakeRes() {
  const out: { code?: number; body?: unknown } = {};
  const res = {
    status(c: number) { out.code = c; return res; },
    json(b: unknown) { out.body = b; },
    send() {},
    setHeader() {},
  };
  return { res, out };
}

describe('requireAdmin', () => {
  // This is the single most important control in the admin surface: it is the
  // one line standing between the public internet and IP blocking, feature
  // flags and the activity log. isAuthed() having its own guard is not enough,
  // because requireAdmin is what every route actually calls.
  it('FAILS CLOSED when ADMIN_TOKEN is unset', () => {
    delete process.env.ADMIN_TOKEN;
    const { res, out } = fakeRes();
    expect(requireAdmin({ headers: {} }, res)).toBe(false);
    expect(out.code).toBe(503);
  });

  it('refuses an unauthenticated request when a token IS configured', () => {
    process.env.ADMIN_TOKEN = 'configured-token';
    const { res, out } = fakeRes();
    expect(requireAdmin({ headers: {} }, res)).toBe(false);
    expect(out.code).toBe(401);
  });

  it('refuses a forged cookie', () => {
    process.env.ADMIN_TOKEN = 'configured-token';
    const { res, out } = fakeRes();
    expect(requireAdmin({ headers: { cookie: `${COOKIE}=forged` } }, res)).toBe(false);
    expect(out.code).toBe(401);
  });

  it('admits a request carrying a session derived from the real token', () => {
    process.env.ADMIN_TOKEN = 'configured-token';
    delete process.env.PULSE_SALT;
    const good = sessionValue('configured-token', 'ditdah');
    const { res } = fakeRes();
    expect(requireAdmin({ headers: { cookie: `${COOKIE}=${good}` } }, res)).toBe(true);
  });
});
