/**
 * server/test-db.ts
 *
 * Typed database helper for integration tests.
 *
 * Uses TEST_DATABASE_URL (local jobnow_test PostgreSQL) — completely isolated
 * from the production Neon database.
 *
 * Usage in integration tests:
 *   import { getTestDb, closeTestDb } from "../test-db";
 *
 *   afterAll(() => closeTestDb());
 *
 *   it("reads a user", async () => {
 *     const db = getTestDb();
 *     const users = await db.select().from(schema.users).limit(1);
 *     expect(users.length).toBeGreaterThan(0);
 *   });
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../drizzle/schema";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test_user:test_password@localhost:5432/jobnow_test";

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Returns a singleton Drizzle instance connected to the test database.
 * Lazy-initialized on first call.
 */
export function getTestDb() {
  if (!_db) {
    _pool = new pg.Pool({
      connectionString: TEST_DB_URL,
      max: 5,
    });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

/**
 * Closes the test DB connection pool.
 * Call in afterAll() to prevent open handle warnings.
 */
export async function closeTestDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

/**
 * Truncates all test data and re-seeds from scratch.
 * Useful for test isolation within a single test file.
 *
 * Note: This is slower than just running in a transaction.
 * Prefer using transactions for per-test isolation.
 */
export async function resetTestDb() {
  if (!_pool) getTestDb();
  const client = await _pool!.connect();
  try {
    await client.query(`
      TRUNCATE TABLE
        applications, saved_jobs, worker_ratings, worker_regions,
        region_notification_requests, worker_availability,
        notification_batches, push_subscriptions, job_reports,
        jobs, user_consents, legal_acknowledgements, birthdate_changes,
        phone_change_logs, email_verifications, email_unsubscribes,
        otp_rate_limit, system_logs, users,
        system_settings, categories, cities, phone_prefixes,
        regions
      RESTART IDENTITY CASCADE
    `);
  } finally {
    client.release();
  }
}
