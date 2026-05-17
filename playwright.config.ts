import { defineConfig, devices } from '@playwright/test';

/**
 * Wave S Phase S12 — Playwright E2E config for the Observatory dashboard.
 *
 * Runs against the dev:web mock server (`npm run dev:web` chains
 * `vite build` → `node scripts/dev/mock-server.cjs` on port 5173).
 * The mock server binds 127.0.0.1 only — safe in CI runners + locally.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:web',
    url: 'http://127.0.0.1:5173/?demo=1',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
