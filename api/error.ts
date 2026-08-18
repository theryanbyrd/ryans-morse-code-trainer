/// <reference types="node" />
// POST /api/error — ingest one client-side error report.
//
// Two sinks, deliberately:
//   1. console.error, always. This lands in the Vercel runtime log with no
//      configuration at all, so error visibility does not depend on the Upstash
//      store that has never been connected. `vercel logs` shows it immediately.
//   2. Daily counters in Upstash when it IS configured, so the digest can say
//      "47 client errors yesterday" instead of nobody noticing for ten days.
//
// The client scrubs emails, JWTs and keys before sending (see src/lib/errorLog)
// and we re-scrub here, because an endpoint on the public internet should not
// trust that its caller did the redaction.
import { createHash } from 'node:crypto';
import { incr, getNum, sadd, expire, dayKey, readJson, D, DAY_TTL, storeEnabled } from './_lib.js';

type Req = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

// This endpoint CANNOT take a CRON_SECRET the way /api/keepalive and
// /api/digest do: browsers call it, so the secret would have to ship in the
// client bundle where anyone can read it, which protects nothing. It has to
// stay open, so it is bounded instead — an oversized body is refused outright
// and each address gets an hourly ceiling. The client already caps itself at 8
// reports per session; this is the floor under a caller that ignores that.
const MAX_BODY = 8_000; // characters of JSON
const MAX_PER_IP_PER_HOUR = 60;

const header = (req: Req, name: string): string => {
  const v = req.headers?.[name];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
};

/** Hourly bucket key for one caller, hashed the same way pulse() hashes visitors. */
export function rateKey(hour: string, salt: string, ip: string): string {
  const who = createHash('sha256').update(`${hour}:${salt}:${ip}`).digest('hex').slice(0, 24);
  return `rmct:erate:${hour}:${who}`;
}

/** The reporting hour, used only to bucket the rate limit. */
export function hourKey(d = new Date()): string {
  return `${dayKey(d)}:${d.getUTCHours()}`;
}

type Report = {
  kind?: unknown;
  message?: unknown;
  stack?: unknown;
  where?: unknown;
  url?: unknown;
};

const KINDS = ['uncaught', 'rejection', 'auth', 'sync', 'manual'];
const MAX_MESSAGE = 300;
const MAX_STACK = 1800;

/** Belt-and-braces redaction; mirrors the client's scrub(). */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<jwt>')
    .replace(/\b(sb_(?:publishable|secret)_|sbp_)[A-Za-z0-9_-]+/g, '<key>')
    .replace(/\b[0-9a-f]{32,}\b/gi, '<hex>');
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? scrub(v).slice(0, max) : '';
}

/** Normalise an untrusted body into something safe to log, or null to reject. */
export function normalize(body: Report | null): {
  kind: string;
  message: string;
  stack: string;
  where: string;
  url: string;
} | null {
  if (!body) return null;
  const message = str(body.message, MAX_MESSAGE);
  if (!message) return null;
  const kind = typeof body.kind === 'string' && KINDS.includes(body.kind) ? body.kind : 'manual';
  return {
    kind,
    message,
    stack: str(body.stack, MAX_STACK),
    where: str(body.where, 80),
    url: str(body.url, 200),
  };
}

/** A short, stable label for grouping identical failures in the counters. */
export function fingerprint(kind: string, message: string): string {
  return `${kind}:${message.toLowerCase().replace(/[^a-z ]+/g, '').trim().slice(0, 48)}`;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  // Refuse an oversized body before doing any work on it.
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? '');
  if (raw.length > MAX_BODY) {
    res.status(413).json({ ok: false, error: 'report too large' });
    return;
  }

  const report = normalize(readJson<Report>(req));
  if (!report) {
    res.status(400).json({ ok: false, error: 'bad report' });
    return;
  }

  // Hourly ceiling per address. Only enforceable with a store; without one this
  // is a no-op and the response says so rather than implying a limit exists.
  const ip = header(req, 'x-forwarded-for').split(',')[0].trim();
  if (storeEnabled && ip) {
    try {
      const hour = hourKey();
      const key = rateKey(hour, process.env.PULSE_SALT || 'ditdah', ip);
      const seen = await getNum(key);
      if (seen >= MAX_PER_IP_PER_HOUR) {
        res.status(429).json({ ok: false, error: 'rate limited' });
        return;
      }
      await incr(key);
      await expire(key, 3600);
    } catch {
      /* a broken store must not stop a real report from being logged */
    }
  }

  // Sink 1: the runtime log. One line, structured, greppable.
  // eslint-disable-next-line no-console
  console.error(
    `[client-error] ${JSON.stringify({
      kind: report.kind,
      message: report.message,
      where: report.where,
      url: report.url,
      ...(report.stack ? { stack: report.stack } : {}),
    })}`,
  );

  // Sink 2: aggregate counters, when a store exists.
  try {
    const day = dayKey();
    await incr(D.errors(day));
    await expire(D.errors(day), DAY_TTL);
    await sadd(D.errorKinds(day), fingerprint(report.kind, report.message));
    await expire(D.errorKinds(day), DAY_TTL);
  } catch {
    /* the log line already happened; the counter is a bonus */
  }

  res.status(200).json({ ok: true, logged: true, counted: storeEnabled, limited: storeEnabled });
}
