// Native-shell side effects, all no-ops on the web.
//
// Everything here is dynamically imported so the Capacitor plugin code never
// enters the web bundle, and every call is wrapped: a missing plugin must never
// be the thing that stops the app from starting.

import { isNative } from './native';

/**
 * Hide the splash screen once React has painted.
 *
 * Without this the webview shows a blank frame while the JS bundle boots. The
 * config's launchShowDuration is only a fail-safe for a boot that never happens.
 */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* plugin absent; the auto-hide fail-safe covers it */
  }
}

/** Ditdah is dark everywhere, so the status bar is always light content. */
export async function initStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark }); // Dark style = light glyphs
  } catch {
    /* non-fatal */
  }
}

// ---- Keep-awake -----------------------------------------------------------
// Listening modes (Hear letters, Hear words, Koch, QSO copy) can run for
// minutes with no touch at all, and iOS dims and locks the screen mid-lesson.
// Reference-counted because modes can overlap during a transition.

let awakeHolders = 0;

// The counting runs everywhere and only the plugin call is shell-gated, so the
// reference logic stays testable off-device. Gating the counter too would make
// the interesting part of this file unreachable from a unit test.
export async function acquireKeepAwake(): Promise<void> {
  awakeHolders += 1;
  if (awakeHolders !== 1 || !isNative()) return;
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    await KeepAwake.keepAwake();
  } catch {
    /* non-fatal: the screen just behaves normally */
  }
}

export async function releaseKeepAwake(): Promise<void> {
  const before = awakeHolders;
  awakeHolders = Math.max(0, awakeHolders - 1);
  // Only the release that actually drops the last holder talks to the plugin.
  if (before === 0 || awakeHolders !== 0 || !isNative()) return;
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    await KeepAwake.allowSleep();
  } catch {
    /* non-fatal */
  }
}

/** Test seam: the current number of keep-awake holders. */
export function keepAwakeHolders(): number {
  return awakeHolders;
}

/** Test seam: reset the counter between tests. */
export function resetKeepAwake(): void {
  awakeHolders = 0;
}

// ---- Haptics --------------------------------------------------------------
// iOS has never supported navigator.vibrate, so morsePlayer's vibration array
// does nothing at all inside WKWebView. What DOES work is a discrete impact per
// element, which is why haptics here are tied to the learner's own key presses
// rather than to playback. Vibrating along with received Morse needs sub-100ms
// patterning (a dit at 20 WPM is 60ms) and that means Core Haptics, which is
// out of v1 scope. See docs/IOS-PRD.md §3.4.

export type KeyHaptic = 'dit' | 'dah';

export async function keyHaptic(which: KeyHaptic): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: which === 'dit' ? ImpactStyle.Light : ImpactStyle.Medium });
  } catch {
    /* non-fatal */
  }
}

/**
 * Can the platform buzz *along with* played-back Morse?
 *
 * Only navigator.vibrate can do this, because it takes a whole on/off pattern
 * in one call. iOS has never implemented it, and @capacitor/haptics is no
 * substitute: it fires one discrete impact per call, which cannot hold a 60ms
 * dit. So this is false on iOS, and the "Flash & vibrate" toggle renames itself
 * rather than promising a buzz that never comes.
 *
 * Deliberately NOT `isNative() ? true : ...` — the native shell CAN do
 * key-press haptics via keyHaptic(), and conflating the two is what made this
 * toggle keep lying on iPhone.
 */
export function playbackHapticsSupported(): boolean {
  return canBuzzAlongWithPlayback(
    isNative(),
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
  );
}

/**
 * The rule itself, pure so it is testable off-device.
 *
 * `native` is accepted and then deliberately ignored. That is the whole point:
 * the shell CAN do key-press haptics, and reasoning "native, therefore haptics"
 * is exactly the mistake that put "Flash & vibrate" back on the iPhone settings
 * screen. Only the Vibration API decides this.
 */
export function canBuzzAlongWithPlayback(_native: boolean, hasVibrate: boolean): boolean {
  return hasVibrate;
}
