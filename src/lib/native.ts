// Capacitor shell detection, kept PURE and unit-tested.
//
// In the iOS shell the app is served from a capacitor:// (or ionic://) origin,
// so a relative "/api/pulse" would resolve against the bundle and 404. Absolute
// URLs fix that, but only in the shell: on the web the paths must stay relative
// because the Playwright specs stub them with page.route().
//
// Everything here takes its input explicitly so the tests never need a fake
// window.

export const API_ORIGIN = 'https://ditdah.me';

const SHELL_PROTOCOLS = ['capacitor:', 'ionic:'];

/** Is this page running inside the native shell rather than a browser? */
export function isNativeProtocol(protocol: string): boolean {
  return SHELL_PROTOCOLS.includes(protocol);
}

/** Live check against the current document. */
export function isNative(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  return isNativeProtocol(window.location.protocol);
}

/**
 * Resolve an API path for the current environment: absolute in the shell,
 * untouched on the web.
 */
export function resolveApiUrl(path: string, native: boolean): string {
  if (!native) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The path an API call should actually use. */
export function apiUrl(path: string): string {
  return resolveApiUrl(path, isNative());
}
