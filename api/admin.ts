/// <reference types="node" />
// POST/GET /api/admin — the single admin endpoint behind one shared token.
//
// One route rather than a dozen so the auth guard cannot be forgotten on a new
// one: every action goes through requireAdmin() at the top.
//
// Actions:
//   login {token}            -> sets an httpOnly session cookie
//   logout                   -> clears it
//   overview                 -> counters + today's totals
//   activity ?day=           -> rolling activity log
//   errors   ?day=           -> rolling client error log
//   block    {kind,value}    -> add to the IP or email blocklist
//   unblock  {kind,value}    -> remove
//   blocklist                -> read both lists
//   flags    {flags}         -> replace the feature-flag map
//   maintenance {on,message} -> toggle maintenance mode
import {
  A, LOG_CAP, dayKey, readJson, lrange, smembers, sadd, srem, setStr, getNum, scard,
  D, K, storeEnabled, logActivity, readSiteConfig, clientIp,
} from './_lib.js';
import {
  requireAdmin, attemptLogin, setSessionCookie, clearSessionCookie,
  type AdminReq, type AdminRes,
} from './_admin.js';

type Body = { action?: string; token?: string; kind?: string; value?: string;
              flags?: Record<string, boolean>; on?: boolean; message?: string };

const asDay = (q: unknown): string => {
  const s = String(q ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : dayKey();
};

export default async function handler(req: AdminReq, res: AdminRes) {
  res.setHeader('Cache-Control', 'no-store');
  // An ops console must never be framed or indexed.
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const body = (readJson<Body>(req) ?? {}) as Body;
  const action = String(body.action ?? req.query?.action ?? '');

  // --- login is the only unauthenticated action, and it is rate limited ---
  if (action === 'login') {
    const out = await attemptLogin(clientIp(req.headers), String(body.token ?? ''));
    if (!out.ok) {
      res.status(out.status).json({ ok: false, error: out.error });
      return;
    }
    setSessionCookie(res, process.env.ADMIN_TOKEN || '');
    res.status(200).json({ ok: true });
    return;
  }

  if (action === 'logout') {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
    return;
  }

  if (!requireAdmin(req, res)) return;

  if (!storeEnabled && action !== 'overview') {
    res.status(200).json({ ok: false, error: 'analytics store not configured; admin is read-only' });
    return;
  }

  switch (action) {
    case 'overview': {
      const day = dayKey();
      const [views, visitors, answers, learned, sessions, errorsToday, cfg] = await Promise.all([
        getNum(D.views(day)), scard(D.visitors(day)), getNum(K.answers),
        getNum(K.learned), getNum(K.sessions), getNum(D.errors(day)), readSiteConfig(),
      ]);
      res.status(200).json({
        ok: true, configured: storeEnabled, day,
        today: { views, visitors, errors: errorsToday },
        totals: { answers, learned, sessions },
        maintenance: cfg.maintenance, flags: cfg.flags,
      });
      return;
    }
    case 'activity': {
      const rows = await lrange(A.activity(asDay(req.query?.day)), 0, LOG_CAP - 1);
      res.status(200).json({ ok: true, rows: rows.map((r) => { try { return JSON.parse(r); } catch { return { raw: r }; } }) });
      return;
    }
    case 'errors': {
      const rows = await lrange(A.errors(asDay(req.query?.day)), 0, LOG_CAP - 1);
      res.status(200).json({ ok: true, rows: rows.map((r) => { try { return JSON.parse(r); } catch { return { raw: r }; } }) });
      return;
    }
    case 'blocklist': {
      const [ips, emails] = await Promise.all([smembers(A.blockedIps), smembers(A.blockedEmails)]);
      res.status(200).json({ ok: true, ips, emails });
      return;
    }
    case 'block':
    case 'unblock': {
      const kind = String(body.kind ?? '');
      const value = String(body.value ?? '').trim();
      if (!value || (kind !== 'ip' && kind !== 'email')) {
        res.status(400).json({ ok: false, error: 'kind must be ip|email and value required' });
        return;
      }
      const key = kind === 'ip' ? A.blockedIps : A.blockedEmails;
      const v = kind === 'email' ? value.toLowerCase() : value;
      if (action === 'block') await sadd(key, v); else await srem(key, v);
      await logActivity({ kind: 'admin', name: `${action}_${kind}`, ip: '', ua: '', meta: { value: v } });
      res.status(200).json({ ok: true });
      return;
    }
    case 'flags': {
      const flags = body.flags && typeof body.flags === 'object' ? body.flags : {};
      const clean: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(flags)) {
        if (/^[a-z0-9_-]{1,40}$/i.test(k)) clean[k] = Boolean(v);
      }
      await setStr(A.flags, JSON.stringify(clean));
      await logActivity({ kind: 'admin', name: 'flags', ip: '', ua: '', meta: clean });
      res.status(200).json({ ok: true, flags: clean });
      return;
    }
    case 'maintenance': {
      const next = { on: Boolean(body.on), message: String(body.message ?? '').slice(0, 300) };
      await setStr(A.maintenance, JSON.stringify(next));
      await logActivity({ kind: 'admin', name: 'maintenance', ip: '', ua: '', meta: next });
      res.status(200).json({ ok: true, maintenance: next });
      return;
    }
    default:
      res.status(400).json({ ok: false, error: 'unknown action' });
  }
}
