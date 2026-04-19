import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 * Tests run against the local dev server (http://localhost:3000).
 * We use a single Chromium browser to keep CI fast.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false, // role-selection tests share server state — run serially
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Disable animations so assertions don't race with CSS transitions
    reducedMotion: "reduce",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Dev server is already running — no webServer block needed.
  // If you want Playwright to start it automatically, uncomment:
  // webServer: {
  //   command: "pnpm dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: true,
  // },
});
