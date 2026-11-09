// GET /api/data-dump — public anonymised data export.
//   /api/data-dump            → JSON
//   /api/data-dump?format=csv → CSV (per-letter table)
import { getNum, ALPHABET, K, storeEnabled } from './_lib.js';
import { clientIp, rateLimit, isIpBlocked } from './_lib.js';

type Req = { query?: Record<string, string | string[]>; headers?: Record<string, string | string[] | undefined> };
type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  send: (data: string) => void;
  setHeader: (k: string, v: string) => void;
};

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  // These endpoints each fan out to ~54 Redis reads, so an unbounded request
  // rate is a cost-amplification vector against a metered store, not just
  // traffic. Bounded per address.
  const ip = clientIp(req.headers);
  if (await isIpBlocked(ip)) {
    res.status(403).json({ enabled: false, error: 'blocked' });
    return;
  }
  const rl = await rateLimit('datadump', ip, 30, 3600);
  if (!rl.allowed) {
    res.status(429).json({ enabled: false, error: 'rate limited' });
    return;
  }
  const format = String(req.query?.format ?? 'json').toLowerCase();

  if (!storeEnabled) {
    res.status(200).json({ enabled: false, perLetter: [] });
    return;
  }

  const perLetter = await Promise.all(
    ALPHABET.map(async (l) => {
      const [att, cor] = await Promise.all([getNum(K.att(l)), getNum(K.cor(l))]);
      return { letter: l, attempts: att, correct: cor, accuracy: att ? Math.round((cor / att) * 100) : 0 };
    }),
  );

  if (format === 'csv') {
    const rows = ['letter,attempts,correct,accuracy'];
    for (const r of perLetter) rows.push(`${r.letter},${r.attempts},${r.correct},${r.accuracy}`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(rows.join('\n'));
    return;
  }

  res.status(200).json({
    enabled: true,
    generatedAt: new Date().toISOString(),
    perLetter,
  });
}
