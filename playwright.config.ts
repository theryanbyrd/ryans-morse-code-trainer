import { defineConfig, devices } from '@playwright/test';

const PORT = 5178; // dedicated port so E2E never collides with a dev server

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // One preview server serves every worker; too many at once starves it and
  // produces timeouts that look like product failures.
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  // Test the real production bundle, not the dev server: this is what ships.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
