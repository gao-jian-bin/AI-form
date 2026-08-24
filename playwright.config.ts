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
    command: 'node .output/server/index.mjs',
    url: 'http://127.0.0.1:4190/api/categories',
    reuseExistingServer: process.env.E2E_EXTERNAL_SERVER === 'true',
    timeout: 120_000,
    env: {
      ...process.env,
      NUXT_TELEMETRY_DISABLED: '1',
      HOST: '127.0.0.1',
      PORT: '4190',
      DATABASE_PATH: '.data/e2e-forum.db',
      SEED_DEMO_CONTENT: 'true',
      ADMIN_PASSWORD: 'ai-forum-local-admin',
      E2E_INSECURE_ADMIN_COOKIE: 'true',
      VIEW_HASH_SECRET: 'e2e-view-secret',
    },
  },
})
