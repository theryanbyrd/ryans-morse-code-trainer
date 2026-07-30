// POST /api/track — ingest a single anonymous, consent-gated learning event.
// Only aggregate counters are stored; no per-user data is retained.
import { incr, sadd, expire, dayKey, readJson, ALPHABET, K, D, DAY_TTL, storeEnabled } from './_lib.js';

type Req = { method?: string; body?: unknown };
type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

type Event = {
  type?: string;
  letter?: string;
  correct?: boolean;
  anonId?: string;
  target?: string;
};

/** Bump a daily counter and keep it from living forever. */
async function bumpDay(key: string) {
  await incr(key);
  await expire(key, DAY_TTL);
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  const e = readJson<Event>(req);
  if (!e || typeof e.type !== 'string') {
    res.status(400).json({ ok: false, error: 'bad event' });
    return;
  }

  // Best-effort; storage may be disabled (no DB configured).
  const day = dayKey();
  try {
    switch (e.type) {
      case 'session_start':
        await incr(K.sessions);
        if (e.anonId) await sadd('rmct:anon', String(e.anonId).slice(0, 64));
        break;
      case 'share': {
        await bumpDay(D.shares(day));
        const t = typeof e.target === 'string' ? e.target.replace(/[^a-z]/gi, '').slice(0, 16).toLowerCase() : '';
        if (t) await bumpDay(D.share(day, t));
        break;
      }
      case 'signin':
        await bumpDay(D.signins(day));
        break;
      case 'answer': {
        await incr(K.answers);
        await bumpDay(D.answers(day));
        if (e.correct) await incr(K.correct);
        const l = typeof e.letter === 'string' ? e.letter.toLowerCase() : '';
        if (ALPHABET.includes(l)) {
          await incr(K.att(l));
          if (e.correct) await incr(K.cor(l));
        }
        break;
      }
      case 'letter_learned':
        await incr(K.learned);
        await bumpDay(D.learned(day));
        break;
      case 'course_complete':
        await incr(K.completes);
        break;
      default:
        break;
    }
  } catch {
    /* swallow — analytics must never error the client */
  }

  res.status(200).json({ ok: true, stored: storeEnabled });
}
