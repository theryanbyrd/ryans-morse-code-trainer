import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seed, boot, openMode, MORSE } from './helpers';

/** WCAG 2.1 A + AA, which is the standard ADA claims are measured against. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function audit(page: import('@playwright/test').Page) {
  // Let entry transitions finish: auditing mid-animation reads half-faded colours
  // and reports contrast failures that no user ever sees.
  await page.waitForTimeout(400);
  return new AxeBuilder({ page }).withTags(TAGS).analyze();
}

/** Readable failure output: rule, impact, and the offending elements. */
function describe(results: Awaited<ReturnType<typeof audit>>) {
  return results.violations
    .map(
      (v) =>
        `\n[${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes
          .slice(0, 4)
          .map((n) => n.target.join(' '))
          .join('\n  ')}`,
    )
    .join('\n');
}

test.describe('accessibility', () => {
  test('start screen', async ({ page }) => {
    await page.goto('/');
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });

  test('onboarding', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('rmct.onboarded'));
    await page.goto('/');
    await page.locator('.start-screen').click();
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });

  test('mode menu', async ({ page }) => {
    await seed(page, { learned: ['e', 't', 'a'] });
    await boot(page);
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });

  for (const mode of ['Learn', 'Numbers & symbols', 'Koch course', 'Translator', 'Cave of Echoes', 'On the air']) {
    test(`mode: ${mode}`, async ({ page }) => {
      await seed(page, { settings: { sound: false }, learned: ['e', 't', 'a'] });
      await boot(page);
      await openMode(page, mode);
      const r = await audit(page);
      expect(r.violations, describe(r)).toEqual([]);
    });
  }

  test('hear letters', async ({ page }) => {
    await seed(page, { settings: { sound: false }, learned: ['e', 't', 'a'] });
    await boot(page);
    await openMode(page, 'Hear letters');
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });

  test('settings dialog', async ({ page }) => {
    await seed(page);
    await boot(page);
    await page.locator('.icon-btn[aria-label="Settings"]').click();
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });

  test('about dialog', async ({ page }) => {
    await seed(page);
    await boot(page);
    await page.locator('.icon-btn[aria-label="About"]').click();
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });

  test('account dialog', async ({ page }) => {
    await page.route('**/auth/v1/settings*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external: { google: true, email: true } }) }));
    await seed(page);
    await boot(page);
    await page.locator('.account-chip').click();
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });

  test('stats screen', async ({ page }) => {
    await seed(page, { learned: ['e', 't', 'a'] });
    await boot(page);
    await page.locator('.icon-btn[aria-label="Settings"]').click();
    await page.locator('.btn', { hasText: 'View Statistics' }).click();
    await expect(page.locator('.stats, .modal').first()).toBeVisible();
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });

  test('signal squadron', async ({ page }) => {
    await seed(page, { settings: { sound: false } });
    await boot(page);
    await openMode(page, 'Signal Squadron');
    const r = await audit(page);
    expect(r.violations, describe(r)).toEqual([]);
  });
});

test.describe('assistive-tech affordances', () => {
  test('the mnemonic picture is described rather than hidden', async ({ page }) => {
    await seed(page, { settings: { sound: false, speechHints: false } });
    await boot(page);
    await openMode(page, 'Learn');
    const img = page.locator('.mnemonic-img');
    await expect(img).toBeVisible();
    // An empty alt would hide from a screen reader that a visual hint exists.
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
    expect(alt).toMatch(/letter [A-Z]/);
  });

  test('answer outcomes are announced, not only coloured', async ({ page }) => {
    await seed(page, { settings: { sound: false, speechHints: false } });
    await boot(page);
    await openMode(page, 'Learn');

    const live = page.locator('.game p[aria-live="polite"]');
    await expect(live).toHaveAttribute('role', 'status');
    await expect(live).toHaveText('');

    const letter = ((await page.locator('.brick.current').first().textContent()) ?? '').trim().toLowerCase();
    await page.waitForTimeout(900);
    const pattern = MORSE[letter];
    for (const sym of pattern) {
      await page.locator(`.key-${sym === '.' ? 'dot' : 'dash'}`).first().click();
    }
    await expect(live).toContainText('Correct', { timeout: 3000 });
  });

  test('a wrong answer announces the code to key', async ({ page }) => {
    await seed(page, { settings: { sound: false, speechHints: false } });
    await boot(page);
    await openMode(page, 'Learn');

    const letter = ((await page.locator('.brick.current').first().textContent()) ?? '').trim().toLowerCase();
    const target = MORSE[letter];
    const wrong = target.slice(0, -1) + (target.at(-1) === '.' ? '-' : '.');
    await page.waitForTimeout(900);
    for (const sym of wrong) {
      await page.locator(`.key-${sym === '.' ? 'dot' : 'dash'}`).first().click();
    }
    const live = page.locator('.game p[aria-live="polite"]');
    await expect(live).toContainText('Not quite', { timeout: 3000 });
    await expect(live).toContainText(/dot|dash/);
  });

  test('the game canvas carries a label', async ({ page }) => {
    await seed(page, { settings: { sound: false } });
    await boot(page);
    await openMode(page, 'Signal Squadron');
    const canvas = page.locator('.sq-canvas');
    await expect(canvas).toHaveAttribute('role', 'img');
    await expect(canvas).toHaveAttribute('aria-label', /play area/i);
  });

  test('morse patterns read as dots and dashes', async ({ page }) => {
    await seed(page, { settings: { sound: false, speechHints: false } });
    await boot(page);
    await openMode(page, 'Learn');
    const pattern = page.locator('.pattern').first();
    await expect(pattern).toHaveAttribute('role', 'img');
    await expect(pattern).toHaveAttribute('aria-label', /dot|dash/i);
  });

  test('every page has a single main heading and a language', async ({ page }) => {
    await seed(page, { learned: ['e', 't', 'a'] });
    await boot(page);
    expect(await page.getAttribute('html', 'lang')).toBe('en');
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
