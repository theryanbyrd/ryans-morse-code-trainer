// Operational error logging.
//
// This is deliberately NOT the same thing as analytics. track() is gated on the
// Tracking Consent setting because it studies how people use Ditdah. This
// carries no identifiers and no behavioural data, only "something threw, here is
// the stack", so it is not gated: consent governs whether we watch the learner,
// not whether we are allowed to notice the app is broken.
//
// Why it exists: on 2026-08-06 the Supabase project auto-paused. Every sign-in
// failed for ten days, the browser showed its generic "Failed to fetch", and
// nothing anywhere reported it. It reached Ryan as a screenshot from a user.
//
// Reports go to /api/error, which always writes them to the Vercel runtime log
// (visible via `vercel logs`, no store required) and additionally counts them in
// Upstash when that is configured.

import { apiUrl } from './native';

export type ErrorKind =
  | 'uncaught' // window.onerror
  | 'rejection' // unhandled promise rejection
  | 'auth' // sign-in / sign-out failed
  | 'sync' // cloud load or save failed
  | 'manual';

export type ClientError = {
  kind: ErrorKind;
  message: string;
  stack?: string;
  where?: string;
  url: string;
  ts: number;
};

const MAX_PER_SESSION = 8; // a broken render loop must not become a firehose
const MAX_MESSAGE = 300;
const MAX_STACK = 1800;

let sent = 0;
const seen = new Set<string>();

/**
 * Remove anything that could identify a person before the report leaves the
 * browser. Supabase auth errors quote the address you typed, so without this a
 * failed magic link would ship the learner's email address to our logs.
 */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<jwt>')
    .replace(/\b(sb_(?:publishable|secret)_|sbp_)[A-Za-z0-9_-]+/g, '<key>')
    .replace(/\b[0-9a-f]{32,}\b/gi, '<hex>');
}

/** Strip the query and hash so a report never carries a magic-link token. */
export function safeUrl(href: string): string {
  try {
    const u = new URL(href);
    return u.origin + u.pathname;
  } catch {
    return '';
  }
}

function fingerprint(e: ClientError): string {
  return `${e.kind}|${e.message.slice(0, 120)}`;
}

/** Build the payload without sending it (exported for tests). */
export function buildReport(
  kind: ErrorKind,
  err: unknown,
  where?: string,
  href = typeof location !== 'undefined' ? location.href : '',
): ClientError {
  const raw = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error && err.stack ? scrub(err.stack).slice(0, MAX_STACK) : undefined;
  return {
    kind,
    message: scrub(raw).slice(0, MAX_MESSAGE) || 'unknown error',
    ...(stack ? { stack } : {}),
    ...(where ? { where: scrub(where).slice(0, 80) } : {}),
    url: safeUrl(href),
    ts: Date.now(),
  };
}

/** True if this report is new and we are still under the session cap. */
export function shouldSend(e: ClientError): boolean {
  if (sent >= MAX_PER_SESSION) return false;
  const fp = fingerprint(e);
  if (seen.has(fp)) return false;
  seen.add(fp);
  sent += 1;
  return true;
}

/** Reset the dedupe state. Tests only. */
export function resetErrorLog(): void {
  sent = 0;
  seen.clear();
}

/** Report an error. Never throws, never blocks, never breaks the app. */
export function reportError(kind: ErrorKind, err: unknown, where?: string): void {
  try {
    const report = buildReport(kind, err, where);
    if (!shouldSend(report)) return;
    const body = JSON.stringify(report);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(apiUrl('/api/error'), new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(apiUrl('/api/error'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* logging the error must never be the thing that breaks */
  }
}

/** Attach the global handlers. Call once, at startup. */
export function installErrorLogging(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (ev) => {
    // Resource load failures (a dead image element) fire here with no error
    // object and are noise, so only report real exceptions.
    if (!ev.error) return;
    reportError('uncaught', ev.error, ev.filename ? safeUrl(ev.filename) : undefined);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    reportError('rejection', ev.reason);
  });
}

/**
 * Is this the shape of "the backend is unreachable"? Both browsers report a
 * failed fetch with a generic message, which is useless to a learner, so the UI
 * uses this to say something true instead.
 */
export function isNetworkFailure(message: string): boolean {
  return /failed to fetch|load failed|networkerror|network request failed|err_name_not_resolved/i.test(
    message,
  );
}
