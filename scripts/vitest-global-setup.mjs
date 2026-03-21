/**
 * vitest-global-setup.mjs
 *
 * Vitest globalSetup — runs ONCE before all integration tests.
 *
 * Responsibilities:
 *  1. Load .env.test into process.env
 *  2. Verify test DB connectivity (fail fast if not available)
 *  3. Seed the test DB with deterministic synthetic data
 *
 * This ensures every integration test run starts from a known, clean state.
 */

import { execSync } from "child_process";
import pg from "pg";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export async function setup() {
  // ── 1. Load .env.test ───────────────────────────────────────────────────
  config({ path: path.join(ROOT, ".env.test"), override: true });

  const TEST_DB_URL =
    process.env.TEST_DATABASE_URL ||
    "postgresql://test_user:test_password@localhost:5432/jobnow_test";

  console.log("\n🔧 Integration test setup starting...");
  const safeUrl = TEST_DB_URL.replace(/:([^:@]+)@/, ":***@");
  console.log(`   Test DB: ${safeUrl}`);

  // ── 2. Verify DB connectivity ───────────────────────────────────────────
  const pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 1 });
  try {
    const result = await pool.query("SELECT current_database() AS db");
    console.log(`   Connected to: ${result.rows[0].db}`);

    // Safety guard: refuse to run against production DB
    const dbName = result.rows[0].db;
    if (!dbName.includes("test") && !dbName.includes("jobnow_test")) {
      throw new Error(
        `🚨 SAFETY ABORT: Test DB name "${dbName}" does not contain "test". ` +
          "Refusing to seed a potentially production database."
      );
    }
  } finally {
    await pool.end();
  }

  // ── 3. Seed test DB ─────────────────────────────────────────────────────
  console.log("   Seeding test database...");
  execSync(`node ${path.join(ROOT, "scripts/seed-test-db.mjs")}`, {
    env: { ...process.env, TEST_DATABASE_URL: TEST_DB_URL },
    stdio: "pipe", // suppress seed output in test runner (already logged above)
  });

  console.log("✅ Integration test setup complete.\n");
}

export async function teardown() {
  // Optional: clean up after all tests
  // We leave data in place for debugging — re-seed on next run wipes it
  console.log("\n🧹 Integration test teardown complete.");
}
