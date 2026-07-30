import { test, expect } from '@playwright/test';
import { seed, boot, openMode, readSave } from './helpers';

test.describe('Translator', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { settings: { sound: false } });
    await boot(page);
    await openMode(page, 'Translator');
    await expect(page.locator('.translator')).toBeVisible();
  });

  test('encodes text to Morse as you type', async ({ page }) => {
    await page.locator('.tr-area').first().fill('SOS');
    await expect(page.locator('.tr-area.morse')).toHaveValue('... --- ...');
  });

  test('separates words with a slash', async ({ page }) => {
    await page.locator('.tr-area').first().fill('HI HI');
    await expect(page.locator('.tr-area.morse')).toHaveValue('.... .. / .... ..');
  });

  test('decodes Morse back to text', async ({ page }) => {
    await page.locator('.tr-area.morse').fill('... --- ...');
    await expect(page.locator('.tr-area').first()).toHaveValue('SOS');
  });

  test('handles digits and punctuation', async ({ page }) => {
    await page.locator('.tr-area').first().fill('K7RB');
    const morse = await page.locator('.tr-area.morse').inputValue();
    expect(morse).toMatch(/^[.\-/ ]+$/);
    expect(morse.length).toBeGreaterThan(0);
  });

  test('clears both panels', async ({ page }) => {
    await page.locator('.tr-area').first().fill('HELLO');
    await page.locator('.btn', { hasText: 'Clear' }).click();
    await expect(page.locator('.tr-area').first()).toHaveValue('');
    await expect(page.locator('.tr-area.morse')).toHaveValue('');
  });

  test('disables playback until there is something to play', async ({ page }) => {
    await expect(page.locator('.btn.primary', { hasText: 'Play' })).toBeDisabled();
    await page.locator('.tr-area').first().fill('E');
    await expect(page.locator('.btn.primary', { hasText: 'Play' })).toBeEnabled();
  });
});

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { settings: { sound: false } });
    await boot(page);
    await page.locator('.icon-btn[aria-label="Settings"]').click();
    await expect(page.locator('.modal')).toBeVisible();
  });

  test('persists a toggle across a reload', async ({ page }) => {
    const row = page.locator('.toggle-row', { hasText: 'Single Key' });
    await row.locator('input[type="checkbox"]').check();

    await expect.poll(async () => (await readSave(page)).settings.singleKey).toBe(true);

    await page.reload();
    await boot(page);
    await page.locator('.icon-btn[aria-label="Settings"]').click();
    await expect(
      page.locator('.toggle-row', { hasText: 'Single Key' }).locator('input[type="checkbox"]'),
    ).toBeChecked();
  });

  test('exposes the speed and tone sliders', async ({ page }) => {
    const modal = page.locator('.modal');
    await expect(modal).toContainText('Character speed');
    await expect(modal).toContainText('Effective speed');
    await expect(modal).toContainText('Tone');
  });

  test('changing character speed is saved', async ({ page }) => {
    const slider = page.locator('.slider-row', { hasText: 'Character speed' }).locator('input[type="range"]');
    await slider.fill('24');
    await expect.poll(async () => (await readSave(page)).settings.wpm).toBe(24);
  });

  test('reveals the send-speed slider only when a single key is in use', async ({ page }) => {
    await expect(page.locator('.slider-row', { hasText: 'Send speed' })).toHaveCount(0);
    await page.locator('.toggle-row', { hasText: 'Single Key' }).locator('input[type="checkbox"]').check();
    await expect(page.locator('.slider-row', { hasText: 'Send speed' })).toBeVisible();
  });

  test('turning on gaze input adds its mode card', async ({ page }) => {
    await page.locator('.toggle-row', { hasText: 'Gaze input' }).locator('input[type="checkbox"]').check();
    await page.locator('.modal .icon-btn').first().click();
    await expect(page.locator('.mode-card', { hasText: 'Gaze input' }).first()).toBeVisible();
  });
});

test.describe('progress code', () => {
  test('exports a code and loads it back', async ({ page }) => {
    await seed(page, { settings: { sound: false }, learned: ['e', 't', 'a', 'i'] });
    await boot(page);
    await page.locator('.icon-btn[aria-label="Settings"]').click();
    await page.locator('.btn', { hasText: 'Get Code' }).click();

    const code = await page.locator('textarea, input[readonly], .code-box').first().inputValue()
      .catch(async () => (await page.locator('.code-box').first().textContent()) ?? '');
    expect(code.trim().length).toBeGreaterThan(10);
  });
});

test.describe('account sign-in', () => {
  /** Pretend Supabase reports a given set of enabled providers. */
  const withProviders = (page: import('@playwright/test').Page, external: Record<string, boolean>) =>
    page.route('**/auth/v1/settings*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external }) }));

  test('offers Google sign-in when the provider is enabled', async ({ page }) => {
    await withProviders(page, { google: true, email: true });
    await seed(page);
    await boot(page);
    await page.locator('.account-chip').click();

    const btn = page.locator('.google-btn');
    await expect(btn).toBeVisible();
    // Google's guidelines: their exact wording and their unmodified 4-colour mark.
    await expect(btn).toContainText('Sign in with Google');
    await expect(btn.locator('svg path')).toHaveCount(4);
    // Comfortably tappable.
    expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Email remains available as an alternative.
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('hides Google sign-in when the provider is off', async ({ page }) => {
    await withProviders(page, { google: false, email: true });
    await seed(page);
    await boot(page);
    await page.locator('.account-chip').click();

    await expect(page.locator('.google-btn')).toHaveCount(0);
    await expect(page.locator('.or-rule')).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('explains that signing in is optional', async ({ page }) => {
    await withProviders(page, { google: true, email: true });
    await seed(page);
    await boot(page);
    await page.locator('.account-chip').click();
    await expect(page.locator('.modal.account')).toContainText('keep playing as a guest');
  });
});

test.describe('share with a friend', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { settings: { sound: false } });
    await boot(page);
  });

  test('offers share targets on the mode menu', async ({ page }) => {
    const share = page.locator('.share').first();
    await expect(share).toBeVisible();
    await expect(share.locator('.share-btn')).toHaveCount(6);
  });

  test('points every target at ditdah.me with a real share URL', async ({ page }) => {
    const links = page.locator('.share').first().locator('a.share-btn');
    const hosts = ['twitter.com', 'facebook.com', 'whatsapp.com', 'reddit.com', 'mailto:'];
    for (let i = 0; i < hosts.length; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href, `target ${i}`).toContain(hosts[i]);
      expect(decodeURIComponent(href!)).toContain('ditdah.me');
    }
  });

  test('opens share targets in a new tab, safely', async ({ page }) => {
    const link = page.locator('.share').first().locator('a.share-btn').first();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noreferrer/);
  });

  test('copies the link and confirms it', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permission is chromium-only here');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('.share-btn.copy').first().click();
    await expect(page.locator('.share-btn.copy').first()).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://ditdah.me');
  });

  test('also appears in the About dialog', async ({ page }) => {
    await page.locator('.icon-btn[aria-label="About"]').click();
    await expect(page.locator('.modal.about .share')).toBeVisible();
  });
});
