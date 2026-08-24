import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Assumes Postgres is already running (docker compose up -d postgres) and
  // migrations are applied — Playwright starts the api/web dev servers but
  // doesn't manage the database, same as the Jest backend suite.
  webServer: [
    {
      command: 'npm run dev --workspace=apps/api',
      cwd: '../..',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev --workspace=apps/web',
      cwd: '../..',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
