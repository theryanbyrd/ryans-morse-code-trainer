import { describe, it, expect, beforeEach } from 'vitest';
import {
  scrub,
  safeUrl,
  buildReport,
  shouldSend,
  resetErrorLog,
  isNetworkFailure,
} from './errorLog';

beforeEach(() => resetErrorLog());

describe('scrub', () => {
  // The reason this exists: Supabase auth errors quote the address you typed,
  // so without scrubbing a failed magic link ships the learner's email to logs.
  it('removes email addresses', () => {
    const out = scrub('Unable to validate email address: elaine.byrd+cw@gmail.com');
    expect(out).not.toContain('elaine.byrd+cw@gmail.com');
    expect(out).not.toContain('gmail.com');
    expect(out).toContain('<email>');
  });

  it('removes JWTs', () => {
    const out = scrub('bad token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-def_123');
    expect(out).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(out).toContain('<jwt>');
  });

  it('removes Supabase keys', () => {
    expect(scrub('key sb_publishable_AbC123-xyz failed')).toContain('<key>');
    expect(scrub('key sb_publishable_AbC123-xyz failed')).not.toContain('AbC123');
    expect(scrub('key sb_secret_TopSecret99 failed')).not.toContain('TopSecret99');
  });

  it('removes long hex strings such as tokens and hashes', () => {
    const hex = 'a'.repeat(40);
    expect(scrub(`token ${hex}`)).toContain('<hex>');
    expect(scrub(`token ${hex}`)).not.toContain(hex);
  });

  it('leaves an ordinary message alone', () => {
    expect(scrub('Failed to fetch')).toBe('Failed to fetch');
  });
});

describe('safeUrl', () => {
  it('drops the query and hash, which can carry a magic-link token', () => {
    expect(safeUrl('https://ditdah.me/?code=secret#access_token=abc')).toBe('https://ditdah.me/');
  });

  it('returns empty string for a non-URL', () => {
    expect(safeUrl('not a url')).toBe('');
  });
});

describe('buildReport', () => {
  it('scrubs the message and the stack', () => {
    const err = new Error('failed for ryan@example.com');
    err.stack = 'Error: failed for ryan@example.com\n  at x';
    const r = buildReport('auth', err, undefined, 'https://ditdah.me/x?t=1');
    expect(r.message).not.toContain('ryan@example.com');
    expect(r.stack).not.toContain('ryan@example.com');
    expect(r.url).toBe('https://ditdah.me/x');
  });

  it('handles a thrown non-Error', () => {
    const r = buildReport('rejection', 'plain string failure', undefined, 'https://ditdah.me/');
    expect(r.message).toBe('plain string failure');
    expect(r.stack).toBeUndefined();
  });

  it('never produces an empty message', () => {
    const r = buildReport('manual', '', undefined, 'https://ditdah.me/');
    expect(r.message).toBe('unknown error');
  });

  it('truncates a runaway message', () => {
    const r = buildReport('manual', 'x'.repeat(5000), undefined, 'https://ditdah.me/');
    expect(r.message.length).toBeLessThanOrEqual(300);
  });
});

describe('shouldSend', () => {
  const mk = (msg: string) => buildReport('uncaught', new Error(msg), undefined, 'https://ditdah.me/');

  it('sends a new error', () => {
    expect(shouldSend(mk('boom'))).toBe(true);
  });

  it('suppresses a repeat of the same error', () => {
    expect(shouldSend(mk('boom'))).toBe(true);
    expect(shouldSend(mk('boom'))).toBe(false);
  });

  it('caps the session so a render loop cannot become a firehose', () => {
    let accepted = 0;
    for (let i = 0; i < 100; i++) if (shouldSend(mk(`distinct error ${i}`))) accepted++;
    expect(accepted).toBe(8);
  });
});

describe('isNetworkFailure', () => {
  it('recognises what each browser says when the backend is unreachable', () => {
    // The two messages from the actual bug reports.
    expect(isNetworkFailure('Failed to fetch')).toBe(true); // Chrome
    expect(isNetworkFailure('Load failed')).toBe(true); // Safari
    expect(isNetworkFailure('NetworkError when attempting to fetch resource.')).toBe(true); // Firefox
  });

  it('does not swallow a real auth error', () => {
    expect(isNetworkFailure('Invalid login credentials')).toBe(false);
    expect(isNetworkFailure('Email rate limit exceeded')).toBe(false);
  });
});
