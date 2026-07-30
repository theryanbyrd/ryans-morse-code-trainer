/// <reference types="node" />
// POST /api/pulse — one aggregate ping per visit.
//
// Deliberately NOT gated on the tracking-consent setting, because it records no
// personal data: plain daily counters, plus a unique-visitor tally built from a
// hash of (IP + User-Agent + a salt that changes every day). The raw IP is never
// stored, and yesterday's hashes cannot be recomputed once the salt rotates, so
// the set counts people without identifying them.
import { createHash } from 'node:crypto';
import { incr, sadd, expire, dayKey, D, DAY_TTL, storeEnabled } from './_lib.js';

type Req = { method?: string; headers?: Record<string, string | string[] | undefined> };
type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

const header = (req: Req, name: string): string => {
  const v = req.headers?.[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
};

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  const day = dayKey();
  try {
    await incr(D.views(day));
    await expire(D.views(day), DAY_TTL);

    // Salt rotates daily, so the hash cannot be linked across days or reversed
    // into an address without also knowing the (unstored) salt for that day.
    const ip = header(req, 'x-forwarded-for').split(',')[0].trim();
    const ua = header(req, 'user-agent');
    const salt = process.env.PULSE_SALT || 'ditdah';
    if (ip) {
      const visitor = createHash('sha256').update(`${day}:${salt}:${ip}:${ua}`).digest('hex').slice(0, 24);
      await sadd(D.visitors(day), visitor);
      await expire(D.visitors(day), DAY_TTL);
    }
  } catch {
    /* analytics must never break a page load */
  }

  res.status(200).json({ ok: true, stored: storeEnabled });
}
