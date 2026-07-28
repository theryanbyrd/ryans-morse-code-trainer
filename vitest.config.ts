import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the app build and the test run stay
// independent (tests never ship, app plugins never load in tests).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
