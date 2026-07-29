import type { Page } from '@playwright/test';

/** Morse for the characters the E2E tests need to key. */
export const MORSE: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.',
  h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.',
  o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-',
  v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
};

const STORAGE_KEY = 'rmct.v1';

export type SeedOptions = {
  /** Extra settings to merge over the defaults. */
  settings?: Record<string, unknown>;
  /** Letters to mark as learned (score 3), which unlocks the Receive modes. */
  learned?: string[];
  /** How many letters are in play in Learn mode. */
  lettersInPlay?: number;
  /** Mode to restore on load, as the app remembers the last one. */
  mode?: string;
  /** Extra localStorage keys to clear (e.g. a game's own save). */
  clear?: string[];
};

/**
 * Seed localStorage before the app boots so a test can start from a known
 * state (onboarding done, specific settings, unlocked modes). Uses addInitScript
 * so it lands before any app code runs.
 */
const epochs = new WeakMap<Page, number>();

export async function seed(page: Page, opts: SeedOptions = {}) {
  // addInitScript runs on EVERY navigation, so a plain seed would re-apply on
  // reload and wipe exactly the state a persistence test is checking. Each seed
  // call gets a rising epoch and applies only once: later navigations (reloads)
  // see an equal-or-higher stored epoch and skip, while a fresh seed() call
  // still takes effect.
  const epoch = (epochs.get(page) ?? -1) + 1;
  epochs.set(page, epoch);

  await page.addInitScript(
    ({ key, opts, epoch }: { key: string; opts: SeedOptions; epoch: number }) => {
      if (Number(sessionStorage.getItem('e2e-epoch') ?? -1) >= epoch) return;
      sessionStorage.setItem('e2e-epoch', String(epoch));

      const letters: Record<string, unknown> = {};
      for (const l of opts.learned ?? []) {
        letters[l] = { attempts: 3, correct: 3, wrong: 0, score: 3, hideHint: true };
      }
      const state = {
        settings: opts.settings ?? {},
        progress: {
          letters,
          lettersInPlay: opts.lettersInPlay ?? 3,
          consecutiveCorrect: 0,
          totalAnswered: 0,
          playMs: 0,
        },
      };
      localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem('rmct.onboarded', '1');
      if (opts.mode) localStorage.setItem('rmct.mode', opts.mode);
      else localStorage.removeItem('rmct.mode');
      for (const k of opts.clear ?? []) localStorage.removeItem(k);
    },
    { key: STORAGE_KEY, opts, epoch },
  );
}

/**
 * Load the app and get past the "press any button" start screen.
 * Waits for React to mount first: isVisible() does not auto-wait, so probing
 * too early silently skips the click and leaves the test on the start screen.
 */
export async function boot(page: Page, path = '/') {
  await page.goto(path);
  await page.locator('.app').waitFor({ state: 'attached' });

  const start = page.locator('.start-screen');
  await start.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await start.isVisible().catch(() => false)) await start.click();

  // Skip onboarding if this run did not seed it away.
  const skip = page.locator('.skip-btn');
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

/**
 * Wait out the app's post-answer pause and input lock before keying again.
 * Learn pauses ~480ms between letters and locks input ~320ms after each load.
 */
export async function settle(page: Page) {
  await page.waitForTimeout(900);
}

/** Open a mode from the mode-select grid by its visible name. */
export async function openMode(page: Page, name: string) {
  await page.locator('.mode-card', { hasText: name }).first().click();
}

/** Key a dot/dash pattern on the on-screen keypad, e.g. '-.' for N. */
export async function keyPattern(page: Page, pattern: string, root = '') {
  for (const sym of pattern) {
    await page.locator(`${root} .key-${sym === '.' ? 'dot' : 'dash'}`).first().click();
  }
}

/** Read the app's persisted save state. */
export async function readSave(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
}
