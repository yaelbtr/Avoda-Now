/**
 * dbHealthCheck.ts
 *
 * Startup guard that verifies every table defined in the Drizzle schema
 * actually exists in the connected PostgreSQL database.
 *
 * Design decisions
 * ─────────────────
 * • Single source of truth: the table list is derived from the Drizzle schema
 *   objects at runtime, so it automatically stays in sync when new tables are
 *   added to schema.ts — no manual maintenance required.
 * • Non-blocking by default: `checkDbHealth()` returns a structured result
 *   instead of throwing, so callers decide whether to hard-fail or warn.
 * • Fail-fast at startup: `assertDbHealth()` wraps `checkDbHealth()` and
 *   throws if any tables are missing, preventing the server from accepting
 *   traffic in a broken state.
 * • Testable: both functions accept an optional `queryFn` parameter so tests
 *   can inject a mock without touching the real database.
 */

import * as schema from "../drizzle/schema";
import { getDb } from "./db";
import { sql, isTable, getTableName } from "drizzle-orm";

// ── Table name extraction ─────────────────────────────────────────────────────

/**
 * Extract all table names from the Drizzle schema at runtime.
 * Uses drizzle-orm's `isTable` + `getTableName` helpers which work
 * correctly in both production and Vitest ESM environments.
 */
export function getSchemaTableNames(): string[] {
  const names: string[] = [];
  for (const value of Object.values(schema)) {
    if (isTable(value)) {
      names.push(getTableName(value));
    }
  }
  return Array.from(new Set(names)).sort();
}

// ── Health check result type ──────────────────────────────────────────────────

export interface DbHealthCheckResult {
  /** All tables that exist in the database */
  existingTables: string[];
  /** Tables defined in the schema but absent from the database */
  missingTables: string[];
  /** Whether all schema tables are present */
  healthy: boolean;
}

// ── Query function type (injectable for testing) ──────────────────────────────

export type TableQueryFn = (tableNames: string[]) => Promise<string[]>;

/**
 * Default query function: asks PostgreSQL which of the given table names
 * exist in the `public` schema.
 */
async function defaultTableQueryFn(tableNames: string[]): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  if (tableNames.length === 0) return [];

  // Table names come from the Drizzle schema (not user input), so using
  // sql.raw with single-quoted literals is safe and avoids binding issues.
  const inList = tableNames.map((t) => `'${t}'`).join(", ");
  const rawQuery = sql.raw(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (${inList})`
  );
  const result = await db.execute(rawQuery);
  return (result.rows as Array<{ table_name: string }>).map((r) => r.table_name);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check which schema tables exist in the database.
 *
 * @param queryFn  Optional override for the DB query (used in tests).
 * @returns        Structured result with missing/existing tables and health flag.
 */
export async function checkDbHealth(
  queryFn: TableQueryFn = defaultTableQueryFn
): Promise<DbHealthCheckResult> {
  const expected = getSchemaTableNames();
  const existing = await queryFn(expected);
  const existingSet = new Set<string>(existing);
  const missingTables = expected.filter((t) => !existingSet.has(t));

  return {
    existingTables: existing.sort(),
    missingTables,
    healthy: missingTables.length === 0,
  };
}

/**
 * Assert that all schema tables exist. Throws a descriptive error if any are
 * missing. Intended to be called during server startup before accepting traffic.
 *
 * @param queryFn  Optional override for the DB query (used in tests).
 */
export async function assertDbHealth(
  queryFn: TableQueryFn = defaultTableQueryFn
): Promise<void> {
  const result = await checkDbHealth(queryFn);

  if (result.healthy) {
    console.log(
      `[DB Health] ✓ All ${result.existingTables.length} tables verified.`
    );
    return;
  }

  const list = result.missingTables.map((t) => `  • ${t}`).join("\n");
  const message =
    `[DB Health] ✗ ${result.missingTables.length} table(s) missing from the database.\n` +
    `Run "pnpm db:push" to apply pending migrations.\n` +
    `Missing tables:\n${list}`;

  console.error(message);
  throw new Error(message);
}
