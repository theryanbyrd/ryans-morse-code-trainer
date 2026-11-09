/**
 * Site config: maintenance mode and feature flags, served by /api/config.
 *
 * Two deliberate choices:
 *
 * 1. It fails OPEN. Any error, timeout or missing store yields "not in
 *    maintenance, no flags", because a config fetch that fails must never be
 *    able to take the app down. The whole point of the app is that it works
 *    without a network.
 *
 * 2. Maintenance mode is WEB ONLY. Putting the website into maintenance must
 *    not brick an installed iPhone app that runs entirely offline and has
 *    nothing to do with server state. Flags still apply everywhere.
 */
import { apiUrl, isNative } from './native';

export type SiteConfig = {
  maintenance: { on: boolean; message: string };
  flags: Record<string, boolean>;
};

export const SAFE_DEFAULT: SiteConfig = { maintenance: { on: false, message: '' }, flags: {} };

/** Normalise whatever the endpoint returned into something safe to render. */
export function normalizeConfig(raw: unknown, native: boolean): SiteConfig {
  if (!raw || typeof raw !== 'object') return SAFE_DEFAULT;
  const r = raw as Record<string, unknown>;
  const m = (r.maintenance ?? {}) as Record<string, unknown>;
  const flags: Record<string, boolean> = {};
  if (r.flags && typeof r.flags === 'object') {
    for (const [k, v] of Object.entries(r.flags as Record<string, unknown>)) flags[k] = Boolean(v);
  }
  return {
    // native never enters maintenance, however the server answers
    maintenance: {
      on: native ? false : Boolean(m.on),
      message: typeof m.message === 'string' ? m.message.slice(0, 300) : '',
    },
    flags,
  };
}

export async function fetchSiteConfig(timeoutMs = 2500): Promise<SiteConfig> {
  try {
    const res = await fetch(apiUrl('/api/config'), {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return SAFE_DEFAULT;
    return normalizeConfig(await res.json(), isNative());
  } catch {
    return SAFE_DEFAULT;
  }
}
