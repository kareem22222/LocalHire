import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080'
const browser = process.env.CI
  ? devices['Desktop Chrome']
  : {
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
  // Retry a failing test twice before reporting it as a failure.
  retries: 3,
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
    command: 'npm run dev -- --config Functional_test/vite.config.js',
    url: 'http://127.0.0.1:8080/api/health',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'Hiring role',
      testMatch: /Hiring_role\/.*\.spec\.js/,
      use: {
        ...browser,
        channel: process.env.CI ? undefined : 'chrome',
        storageState: path.join(root, '.playwright', 'hiring.json'),
      },
    },
    {
      name: 'Working role',
      testMatch: /Working_role\/.*\.spec\.js/,
      use: {
        ...browser,
        channel: process.env.CI ? undefined : 'chrome',
        storageState: path.join(root, '.playwright', 'working.json'),
      },
    },
  ],
})
