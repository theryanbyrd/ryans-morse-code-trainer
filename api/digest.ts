/// <reference types="node" />
// GET /api/digest — the daily email. Vercel Cron calls this once a day (see
// vercel.json); it reads yesterday's aggregate counters and mails a summary.
//
// Requires, in Vercel env:
//   CRON_SECRET     so only Vercel's cron (and you) can trigger a send
//   RESEND_API_KEY  the mailer
//   DIGEST_TO       where to send it        (default ryanbyrd@gmail.com)
//   DIGEST_FROM     verified sender         (default Resend's onboarding sender)
// Without the store or the key it reports what is missing instead of sending.
import { getNum, scard, dayKey, D, storeEnabled } from './_lib.js';

type Req = { method?: string; headers?: Record<string, string | string[] | undefined>; query?: Record<string, unknown> };
type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

const TO = process.env.DIGEST_TO || 'ryanbyrd@gmail.com';
const FROM = process.env.DIGEST_FROM || 'Ditdah <onboarding@resend.dev>';

export type DayStats = {
  day: string;
  visitors: number;
  views: number;
  signins: number;
  shares: number;
  shareBreakdown: Record<string, number>;
  answers: number;
  learned: number;
};

const SHARE_TARGETS = ['x', 'facebook', 'whatsapp', 'reddit', 'email', 'copy', 'native'];

export async function collect(day: string): Promise<DayStats> {
  const shareBreakdown: Record<string, number> = {};
  for (const t of SHARE_TARGETS) {
    const n = await getNum(D.share(day, t));
    if (n > 0) shareBreakdown[t] = n;
  }
  return {
    day,
    visitors: await scard(D.visitors(day)),
    views: await getNum(D.views(day)),
    signins: await getNum(D.signins(day)),
    shares: await getNum(D.shares(day)),
    shareBreakdown,
    answers: await getNum(D.answers(day)),
    learned: await getNum(D.learned(day)),
  };
}

/** Percentage change vs the day before, or null when there is no baseline. */
function delta(today: number, prev: number): string {
  if (prev === 0) return today > 0 ? 'new' : '';
  const pct = Math.round(((today - prev) / prev) * 100);
  if (pct === 0) return 'level';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

export function renderDigest(s: DayStats, prev: DayStats): string {
  const row = (label: string, value: number, prevValue: number) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8e2d8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#4a4a5a;">${label}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid #e8e2d8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:20px;font-weight:bold;color:#1b1b2b;">${value.toLocaleString()}</td>
      <td align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid #e8e2d8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#8a8a99;">${delta(value, prevValue)}</td>
    </tr>`;

  const shares = Object.entries(s.shareBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(' &middot; ');

  const quiet = s.views === 0 && s.visitors === 0;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#14152a;margin:0;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#fbf7ef;border-radius:20px;">
      <tr><td style="padding:26px 30px 4px 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:9px;"><div style="width:12px;height:12px;border-radius:6px;background-color:#ffb020;"></div></td>
          <td style="padding-right:12px;"><div style="width:30px;height:12px;border-radius:6px;background-color:#ff5b6a;"></div></td>
          <td style="font-size:22px;font-weight:bold;color:#1b1b2b;letter-spacing:-0.5px;">Ditdah</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:8px 30px 18px 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <div style="font-size:13px;color:#8a8a99;text-transform:uppercase;letter-spacing:1px;">Daily digest</div>
        <div style="font-size:17px;font-weight:bold;color:#1b1b2b;margin-top:2px;">${s.day}</div>
      </td></tr>
      <tr><td style="padding:0 30px 8px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row('Visitors', s.visitors, prev.visitors)}
          ${row('Page views', s.views, prev.views)}
          ${row('Sign-ins', s.signins, prev.signins)}
          ${row('Shares', s.shares, prev.shares)}
          ${row('Answers keyed', s.answers, prev.answers)}
          ${row('Letters learned', s.learned, prev.learned)}
        </table>
      </td></tr>
      ${shares ? `<tr><td style="padding:4px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12.5px;color:#8a8a99;">Shared via ${shares}</td></tr>` : ''}
      ${quiet ? `<tr><td style="padding:12px 30px 0 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#8a8a99;">A quiet day. If this keeps reading zero, check that <code>/api/pulse</code> is reachable and the store is configured.</td></tr>` : ''}
      <tr><td style="padding:20px 30px 26px 30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#8a8a99;">
        Percentages compare with ${prev.day}. Counts are aggregate only; no personal data is stored.
        <a href="https://ditdah.me" style="color:#c2415a;text-decoration:none;">ditdah.me</a>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  // Vercel Cron sends this header when CRON_SECRET is set. Without the guard
  // anyone could hit the URL and make us send mail.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization;
  if (secret && auth !== `Bearer ${secret}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  if (!storeEnabled) {
    res.status(200).json({ ok: false, sent: false, reason: 'analytics store not configured' });
    return;
  }

  const day = dayKey(new Date(), -1); // yesterday, in the reporting timezone
  const prevDay = dayKey(new Date(), -2);
  const stats = await collect(day);
  const prev = await collect(prevDay);

  // ?dry=1 renders without sending, for checking the pipeline.
  const dry = String(req.query?.dry ?? '') === '1';
  const key = process.env.RESEND_API_KEY;
  if (dry || !key) {
    res.status(200).json({ ok: true, sent: false, reason: dry ? 'dry run' : 'RESEND_API_KEY not set', stats });
    return;
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject: `Ditdah daily: ${stats.visitors} visitors, ${stats.signins} sign-ins (${stats.day})`,
      html: renderDigest(stats, prev),
    }),
  });

  const ok = r.ok;
  res.status(ok ? 200 : 502).json({ ok, sent: ok, stats, mailer: ok ? undefined : await r.text() });
}
