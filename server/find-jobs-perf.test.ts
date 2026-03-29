/**
 * find-jobs-perf.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies the server-side infrastructure that supports FindJobs performance:
 *  1. jobs.list is a public procedure — no auth required (unblocked render)
 *  2. jobs.list respects the limit parameter (pagination)
 *  3. jobs.list returns total count for pagination metadata
 *  4. jobs.list with dateFilter=today does not throw
 *  5. jobs.list with specific category does not throw
 *  6. live.heroStats is a public procedure (deferred inView fetch)
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

// All DB tests use 15s timeout — cold connection pool can take ~8s on first call
const DB_TIMEOUT = 15_000;

function publicCaller() {
  return appRouter.createCaller({ user: null } as never);
}

describe("FindJobs performance — server-side", () => {
  // ── 1. jobs.list is a public procedure (no auth required) ──────────────────
  it("jobs.list returns an array without authentication", async () => {
    const caller = publicCaller();
    const result = await caller.jobs.list({
      category: "all",
      categories: [],
      limit: 5,
      page: 1,
      cities: [],
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  }, DB_TIMEOUT);

  // ── 2. jobs.list respects limit parameter ──────────────────────────────────
  it("jobs.list respects the limit parameter", async () => {
    const caller = publicCaller();
    const result = await caller.jobs.list({
      category: "all",
      categories: [],
      limit: 3,
      page: 1,
      cities: [],
    });
    expect(result.jobs.length).toBeLessThanOrEqual(3);
  }, DB_TIMEOUT);

  // ── 3. jobs.list returns pagination metadata ───────────────────────────────
  it("jobs.list returns total count for pagination", async () => {
    const caller = publicCaller();
    const result = await caller.jobs.list({
      category: "all",
      categories: [],
      limit: 5,
      page: 1,
      cities: [],
    });
    expect(typeof result.total).toBe("number");
    expect(result.total).toBeGreaterThanOrEqual(0);
  }, DB_TIMEOUT);

  // ── 4. jobs.list with dateFilter=today does not throw ─────────────────────
  it("jobs.list with dateFilter=today does not throw", async () => {
    const caller = publicCaller();
    await expect(
      caller.jobs.list({
        category: "all",
        categories: [],
        limit: 5,
        page: 1,
        cities: [],
        dateFilter: "today",
      })
    ).resolves.toBeDefined();
  }, DB_TIMEOUT);

  // ── 5. jobs.list with specific category does not throw ────────────────────
  it("jobs.list with specific category does not throw", async () => {
    const caller = publicCaller();
    await expect(
      caller.jobs.list({
        category: "warehouse",
        categories: ["warehouse"],
        limit: 5,
        page: 1,
        cities: [],
      })
    ).resolves.toBeDefined();
  }, DB_TIMEOUT);

  // ── 6. live.heroStats is a public procedure ────────────────────────────────
  it("live.heroStats returns stats without authentication", async () => {
    const caller = publicCaller();
    const result = await caller.live.heroStats();
    expect(result).toBeDefined();
    expect(typeof result.activeJobs).toBe("number");
    expect(typeof result.registeredWorkers).toBe("number");
  }, DB_TIMEOUT);
});
