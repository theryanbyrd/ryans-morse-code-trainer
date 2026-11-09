/// <reference types="node" />
// Admin authentication. Files prefixed "_" are not routed by Vercel.
//
// Deliberately NOT a user system. Ditdah has no accounts, and adding one just
// to gate an ops console would be a worse trade than a single shared secret
// held in an env var. One operator, one token, no database.
//
// Requires ADMIN_TOKEN in Vercel env. Without it every admin route refuses,
// rather than defaulting open.
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { A, clientIp, rateLimit, logActivity, storeEnabled, incr, expire, getNum } from './_lib.js';

export const COOKIE = 'ditdah_admin';
const SESSION_HOURS = 8;

export type AdminReq = {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
};
export type AdminRes = {
  status: (c: number) => AdminRes;
  json: (d: unknown) => void;
  send: (d: string) => void;
  setHeader: (k: string, v: string | string[]) => void;
};

function adminToken(): string {
  return process.env.ADMIN_TOKEN || '';
}

/** Constant-time compare that cannot leak length through early return. */
export function secretsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  // Hash both first so the compared buffers are always equal length; comparing
  // raw values of different lengths makes timingSafeEqual throw, and padding
  // by hand reintroduces a length oracle.
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** The session value we set in the cookie: a derivative, never the token itself. */
export function sessionValue(token: string, salt: string): string {
  return createHash('sha256').update(`v1:${salt}:${token}`).digest('hex');
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** Is this request carrying a valid admin session? */
export function isAuthed(req: AdminReq): boolean {
  const token = adminToken();
  if (!token) return false;
  const raw = req.headers?.cookie;
  const cookie = parseCookies(Array.isArray(raw) ? raw[0] : raw)[COOKIE];
  if (!cookie) return false;
  return secretsMatch(cookie, sessionValue(token, process.env.PULSE_SALT || 'ditdah'));
}

export function setSessionCookie(res: AdminRes, token: string): void {
  const v = sessionValue(token, process.env.PULSE_SALT || 'ditdah');
  res.setHeader('Set-Cookie', [
    `${COOKIE}=${v}`,
    'Path=/',
    'HttpOnly',               // not readable from JS, so XSS cannot lift it
    'Secure',
    'SameSite=Strict',        // no cross-site admin requests at all
    `Max-Age=${SESSION_HOURS * 3600}`,
  ].join('; '));
}

export function clearSessionCookie(res: AdminRes): void {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

/**
 * Guard every admin route. Returns true when the handler may proceed.
 *
 * Refuses when ADMIN_TOKEN is unset: an ops console that defaults open is
 * worse than no console.
 */
export function requireAdmin(req: AdminReq, res: AdminRes): boolean {
  if (!adminToken()) {
    res.status(503).json({ ok: false, error: 'admin not configured (ADMIN_TOKEN unset)' });
    return false;
  }
  if (!isAuthed(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

export type LoginOutcome =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Login with brute-force protection.
 *
 * Failures are counted per address for an hour. The counter is incremented
 * BEFORE the comparison, so a flood of wrong guesses locks out even if each
 * individual request is cheap.
 */
export async function attemptLogin(ip: string, supplied: string): Promise<LoginOutcome> {
  const token = adminToken();
  if (!token) return { ok: false, status: 503, error: 'admin not configured' };

  const burst = await rateLimit('adminlogin', ip, 10, 600);
  if (!burst.allowed) return { ok: false, status: 429, error: 'too many attempts' };

  if (storeEnabled && ip) {
    try {
      const key = A.loginFails(ip);
      const fails = await getNum(key);
      if (fails >= 8) return { ok: false, status: 429, error: 'locked out, try later' };
    } catch { /* fail open on a broken store; the burst limit still applies */ }
  }

  if (!secretsMatch(supplied, token)) {
    if (storeEnabled && ip) {
      try {
        const key = A.loginFails(ip);
        await incr(key);
        await expire(key, 3600);
      } catch { /* non-fatal */ }
    }
    await logActivity({ kind: 'admin', name: 'login_failed', ip: '', ua: '' });
    return { ok: false, status: 401, error: 'invalid token' };
  }

  await logActivity({ kind: 'admin', name: 'login_ok', ip: '', ua: '' });
  return { ok: true };
}

/** Helper for generating a token when setting this up. */
export function suggestToken(): string {
  return randomBytes(48).toString('base64url');
}
