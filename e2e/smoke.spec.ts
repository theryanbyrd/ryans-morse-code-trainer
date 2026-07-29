import { test, expect } from '@playwright/test';
import { seed, boot, openMode } from './helpers';

test.describe('app shell', () => {
  test('shows the brand on the start screen and enters on a click', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.start-title')).toHaveText('Ditdah');
    await expect(page.locator('.start-tagline')).toContainText('one dit at a time');

    await page.locator('.start-screen').click();
    await expect(page.locator('.start-screen')).toBeHidden();
  });

  test('starts on a key press as the prompt claims', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    await expect(page.locator('.start-screen')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('.mode-select')).toBeVisible();
  });

  test('lands on the mode menu with every mode available', async ({ page }) => {
    await seed(page, { learned: ['e', 't', 'a'] });
    await boot(page);

    await expect(page.locator('.mode-title')).toHaveText('Choose a mode');
    for (const name of [
      'Learn', 'Numbers & symbols', 'Koch course', 'Hear letters',
      'Hear words', 'On the air', 'Signal Squadron', 'Cave of Echoes', 'Translator',
    ]) {
      await expect(page.locator('.mode-card', { hasText: name }).first()).toBeVisible();
    }
  });

  test('gates the listening modes until enough letters are learned', async ({ page }) => {
    await seed(page); // nothing learned
    await boot(page);

    const hearLetters = page.locator('.mode-card', { hasText: 'Hear letters' }).first();
    await expect(hearLetters).toBeDisabled();
    await expect(hearLetters).toContainText('Learn 3 letters first');

    // Learn is never gated.
    await expect(page.locator('.mode-card', { hasText: 'Learn' }).first()).toBeEnabled();
  });

  test('unlocks the listening modes once three letters are learned', async ({ page }) => {
    await seed(page, { learned: ['e', 't', 'a'] });
    await boot(page);
    await expect(page.locator('.mode-card', { hasText: 'Hear letters' }).first()).toBeEnabled();
    await expect(page.locator('.mode-card', { hasText: 'On the air' }).first()).toBeEnabled();
  });

  test('hides the gaze mode until it is switched on', async ({ page }) => {
    await seed(page);
    await boot(page);
    await expect(page.locator('.mode-card', { hasText: 'Gaze input' })).toHaveCount(0);

    await seed(page, { settings: { gazeInput: true } });
    await boot(page);
    await expect(page.locator('.mode-card', { hasText: 'Gaze input' }).first()).toBeVisible();
  });

  test('returns to the menu on reload and recommends the last mode', async ({ page }) => {
    // By design the app reopens on the menu rather than dropping you back into
    // a mode; the last one used is highlighted as the recommendation.
    await seed(page);
    await boot(page);
    await openMode(page, 'Translator');
    await expect(page.locator('.translator')).toBeVisible();

    await page.reload();
    await boot(page);
    await expect(page.locator('.mode-select')).toBeVisible();
    await expect(page.locator('.mode-card.recommended')).toContainText('Translator');
  });

  test('returns to the menu from the mode chip', async ({ page }) => {
    await seed(page);
    await boot(page);
    await openMode(page, 'Translator');
    await page.locator('.board-btn', { hasText: 'Translator' }).click();
    await expect(page.locator('.mode-select')).toBeVisible();
  });

  test('boots without console errors or failed requests', async ({ page }) => {
    // Third-party origins (fonts, analytics) are unreachable in a sandboxed run,
    // so only assert on the app's own code and assets.
    const external = /googletagmanager|google-analytics|fonts\.(googleapis|gstatic)|supabase\.co/;
    const errors: string[] = [];
    const failed: string[] = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const fromExternal = m.location()?.url && external.test(m.location().url);
      // Chromium and WebKit word offline DNS failures differently.
      const aboutNetwork = /Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|hostname could not be found|Load failed|network connection was lost/i.test(m.text());
      if (!fromExternal && !aboutNetwork) errors.push(m.text());
    });
    page.on('requestfailed', (r) => { if (!external.test(r.url())) failed.push(r.url()); });

    await seed(page, { learned: ['e', 't', 'a'] });
    await boot(page);
    await openMode(page, 'Learn');
    await expect(page.locator('.game')).toBeVisible();

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    expect(failed, `failed requests:\n${failed.join('\n')}`).toEqual([]);
  });
});

test.describe('about', () => {
  test('opens from the header and credits the author', async ({ page }) => {
    await seed(page);
    await boot(page);
    await page.locator('.icon-btn[aria-label="About"]').click();

    const modal = page.locator('.modal.about');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Ryan Byrd');
    await expect(modal.locator('a[href="https://codingwithaibook.com/"]')).toBeVisible();
    await expect(modal.locator('a[href="https://callsignready.com"]')).toBeVisible();
  });

  test('closes again', async ({ page }) => {
    await seed(page);
    await boot(page);
    await page.locator('.icon-btn[aria-label="About"]').click();
    await page.locator('.modal.about .icon-btn').click();
    await expect(page.locator('.modal.about')).toBeHidden();
  });
});

test.describe('layout', () => {
  test('never scrolls horizontally on any main screen', async ({ page }) => {
    await seed(page, { learned: ['e', 't', 'a'] });
    await boot(page);

    for (const mode of ['Learn', 'Translator', 'Koch course', 'Numbers & symbols']) {
      await openMode(page, mode);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${mode} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0);
      await page.locator('.board-btn').first().click();
    }
  });

  test('keeps tap targets big enough to hit', async ({ page }) => {
    await seed(page);
    await boot(page);
    await openMode(page, 'Learn');

    for (const sel of ['.key-dot', '.key-dash', '.key-delete']) {
      const box = await page.locator(sel).first().boundingBox();
      expect(box, `${sel} not rendered`).not.toBeNull();
      expect(box!.height, `${sel} is only ${box!.height}px tall`).toBeGreaterThanOrEqual(44);
    }
  });
});
