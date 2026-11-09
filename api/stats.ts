// GET /api/stats — public, anonymised aggregate usage statistics.
import { getNum, scard, ALPHABET, K, storeEnabled } from './_lib.js';
import { clientIp, rateLimit, isIpBlocked } from './_lib.js';

type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

export default async function handler(req: { headers?: Record<string, string | string[] | undefined> }, res: Res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  // These endpoints each fan out to ~54 Redis reads, so an unbounded request
  // rate is a cost-amplification vector against a metered store, not just
  // traffic. Bounded per address.
  const ip = clientIp(req.headers);
  if (await isIpBlocked(ip)) {
    res.status(403).json({ enabled: false, error: 'blocked' });
    return;
  }
  const rl = await rateLimit('stats', ip, 60, 3600);
  if (!rl.allowed) {
    res.status(429).json({ enabled: false, error: 'rate limited' });
    return;
  }

  if (!storeEnabled) {
    res.status(200).json({ enabled: false, message: 'Analytics storage is not configured.' });
    return;
  }

  const [answers, correct, learned, completes, sessions, learners] = await Promise.all([
    getNum(K.answers),
    getNum(K.correct),
    getNum(K.learned),
    getNum(K.completes),
    getNum(K.sessions),
    scard('rmct:anon'),
  ]);

  const perLetter = await Promise.all(
    ALPHABET.map(async (l) => {
      const [att, cor] = await Promise.all([getNum(K.att(l)), getNum(K.cor(l))]);
      return { letter: l, attempts: att, correct: cor, accuracy: att ? Math.round((cor / att) * 100) : 0 };
    }),
  );

  res.status(200).json({
    enabled: true,
    sessions,
    learners,
    answers,
    correct,
    accuracy: answers ? Math.round((correct / answers) * 100) : 0,
    lettersLearned: learned,
    courseCompletions: completes,
    perLetter,
  });
}
