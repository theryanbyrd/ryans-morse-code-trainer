import { test, expect } from '@playwright/test';
import { seed, boot, openMode, keyPattern, readSave, settle, MORSE } from './helpers';

test.describe('Koch course', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { settings: { sound: false } });
    await boot(page);
    await openMode(page, 'Koch course');
  });

  test('opens on the lesson picker', async ({ page }) => {
    await expect(page.locator('.koch-grid, .koch-lessons').first()).toBeVisible();
  });

  test('offers every lesson and locks the ones not yet reached', async ({ page }) => {
    await expect(page.locator('.koch-cell')).toHaveCount(39);
    await expect(page.locator('.koch-cell.locked').first()).toBeVisible();
    await expect(page.locator('.koch-cell').first()).toBeEnabled();
  });

  test('starts lesson 1 with the first two Koch characters', async ({ page }) => {
    await page.locator('.koch-cell').first().click();
    const chars = page.locator('.koch-chars');
    await expect(chars).toBeVisible();
    await expect(chars.locator('.kchip')).toHaveCount(2);
    await expect(chars).toContainText('K');
    await expect(chars).toContainText('M');
  });
});

test.describe('Numbers & symbols', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { settings: { sound: false, speechHints: false } });
    await boot(page);
    await openMode(page, 'Numbers & symbols');
    await expect(page.locator('.game')).toBeVisible();
  });

  test('shows a character to key with its progress strip', async ({ page }) => {
    // Regression: a short-screen rule written for Learn (where a word brick
    // still shows the letter) also hid this circle, leaving the drill blank.
    await expect(page.locator('.letter-circle')).toBeVisible();
    await expect(page.locator('.letter-circle')).not.toBeEmpty();
    await expect(page.locator('.np-chip').first()).toBeVisible();
  });

  test('always shows the character even once its hint is hidden', async ({ page }) => {
    await page.evaluate(() => {
      const chars: Record<string, unknown> = {};
      for (const ch of ['0','1','2','3','4','5','6','7','8','9','.',',','?','/','=','+']) {
        chars[ch] = { attempts: 1, correct: 1, wrong: 0, score: 1, hideHint: true };
      }
      const raw = JSON.parse(localStorage.getItem('rmct.v1') ?? '{}');
      raw.numbers = { chars, totalAnswered: 16, playMs: 0 };
      localStorage.setItem('rmct.v1', JSON.stringify(raw));
    });
    await boot(page);
    await openMode(page, 'Numbers & symbols');
    await expect(page.locator('.letter-card')).toBeVisible();
    await expect(page.locator('.mnemonic')).toHaveCount(0); // hint is hidden
    await expect(page.locator('.letter-circle')).toBeVisible(); // but the target is not
    await expect(page.locator('.letter-card')).not.toHaveText('');
  });

  test('keying the right code records a correct answer', async ({ page }) => {
    const ch = ((await page.locator('.letter-circle').textContent()) ?? '').trim();
    // The drill covers digits and punctuation; only assert on ones we can key.
    const pattern = await page.evaluate((c) => {
      const map: Record<string, string> = {
        '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
        '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
        '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.', '=': '-...-', '+': '.-.-.',
      };
      return map[c] ?? '';
    }, ch);
    test.skip(!pattern, `no pattern known for "${ch}"`);

    await settle(page);
    await keyPattern(page, pattern);

    await expect(page.locator('.letter-card.correct')).toBeVisible({ timeout: 3000 });
    const save = await readSave(page);
    expect(save.numbers.chars[ch].correct).toBeGreaterThanOrEqual(1);
  });
});

test.describe('On the air', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { settings: { sound: false }, learned: ['e', 't', 'a'] });
    await boot(page);
    await openMode(page, 'On the air');
  });

  test('lists the scenarios and the shorthand guide', async ({ page }) => {
    await expect(page.locator('.qso-card')).toHaveCount(20);
    await expect(page.locator('.qso-guide-link')).toBeVisible();
  });

  test('cross-links to the licence app', async ({ page }) => {
    const link = page.locator('.license-blurb');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://callsignready.com');
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('opens the CW shorthand guide', async ({ page }) => {
    await page.locator('.qso-guide-link').click();
    await expect(page.locator('.cw-guide, .modal').first()).toBeVisible();
  });

  test('starts a scenario and asks you to key the first transmission', async ({ page }) => {
    await page.locator('.qso-card').first().click();
    await expect(page.locator('.qso-cue')).toBeVisible();
    await expect(page.locator('.qso-msg, .qso-turn').first()).toBeVisible();
  });

  test('checks a keyed character against the transmission', async ({ page }) => {
    await page.locator('.qso-card').first().click();

    // Find a scenario that starts with a send turn.
    const cue = await page.locator('.qso-cue').textContent();
    test.skip(!cue?.includes('TX'), 'scenario opens with a receive turn');

    const ch = ((await page.locator('.qso-cur-char').textContent()) ?? '').trim().toLowerCase();
    test.skip(!MORSE[ch], `first character "${ch}" is not a plain letter`);

    await keyPattern(page, MORSE[ch]);
    // Keying it correctly moves on to the next character.
    await expect(page.locator('.qso-cur-char')).not.toHaveText(ch.toUpperCase(), { timeout: 3000 });
  });
});
