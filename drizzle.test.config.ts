/**
 * Drizzle config for the isolated TEST database.
 *
 * Uses the same schema definitions as production but targets a completely
 * separate local PostgreSQL database (`jobnow_test`).  This guarantees:
 *   - Zero data bleed between test runs and production
 *   - Full schema parity (same tables, enums, indexes)
 *   - Fast local execution (no network latency)
 *
 * Usage:
 *   pnpm db:push:test   → apply migrations to test DB
 *   pnpm db:reset:test  → drop & recreate all tables (full wipe)
 */
import { defineConfig } from "drizzle-kit";

// TEST_DATABASE_URL must point to a separate DB, never to production.
// Default: local PostgreSQL instance created by scripts/setup-test-db.sh
const connectionString =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test_user:test_password@localhost:5432/jobnow_test";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations-test",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
