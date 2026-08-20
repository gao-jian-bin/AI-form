import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4190',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    channel: process.platform === 'win32' ? 'msedge' : undefined,
  },
  webServer: {
    command: process.platform === 'win32'
      ? 'npm.cmd run dev -- --host 127.0.0.1 --port 4190'
      : 'npm run dev -- --host 127.0.0.1 --port 4190',
    url: 'http://127.0.0.1:4190/api/categories',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NUXT_TELEMETRY_DISABLED: '1',
      DATABASE_PATH: '.data/e2e-forum.db',
      SEED_DEMO_CONTENT: 'true',
      VIEW_HASH_SECRET: 'e2e-view-secret',
    },
  },
})
