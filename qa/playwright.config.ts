import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout:    20_000,
  retries:    1,
  workers:    1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'qa/playwright_results.json' }],
  ],
  use: {
    baseURL:          'http://localhost:3001',
    headless:         true,
    screenshot:       'only-on-failure',
    video:            'off',
    actionTimeout:    8_000,
    navigationTimeout:15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
