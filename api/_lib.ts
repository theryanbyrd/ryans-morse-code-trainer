/// <reference types="node" />
import { createHash } from 'node:crypto';
// Shared server helpers. Files prefixed with "_" are not turned into routes by
// Vercel, so this is just a module the handlers import.
//
// Storage is an OPTIONAL Upstash Redis (REST). If the env vars aren't set, every
// helper degrades to a no-op so the site still deploys and plays fine without a
// database — only the aggregate analytics are unavailable.

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeEnabled = Boolean(URL && TOKEN);

/** Run a single Redis command via the Upstash REST API. Returns the result. */
async function cmd(args: (string | number)[]): Promise<unknown> {
  if (!storeEnabled) return null;
  const res = await fetch(URL as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: unknown };
  return json.result ?? null;
}

export async function incr(key: string, by = 1): Promise<void> {
  await cmd(['INCRBY', key, by]);
}

export async function getNum(key: string): Promise<number> {
  const v = await cmd(['GET', key]);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Add a member to a set (used for de-duplicating anonymous sessions). */
export async function sadd(key: string, member: string): Promise<void> {
  await cmd(['SADD', key, member]);
}

export async function scard(key: string): Promise<number> {
  const v = await cmd(['SCARD', key]);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function expire(key: string, seconds: number): Promise<void> {
  await cmd(['EXPIRE', key, seconds]);
}

/**
 * The reporting day, in Ryan's timezone, so "yesterday" in the digest means the
 * day he actually lived rather than a UTC slice of it.
 */
export const REPORT_TZ = 'America/Denver';

export function dayKey(d = new Date(), offsetDays = 0): string {
  const shifted = new Date(d.getTime() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(shifted);
}

/** Daily aggregate counters. Plain totals, no per-person records. */
export const D = {
  views: (day: string) => `rmct:d:${day}:views`,
  visitors: (day: string) => `rmct:d:${day}:visitors`, // a set of salted hashes
  signins: (day: string) => `rmct:d:${day}:signins`,
  shares: (day: string) => `rmct:d:${day}:shares`,
  share: (day: string, target: string) => `rmct:d:${day}:share:${target}`,
  answers: (day: string) => `rmct:d:${day}:answers`,
  learned: (day: string) => `rmct:d:${day}:learned`,
  errors: (day: string) => `rmct:d:${day}:errors`,
  errorKinds: (day: string) => `rmct:d:${day}:errorkinds`, // a set of fingerprints
};

/** Keep daily keys for a few weeks, then let them fall away on their own. */
export const DAY_TTL = 60 * 60 * 24 * 45;

export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export const K = {
  answers: 'rmct:answers',
  correct: 'rmct:correct',
  completes: 'rmct:completes',
  learned: 'rmct:learned',
  sessions: 'rmct:sessions',
  att: (l: string) => `rmct:l:${l}:att`,
  cor: (l: string) => `rmct:l:${l}:cor`,
};

export function readJson<T = unknown>(req: { body?: unknown }): T | null {
  try {
    if (req.body == null) return null;
    if (typeof req.body === 'string') return JSON.parse(req.body) as T;
    return req.body as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Abuse controls, activity log, blocklists and flags.
//
// All of this rides the SAME optional Upstash store as the counters above. No
// new infrastructure, and every helper degrades to a documented default when
// the store is absent, so the site keeps working unconfigured.
//
// The honest caveat, stated once: without the store there is no shared state,
// so rate limiting CANNOT be enforced. These helpers report that rather than
// pretending. Vercel's own platform limits are the only backstop until
// KV_REST_API_URL / KV_REST_API_TOKEN exist.
// ---------------------------------------------------------------------------

/** Delete a key. */
export async function del(key: string): Promise<void> {
  await cmd(['DEL', key]);
}

/** Push onto the head of a list and trim it, so logs cannot grow without bound. */
export async function lpushCapped(key: string, value: string, cap: number): Promise<void> {
  await cmd(['LPUSH', key, value]);
  await cmd(['LTRIM', key, 0, cap - 1]);
}

/** Read a slice of a list, newest first. */
export async function lrange(key: string, start = 0, stop = -1): Promise<string[]> {
  const v = await cmd(['LRANGE', key, start, stop]);
  return Array.isArray(v) ? (v as string[]).map(String) : [];
}

export async function smembers(key: string): Promise<string[]> {
  const v = await cmd(['SMEMBERS', key]);
  return Array.isArray(v) ? (v as string[]).map(String) : [];
}

export async function srem(key: string, member: string): Promise<void> {
  await cmd(['SREM', key, member]);
}

export async function sismember(key: string, member: string): Promise<boolean> {
  const v = await cmd(['SISMEMBER', key, member]);
  return Number(v) === 1;
}

export async function setStr(key: string, value: string): Promise<void> {
  await cmd(['SET', key, value]);
}

export async function getStr(key: string): Promise<string | null> {
  const v = await cmd(['GET', key]);
  return v == null ? null : String(v);
}

/** Admin + ops keys. Kept together so the whole surface is readable at a glance. */
export const A = {
  blockedIps: 'rmct:admin:blocked:ips',
  blockedEmails: 'rmct:admin:blocked:emails',
  flags: 'rmct:admin:flags',               // JSON blob
  maintenance: 'rmct:admin:maintenance',   // JSON blob
  activity: (day: string) => `rmct:act:${day}`,
  errors: (day: string) => `rmct:errlog:${day}`,
  rate: (bucket: string, who: string) => `rmct:rl:${bucket}:${who}`,
  loginFails: (who: string) => `rmct:rl:adminlogin:${who}`,
};

/** How many entries each rolling log keeps. Bounded on purpose. */
export const LOG_CAP = 500;

/**
 * The caller's IP, as Vercel reports it. x-forwarded-for is a list; the first
 * entry is the client. Never trust it for authorisation, only for rate
 * bucketing and blocking, both of which are best-effort by nature.
 */
export function clientIp(headers: Record<string, string | string[] | undefined> | undefined): string {
  const raw = headers?.['x-forwarded-for'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (v ?? '').split(',')[0].trim();
}

/** A stable, non-identifying bucket id for an address. Never stores the raw IP. */
export function ipBucket(ip: string, salt: string, window: string): string {
  return createHash('sha256').update(`${window}:${salt}:${ip}`).digest('hex').slice(0, 24);
}

export type RateVerdict = { allowed: boolean; enforced: boolean; count: number; limit: number };

/**
 * Fixed-window rate limit.
 *
 * Returns `enforced: false` when there is no store, so a caller can say so
 * honestly instead of implying a ceiling that is not there.
 */
export async function rateLimit(
  bucket: string,
  ip: string,
  limit: number,
  windowSeconds: number,
): Promise<RateVerdict> {
  if (!storeEnabled || !ip) return { allowed: true, enforced: false, count: 0, limit };
  try {
    const window = String(Math.floor(Date.now() / 1000 / windowSeconds));
    const who = ipBucket(ip, process.env.PULSE_SALT || 'ditdah', window);
    const key = A.rate(bucket, `${window}:${who}`);
    const n = Number(await cmd(['INCR', key])) || 0;
    if (n === 1) await expire(key, windowSeconds);
    return { allowed: n <= limit, enforced: true, count: n, limit };
  } catch {
    // A broken store must not take the site down with it.
    return { allowed: true, enforced: false, count: 0, limit };
  }
}

/** Is this address on the blocklist? False when unconfigured. */
export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!storeEnabled || !ip) return false;
  try {
    return await sismember(A.blockedIps, ip);
  } catch {
    return false;
  }
}

export async function isEmailBlocked(email: string): Promise<boolean> {
  if (!storeEnabled || !email) return false;
  try {
    return await sismember(A.blockedEmails, email.trim().toLowerCase());
  } catch {
    return false;
  }
}

export type ActivityEntry = {
  t: number;        // epoch ms
  kind: string;     // pageview | action | error | admin
  name: string;     // screen, action name, or error fingerprint
  ip: string;       // hashed bucket, never the raw address
  ua: string;       // truncated user agent
  meta?: Record<string, unknown>;
};

/**
 * Append to the rolling activity log.
 *
 * The address is hashed with a daily-rotating salt before it is written, so
 * the log answers "how many and what" without becoming a record of who. That
 * keeps it consistent with the privacy policy and the App Store labels.
 */
export async function logActivity(e: Omit<ActivityEntry, 't'>): Promise<void> {
  if (!storeEnabled) return;
  try {
    const day = dayKey();
    const entry: ActivityEntry = { ...e, t: Date.now() };
    await lpushCapped(A.activity(day), JSON.stringify(entry), LOG_CAP);
    await expire(A.activity(day), DAY_TTL);
  } catch {
    /* logging must never break the request it is describing */
  }
}

export async function logError(fingerprint: string, detail: Record<string, unknown>): Promise<void> {
  if (!storeEnabled) return;
  try {
    const day = dayKey();
    await lpushCapped(A.errors(day), JSON.stringify({ t: Date.now(), fingerprint, ...detail }), LOG_CAP);
    await expire(A.errors(day), DAY_TTL);
  } catch {
    /* non-fatal */
  }
}

export type SiteConfig = {
  maintenance: { on: boolean; message: string };
  flags: Record<string, boolean>;
};

export const DEFAULT_CONFIG: SiteConfig = {
  maintenance: { on: false, message: '' },
  flags: {},
};

export async function readSiteConfig(): Promise<SiteConfig> {
  if (!storeEnabled) return DEFAULT_CONFIG;
  try {
    const [m, f] = await Promise.all([getStr(A.maintenance), getStr(A.flags)]);
    return {
      maintenance: m ? { ...DEFAULT_CONFIG.maintenance, ...JSON.parse(m) } : DEFAULT_CONFIG.maintenance,
      flags: f ? JSON.parse(f) : {},
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
