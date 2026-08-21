import { describe, it, expect } from 'vitest';
import { isNativeProtocol, resolveApiUrl, API_ORIGIN } from './native';

describe('isNativeProtocol', () => {
  it('recognises the Capacitor shell schemes', () => {
    expect(isNativeProtocol('capacitor:')).toBe(true);
    expect(isNativeProtocol('ionic:')).toBe(true);
  });

  it('treats ordinary browsing as web', () => {
    expect(isNativeProtocol('https:')).toBe(false);
    expect(isNativeProtocol('http:')).toBe(false);
    expect(isNativeProtocol('file:')).toBe(false);
  });
});

describe('resolveApiUrl', () => {
  it('leaves web paths relative', () => {
    // Load-bearing: the Playwright specs stub these with page.route(), which
    // only matches the relative form. Making these absolute would silently
    // break every e2e test that touches the API.
    expect(resolveApiUrl('/api/pulse', false)).toBe('/api/pulse');
    expect(resolveApiUrl('/api/error', false)).toBe('/api/error');
  });

  it('makes shell paths absolute, since capacitor:// has no API server', () => {
    expect(resolveApiUrl('/api/pulse', true)).toBe(`${API_ORIGIN}/api/pulse`);
  });

  it('tolerates a missing leading slash without doubling it', () => {
    expect(resolveApiUrl('api/pulse', true)).toBe(`${API_ORIGIN}/api/pulse`);
    expect(resolveApiUrl('/api/pulse', true)).not.toContain('//api');
  });

  it('points at the real origin, not a placeholder', () => {
    expect(API_ORIGIN).toBe('https://ditdah.me');
  });
});
