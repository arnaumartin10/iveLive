import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 8081);
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    ...[320, 360, 430].map((width) => ({
      name: `mobile-${width}-layout`,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    })),
    {
      name: 'iphone-se-layout',
      use: { ...devices['iPhone SE'], browserName: 'chromium' },
    },
    {
      name: 'iphone-13-layout',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    {
      name: 'pixel-7-layout',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `CI=1 EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=https://test-project.supabase.co EXPO_PUBLIC_SUPABASE_ANON_KEY=playwright-fixture-key npm run web -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
