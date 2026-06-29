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
