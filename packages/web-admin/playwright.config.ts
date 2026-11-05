import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // No se ejecuta el seed aquí: duplica los platos en cada arranque. Ejecuta `npm run seed` una vez antes.
      command: 'npm run dev -w @resttek/api',
      cwd: '../..',
      url: 'http://localhost:3000/health',
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command: 'npm run start',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
})
