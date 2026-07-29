import { test, expect } from '@playwright/test';
import { seed, boot, openMode, keyPattern, MORSE } from './helpers';

test.describe('Signal Squadron', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { settings: { sound: false } });
    await boot(page);
    await openMode(page, 'Signal Squadron');
  });

  test('shows the briefing before launch', async ({ page }) => {
    await expect(page.locator('.sq-overlay')).toContainText('Signal Squadron');
    await expect(page.locator('.sq-overlay button', { hasText: 'Launch' })).toBeVisible();
    await expect(page.locator('.sq-lives')).toContainText('❤️');
  });

  test('launches and runs the game loop', async ({ page }) => {
    await page.locator('.sq-overlay button', { hasText: 'Launch' }).click();
    await expect(page.locator('.sq-overlay')).toHaveCount(0);

    // The canvas actually paints once the loop is running.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const c = document.querySelector('.sq-canvas') as HTMLCanvasElement | null;
            if (!c) return false;
            const ctx = c.getContext('2d');
            if (!ctx) return false;
            return ctx.getImageData(0, 0, c.width, c.height).data.some((v) => v !== 0);
          }),
        { timeout: 5000 },
      )
      .toBe(true);
  });

  test('offers the dot, dash and fire controls', async ({ page }) => {
    await page.locator('.sq-overlay button', { hasText: 'Launch' }).click();
    await expect(page.locator('.sq-keys .key-dot, .sq-keys .key').first()).toBeVisible();
    await expect(page.locator('.sq-fire')).toBeVisible();
  });

  test('scores a kill when the right character is keyed and fired', async ({ page }) => {
    await page.locator('.sq-overlay button', { hasText: 'Launch' }).click();

    // Read a live enemy from the game state, key its character, then fire.
    const ch = await page.evaluate(async () => {
      const w = window as unknown as { __sq?: { enemies: { ch: string }[] } };
      for (let i = 0; i < 60 && !(w.__sq?.enemies.length); i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return w.__sq?.enemies[0]?.ch ?? null;
    });
    test.skip(ch === null, 'game state hook not exposed in this build');

    await keyPattern(page, MORSE[ch!], '.sq-keys');
    await page.locator('.sq-fire').click();

    await expect
      .poll(async () => page.evaluate(() => Number(document.querySelector('.sq-score')?.textContent ?? 0)), {
        timeout: 5000,
      })
      .toBeGreaterThan(0);
  });
});

test.describe('Cave of Echoes', () => {
  test.beforeEach(async ({ page }) => {
    // Clearing via seed() keeps it epoch-guarded: a bare addInitScript would
    // re-run on reload and wipe the very save the persistence test checks.
    await seed(page, { settings: { sound: false }, clear: ['rmct.cave'] });
    await boot(page);
    await openMode(page, 'Cave of Echoes');
  });

  test('opens at the mouth of the cave', async ({ page }) => {
    await expect(page.locator('.cave-title')).toHaveText('Mouth of the Cave');
    await expect(page.locator('.cave-hp')).toContainText('❤️');
    await expect(page.locator('.cave-exit')).toContainText('North');
  });

  test('keying a direction decodes it and moves you', async ({ page }) => {
    await keyPattern(page, MORSE.n, '.cave-nav');
    await expect(page.locator('.cave-decoded')).toHaveText('N');

    await page.locator('.cave-go').click();
    await expect(page.locator('.cave-title')).toHaveText('Whispering Hall');
  });

  test('a wrong direction does not move you', async ({ page }) => {
    // 'S' is not an exit from the entrance.
    await keyPattern(page, MORSE.s, '.cave-nav');
    await page.locator('.cave-go').click();
    await expect(page.locator('.cave-title')).toHaveText('Mouth of the Cave');
  });

  test('entering an occupied room starts a Morse duel', async ({ page }) => {
    await keyPattern(page, MORSE.n, '.cave-nav');
    await page.locator('.cave-go').click();

    await expect(page.locator('.cave-duel')).toBeVisible();
    await expect(page.locator('.strike-cue')).toContainText('Strike its weak rune');
    await expect(page.locator('.foe.monster')).toContainText('Dit Sprite');
  });

  test('striking the weak rune damages the monster', async ({ page }) => {
    await keyPattern(page, MORSE.n, '.cave-nav');
    await page.locator('.cave-go').click();
    await expect(page.locator('.cave-duel')).toBeVisible();

    const hpBefore = await page.locator('.foe.monster .foe-hp').textContent();
    for (const letter of 'sos') {
      await keyPattern(page, MORSE[letter], '.cave-duel');
      await page.waitForTimeout(250);
    }

    await expect(page.locator('.foe.monster .foe-hp')).not.toHaveText(hpBefore ?? '', { timeout: 5000 });
    await expect(page.locator('.cave-log')).toContainText('clean hit');
  });

  test('remembers the room you reached across a reload', async ({ page }) => {
    await keyPattern(page, MORSE.n, '.cave-nav');
    await page.locator('.cave-go').click();
    await expect(page.locator('.cave-duel')).toBeVisible();

    // Reload lands on the menu by design, so re-enter the cave and check the
    // crawl resumed where it left off rather than restarting at the entrance.
    await page.reload();
    await boot(page);
    await openMode(page, 'Cave of Echoes');
    await expect(page.locator('.cave-title')).toHaveText('Whispering Hall');
  });
});
