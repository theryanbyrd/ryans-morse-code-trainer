import { describe, it, expect } from 'vitest';
import { normalize, fingerprint, scrub } from './error.js';

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

describe('scrub (server copy)', () => {
  it('matches the client on the cases that matter', () => {
    expect(scrub('a@b.co')).toBe('<email>');
    expect(scrub('Failed to fetch')).toBe('Failed to fetch');
  });
});
