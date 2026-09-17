import { defineConfig, devices } from '@playwright/test';

const clientOrigin = 'http://127.0.0.1:5173';
const serverHealthUrl = 'http://127.0.0.1:3000/api/health';

export default defineConfig({
  testDir: '.',
  testMatch: 'lab-03/live-integration.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: clientOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `APP_ORIGIN=${clientOrigin} PORT=3000 npm --prefix ../server run dev`,
      url: serverHealthUrl,
      cwd: __dirname,
      // The live suite must use the database and environment passed to this run.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm --prefix ../client run dev -- --host 127.0.0.1',
      url: clientOrigin,
      cwd: __dirname,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium-live',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
