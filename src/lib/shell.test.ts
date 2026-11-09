import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  playbackHapticsSupported,
  canBuzzAlongWithPlayback,
  acquireKeepAwake,
  releaseKeepAwake,
  keepAwakeHolders,
  resetKeepAwake,
} from './shell';

beforeEach(() => resetKeepAwake());

describe('playbackHapticsSupported', () => {
  const original = navigator.vibrate;
  afterEach(() => {
    Object.defineProperty(navigator, 'vibrate', { value: original, configurable: true });
  });

  it('is false when the platform has no Vibration API', () => {
    // This is iOS, in both Safari and WKWebView. The regression it guards:
    // reporting "supported" here put "Flash & vibrate" back on the iPhone
    // settings screen, promising a buzz that never arrives.
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    expect(playbackHapticsSupported()).toBe(false);
  });

  it('is true when the platform has one', () => {
    Object.defineProperty(navigator, 'vibrate', { value: () => true, configurable: true });
    expect(playbackHapticsSupported()).toBe(true);
  });
});

describe('canBuzzAlongWithPlayback', () => {
  it('says no on a native shell with no Vibration API — this is iPhone', () => {
    // The regression, stated directly: being in the Capacitor shell must not
    // by itself count as haptic support. The shell can do key-press impacts,
    // which is a different thing from buzzing along with played-back Morse.
    expect(canBuzzAlongWithPlayback(true, false)).toBe(false);
  });

  it('says yes wherever the Vibration API exists, shell or not', () => {
    expect(canBuzzAlongWithPlayback(true, true)).toBe(true);
    expect(canBuzzAlongWithPlayback(false, true)).toBe(true);
  });

  it('says no on the web without one', () => {
    expect(canBuzzAlongWithPlayback(false, false)).toBe(false);
  });
});

describe('keep-awake reference counting', () => {
  // These are no-ops off-shell, so the counter is what there is to assert on.
  // It matters because modes can overlap during a transition: a naive
  // acquire/release pair would let the outgoing mode's cleanup cancel the
  // incoming mode's hold and drop the screen mid-lesson.
  it('starts at zero', () => {
    expect(keepAwakeHolders()).toBe(0);
  });

  it('counts nested holders instead of releasing on the first exit', async () => {
    await acquireKeepAwake();
    await acquireKeepAwake();
    expect(keepAwakeHolders()).toBe(2);
    await releaseKeepAwake();
    expect(keepAwakeHolders()).toBe(1);
    await releaseKeepAwake();
    expect(keepAwakeHolders()).toBe(0);
  });

  it('never goes negative on an unbalanced release', async () => {
    await releaseKeepAwake();
    await releaseKeepAwake();
    expect(keepAwakeHolders()).toBe(0);
  });
});
