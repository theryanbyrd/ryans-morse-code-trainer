/// <reference types="node" />
// GET /api/config — public site config: maintenance mode and feature flags.
//
// Deliberately public and deliberately tiny. The SPA calls this once on boot,
// so it must be cheap and must never fail the page: when the store is absent
// it returns the defaults, which are "not in maintenance, no flags".
import { readSiteConfig, clientIp, rateLimit, storeEnabled } from './_lib.js';

type Req = { headers?: Record<string, string | string[] | undefined> };
type Res = {
  status: (c: number) => Res;
  json: (d: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

export default async function handler(req: Req, res: Res) {
  // Short cache: long enough to absorb a crowd, short enough that flipping
  // maintenance mode takes effect in under a minute.
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const rl = await rateLimit('config', clientIp(req.headers), 600, 3600);
  if (!rl.allowed) {
    res.status(429).json({ error: 'rate limited' });
    return;
  }

  const cfg = await readSiteConfig();
  res.status(200).json({ ...cfg, configured: storeEnabled });
}
