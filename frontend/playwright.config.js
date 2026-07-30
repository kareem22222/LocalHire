import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4174'
const browser = process.env.CI
  ? devices['Desktop Chrome']
  : {
      channel: process.env.PLAYWRIGHT_CHANNEL,
      viewport: null,
      launchOptions: {
        args: ['--start-fullscreen', '--force-device-scale-factor=0.75'],
      },
    }

export default defineConfig({
  testDir: './Functional_test/Playwright',
  globalSetup: './Functional_test/Playwright/support/global-setup.js',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev -- --config Functional_test/vite.config.js --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/api/health',
    timeout: 60_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'Hiring role',
      testMatch: /Hiring_role\/.*\.spec\.js/,
      use: {
        ...browser,
        storageState: path.join(root, '.playwright', 'hiring.json'),
      },
    },
    {
      name: 'Working role',
      testMatch: /Working_role\/.*\.spec\.js/,
      use: {
        ...browser,
        storageState: path.join(root, '.playwright', 'working.json'),
      },
    },
  ],
})
