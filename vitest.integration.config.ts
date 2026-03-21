/**
 * vitest.integration.config.ts
 *
 * Vitest configuration for INTEGRATION tests that run against the
 * isolated local test database (jobnow_test).
 *
 * Key differences from the default vitest.config.ts:
 *  - Uses TEST_DATABASE_URL (local PostgreSQL) instead of POSTGRES_URL (Neon)
 *  - Loads .env.test — no production credentials
 *  - globalSetup runs seed-test-db.mjs before all tests
 *  - Runs files matching *.integration.test.ts
 *  - Single-threaded (forks: 1) to avoid DB race conditions
 *
 * Usage:
 *   pnpm test:integration
 *   pnpm test:integration --reporter=verbose
 */

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "integration",
    include: ["server/**/*.integration.test.ts"],
    exclude: ["node_modules/**", "client/**"],

    // Load .env.test — overrides any existing env vars for this test run
    env: {
      NODE_ENV: "test",
    },

    // Single-threaded to avoid DB race conditions between test files
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Run seed before all integration tests
    globalSetup: ["./scripts/vitest-global-setup.mjs"],

    // Longer timeout for DB operations
    testTimeout: 15000,
    hookTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Resolve aliases matching tsconfig paths
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
});
