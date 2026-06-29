// Anonymous, consent-gated analytics. Events are POSTed to /api/track only when
// the learner has opted in via the Tracking Consent setting. Everything is
// best-effort: failures are swallowed so they never affect gameplay.

export type TrackEvent = {
  type: 'answer' | 'letter_learned' | 'course_complete' | 'session_start';
  letter?: string;
  correct?: boolean;
};

// A stable, random, non-identifying id for de-duplicating sessions server-side.
function anonId(): string {
  const KEY = 'rmct.anon';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function track(event: TrackEvent, consent: boolean): void {
  if (!consent) return;
  try {
    const body = JSON.stringify({ ...event, anonId: anonId(), ts: Date.now() });
    // sendBeacon survives page unloads; fall back to fetch.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
    }
  } catch {
    /* never let analytics break the app */
  }
}
