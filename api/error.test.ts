import { describe, it, expect } from 'vitest';
import handler, { normalize, fingerprint, scrub, rateKey, hourKey } from './error.js';

/** Minimal stand-ins for the Vercel request/response pair. */
function fakeRes() {
  const out: { code?: number; body?: unknown } = {};
  const res = {
    status(c: number) {
      out.code = c;
      return res;
    },
    json(b: unknown) {
      out.body = b;
    },
    setHeader() {},
  };
  return { res, out };
}

describe('normalize', () => {
  it('rejects a body with no message', () => {
    expect(normalize(null)).toBeNull();
    expect(normalize({})).toBeNull();
    expect(normalize({ message: '' })).toBeNull();
    expect(normalize({ message: 123 })).toBeNull();
  });

  it('keeps a well-formed report', () => {
    const r = normalize({ kind: 'auth', message: 'Failed to fetch', where: 'getSession' });
    expect(r).toMatchObject({ kind: 'auth', message: 'Failed to fetch', where: 'getSession' });
  });

  it('falls back to "manual" for an unknown kind', () => {
    expect(normalize({ kind: 'nonsense', message: 'x' })?.kind).toBe('manual');
    expect(normalize({ kind: 42, message: 'x' })?.kind).toBe('manual');
  });

  it('re-scrubs, because a public endpoint cannot trust its caller', () => {
    // A hand-rolled POST bypasses the client's scrub entirely.
    const r = normalize({ kind: 'manual', message: 'hi ryan@example.com' });
    expect(r?.message).not.toContain('ryan@example.com');
    expect(r?.message).toContain('<email>');
  });

  it('truncates an oversized message and stack', () => {
    const r = normalize({ message: 'x'.repeat(9000), stack: 'y'.repeat(9000) });
    expect(r!.message.length).toBeLessThanOrEqual(300);
    expect(r!.stack.length).toBeLessThanOrEqual(1800);
  });

  it('ignores non-string fields instead of logging "[object Object]"', () => {
    const r = normalize({ message: 'ok', stack: { evil: true }, url: 5 });
    expect(r?.stack).toBe('');
    expect(r?.url).toBe('');
  });
});

describe('fingerprint', () => {
  it('groups the same failure under one label', () => {
    expect(fingerprint('auth', 'Failed to fetch')).toBe(fingerprint('auth', 'Failed to fetch!'));
  });

  it('separates different kinds of the same message', () => {
    expect(fingerprint('auth', 'Failed to fetch')).not.toBe(fingerprint('sync', 'Failed to fetch'));
  });

  it('stays short enough to be a sane set member', () => {
    expect(fingerprint('auth', 'x'.repeat(500)).length).toBeLessThan(64);
  });
});

describe('rateKey', () => {
  it('is stable for the same caller in the same hour', () => {
    expect(rateKey('2026-08-16:14', 's', '1.2.3.4')).toBe(rateKey('2026-08-16:14', 's', '1.2.3.4'));
  });

  it('separates different callers, hours and salts', () => {
    const base = rateKey('2026-08-16:14', 's', '1.2.3.4');
    expect(rateKey('2026-08-16:14', 's', '9.9.9.9')).not.toBe(base);
    expect(rateKey('2026-08-16:15', 's', '1.2.3.4')).not.toBe(base);
    expect(rateKey('2026-08-16:14', 'other', '1.2.3.4')).not.toBe(base);
  });

  it('rotates the hash itself each hour, not just the key prefix', () => {
    // The hour is in the prefix too, so a key comparison alone would pass even
    // if the hash stopped rotating. Compare the hashed portion directly: if the
    // same address hashed identically every hour, a leaked store would let you
    // follow one caller through time.
    const hashOf = (k: string) => k.split(':').pop();
    expect(hashOf(rateKey('2026-08-16:14', 's', '1.2.3.4'))).not.toBe(
      hashOf(rateKey('2026-08-16:15', 's', '1.2.3.4')),
    );
  });

  it('never embeds the raw address', () => {
    // Same reasoning as the visitor hash in pulse: count callers, do not
    // identify them. The key goes into a store, so it must not be an IP.
    expect(rateKey('2026-08-16:14', 's', '203.0.113.77')).not.toContain('203.0.113.77');
  });
});

describe('hourKey', () => {
  it('buckets by hour', () => {
    const a = hourKey(new Date('2026-08-16T14:05:00Z'));
    const b = hourKey(new Date('2026-08-16T14:55:00Z'));
    const c = hourKey(new Date('2026-08-16T15:05:00Z'));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('handler', () => {
  it('refuses an oversized body before parsing it', async () => {
    const { res, out } = fakeRes();
    await handler({ method: 'POST', body: 'x'.repeat(20_000) }, res);
    expect(out.code).toBe(413);
  });

  it('refuses a non-POST', async () => {
    const { res, out } = fakeRes();
    await handler({ method: 'GET' }, res);
    expect(out.code).toBe(405);
  });

  it('accepts a normal report', async () => {
    const { res, out } = fakeRes();
    await handler({ method: 'POST', body: { kind: 'manual', message: 'ok' } }, res);
    expect(out.code).toBe(200);
    expect(out.body).toMatchObject({ ok: true, logged: true });
  });
});

describe('scrub (server copy)', () => {
  it('matches the client on the cases that matter', () => {
    expect(scrub('a@b.co')).toBe('<email>');
    expect(scrub('Failed to fetch')).toBe('Failed to fetch');
  });
});
