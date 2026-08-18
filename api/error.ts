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
import { incr, sadd, expire, dayKey, readJson, D, DAY_TTL, storeEnabled } from './_lib.js';

type Req = { method?: string; body?: unknown };
type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

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

  const report = normalize(readJson<Report>(req));
  if (!report) {
    res.status(400).json({ ok: false, error: 'bad report' });
    return;
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

  res.status(200).json({ ok: true, logged: true, counted: storeEnabled });
}
