import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Electron-specific configuration will be added
        // when setting up E2E tests
      }
    }
  ],
  outputDir: 'test-results/',
  // Timeout for each test
  timeout: 30000,
  // Timeout for assertions
  expect: {
    timeout: 5000
  }
})
