import { test, expect } from '@playwright/test';
import { seed, boot, openMode, keyPattern, readSave, settle, MORSE } from './helpers';

/** The letter the game is currently asking for. */
async function currentLetter(page: import('@playwright/test').Page) {
  const text = await page.locator('.brick.current').first().textContent();
  return (text ?? '').trim().toLowerCase();
}

test.beforeEach(async ({ page }) => {
  await seed(page, { settings: { sound: false } });
  await boot(page);
  await openMode(page, 'Learn');
  await expect(page.locator('.game')).toBeVisible();
});

test.describe('Learn mode', () => {
  test('shows a word built only from letters in play', async ({ page }) => {
    const bricks = await page.locator('.brick').allTextContents();
    expect(bricks.length).toBeGreaterThan(0);
    for (const b of bricks) {
      expect(['E', 'T', 'A'], `"${b}" is not an in-play letter`).toContain(b.trim());
    }
  });

  test('keying the correct code advances to the next letter', async ({ page }) => {
    const letter = await currentLetter(page);
    await settle(page); // the app locks input briefly on each new letter

    await keyPattern(page, MORSE[letter]);

    // The letter just keyed is now done.
    await expect(page.locator('.brick.done').first()).toHaveText(letter.toUpperCase(), {
      timeout: 3000,
    });
  });

  test('records the answer in saved progress', async ({ page }) => {
    const letter = await currentLetter(page);
    await settle(page);
    await keyPattern(page, MORSE[letter]);
    await expect(page.locator('.brick.done').first()).toBeVisible({ timeout: 3000 });

    const save = await readSave(page);
    expect(save.progress.letters[letter].correct).toBeGreaterThanOrEqual(1);
    expect(save.progress.totalAnswered).toBeGreaterThanOrEqual(1);
  });

  test('a wrong code does not advance and is recorded as a miss', async ({ page }) => {
    const letter = await currentLetter(page);
    // The app judges as soon as the keyed length matches the target, so a wrong
    // answer must be the same length: flip the last symbol.
    const target = MORSE[letter];
    const wrong = target.slice(0, -1) + (target.at(-1) === '.' ? '-' : '.');
    await settle(page);

    await keyPattern(page, wrong);
    await expect(page.locator('.letter-card.wrong')).toBeVisible({ timeout: 3000 });
    // Still asking for the same letter.
    await expect(page.locator('.brick.current').first()).toHaveText(letter.toUpperCase());

    const save = await readSave(page);
    expect(save.progress.letters[letter].wrong).toBeGreaterThanOrEqual(1);
  });

  test('the delete key removes the last symbol keyed', async ({ page }) => {
    await settle(page);
    await page.locator('.key-dash').click();
    const withOne = await page.locator('.live-decode').textContent();

    await page.locator('.key-delete').click();
    await expect(page.locator('.live-decode')).not.toHaveText(withOne ?? '');
  });

  test('keyboard shortcuts key dot and dash', async ({ page }) => {
    await settle(page);
    const letter = await currentLetter(page);
    for (const sym of MORSE[letter]) {
      await page.keyboard.press(sym === '.' ? 'j' : 'k');
    }
    await expect(page.locator('.brick.done').first()).toHaveText(letter.toUpperCase(), {
      timeout: 3000,
    });
  });

  test('completing a whole word moves on to a new one', async ({ page }) => {
    const bricks = await page.locator('.brick').allTextContents();
    const word = bricks.map((b) => b.trim().toLowerCase()).join('');

    for (const letter of word) {
      await settle(page);
      await keyPattern(page, MORSE[letter]);
    }

    // The learner moves on: either a new word, or the same one reset to the start.
    await expect
      .poll(async () => (await readSave(page)).progress.totalAnswered, { timeout: 8000 })
      .toBeGreaterThanOrEqual(word.length);
    await expect(page.locator('.brick.current').first()).toBeVisible();
  });

  test('plays the code on demand without breaking the page', async ({ page }) => {
    await page.locator('.play-pattern').click();
    await expect(page.locator('.game')).toBeVisible();
  });
});

test.describe('Learn accessibility modes', () => {
  test('single key replaces the two-button keypad', async ({ page }) => {
    await seed(page, { settings: { sound: false, singleKey: true } });
    await boot(page);
    await openMode(page, 'Learn');

    await expect(page.locator('.straight-key')).toBeVisible();
    await expect(page.locator('.key-dot')).toHaveCount(0);
    await expect(page.locator('.one-switch-hint')).toContainText('short press');
  });

  test('one-switch shows the scanning highlight and switch button', async ({ page }) => {
    await seed(page, { settings: { sound: false, oneSwitch: true, scanIntervalMs: 400 } });
    await boot(page);
    await openMode(page, 'Learn');

    await expect(page.locator('.switch-button')).toBeVisible();
    await expect(page.locator('.keypad.one-switch')).toBeVisible();
    await expect(page.locator('.key.scanning')).toBeVisible();
    await expect(page.locator('.one-switch-hint')).toContainText('highlight moves');
  });
});
