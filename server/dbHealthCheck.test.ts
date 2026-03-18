import { describe, it, expect, vi } from "vitest";
import {
  getSchemaTableNames,
  checkDbHealth,
  assertDbHealth,
  type TableQueryFn,
} from "./dbHealthCheck";

// ---------------------------------------------------------------------------
// getSchemaTableNames
// ---------------------------------------------------------------------------

describe("getSchemaTableNames", () => {
  it("returns a non-empty array of strings", () => {
    const names = getSchemaTableNames();
    expect(names.length).toBeGreaterThan(0);
    names.forEach((n) => expect(typeof n).toBe("string"));
  });

  it("includes all known core tables", () => {
    const names = getSchemaTableNames();
    const required = [
      "users",
      "jobs",
      "applications",
      "system_settings",
      "push_subscriptions",
      "user_consents",
      "worker_ratings",
      "region_notification_requests",
      "worker_regions",
      "saved_jobs",
      "cities",
      "regions",
      "categories",
      "notification_batches",
      "otp_rate_limit",
      "phone_change_logs",
      "phone_prefixes",
      "worker_availability",
      "job_reports",
    ];
    for (const t of required) {
      expect(names, `Expected "${t}" to be in schema table list`).toContain(t);
    }
  });

  it("returns sorted, deduplicated names", () => {
    const names = getSchemaTableNames();
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// checkDbHealth
// ---------------------------------------------------------------------------

describe("checkDbHealth", () => {
  it("returns healthy=true when all schema tables are present", async () => {
    const allTables = getSchemaTableNames();
    const mockQuery: TableQueryFn = async () => [...allTables];

    const result = await checkDbHealth(mockQuery);

    expect(result.healthy).toBe(true);
    expect(result.missingTables).toHaveLength(0);
    expect(result.existingTables.sort()).toEqual(allTables.sort());
  });

  it("returns healthy=false and lists missing tables when some are absent", async () => {
    const allTables = getSchemaTableNames();
    const missing = ["system_settings", "user_consents"];
    const present = allTables.filter((t) => !missing.includes(t));
    const mockQuery: TableQueryFn = async () => present;

    const result = await checkDbHealth(mockQuery);

    expect(result.healthy).toBe(false);
    expect(result.missingTables).toEqual(expect.arrayContaining(missing));
    expect(result.missingTables).toHaveLength(missing.length);
  });

  it("returns all tables as missing when the database is empty", async () => {
    const allTables = getSchemaTableNames();
    const mockQuery: TableQueryFn = async () => [];

    const result = await checkDbHealth(mockQuery);

    expect(result.healthy).toBe(false);
    expect(result.missingTables.sort()).toEqual(allTables.sort());
    expect(result.existingTables).toHaveLength(0);
  });

  it("returns healthy=true when the DB returns extra tables not in the schema", async () => {
    // Extra tables (e.g. legacy tables) should not affect health
    const allTables = getSchemaTableNames();
    const mockQuery: TableQueryFn = async () => [
      ...allTables,
      "legacy_table_xyz",
      "temp_migration_backup",
    ];

    const result = await checkDbHealth(mockQuery);

    expect(result.healthy).toBe(true);
    expect(result.missingTables).toHaveLength(0);
  });

  it("returns sorted existingTables", async () => {
    const allTables = getSchemaTableNames();
    // Return in reverse order to test sorting
    const mockQuery: TableQueryFn = async () => [...allTables].reverse();

    const result = await checkDbHealth(mockQuery);

    expect(result.existingTables).toEqual([...result.existingTables].sort());
  });

  it("handles a single missing table correctly", async () => {
    const allTables = getSchemaTableNames();
    const missing = "jobs";
    const present = allTables.filter((t) => t !== missing);
    const mockQuery: TableQueryFn = async () => present;

    const result = await checkDbHealth(mockQuery);

    expect(result.healthy).toBe(false);
    expect(result.missingTables).toEqual([missing]);
  });

  it("propagates errors from the query function", async () => {
    const mockQuery: TableQueryFn = async () => {
      throw new Error("DB connection refused");
    };

    await expect(checkDbHealth(mockQuery)).rejects.toThrow(
      "DB connection refused"
    );
  });
});

// ---------------------------------------------------------------------------
// assertDbHealth
// ---------------------------------------------------------------------------

describe("assertDbHealth", () => {
  it("resolves without throwing when all tables are present", async () => {
    const allTables = getSchemaTableNames();
    const mockQuery: TableQueryFn = async () => [...allTables];

    await expect(assertDbHealth(mockQuery)).resolves.toBeUndefined();
  });

  it("logs success message when healthy", async () => {
    const allTables = getSchemaTableNames();
    const mockQuery: TableQueryFn = async () => [...allTables];
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await assertDbHealth(mockQuery);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DB Health] ✓")
    );
    consoleSpy.mockRestore();
  });

  it("throws a descriptive error listing missing tables", async () => {
    const allTables = getSchemaTableNames();
    const missing = ["system_settings", "push_subscriptions"];
    const present = allTables.filter((t) => !missing.includes(t));
    const mockQuery: TableQueryFn = async () => present;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(assertDbHealth(mockQuery)).rejects.toThrow(
      /\[DB Health\] ✗ 2 table\(s\) missing/
    );
    // Error message must mention each missing table
    try {
      await assertDbHealth(mockQuery);
    } catch (err) {
      const msg = (err as Error).message;
      for (const t of missing) {
        expect(msg).toContain(t);
      }
      expect(msg).toContain("pnpm db:push");
    }

    consoleSpy.mockRestore();
  });

  it("throws when the database is completely empty", async () => {
    const mockQuery: TableQueryFn = async () => [];
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(assertDbHealth(mockQuery)).rejects.toThrow(/\[DB Health\] ✗/);

    consoleSpy.mockRestore();
  });

  it("logs an error to console.error when tables are missing", async () => {
    const allTables = getSchemaTableNames();
    const mockQuery: TableQueryFn = async () =>
      allTables.filter((t) => t !== "jobs");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(assertDbHealth(mockQuery)).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DB Health] ✗")
    );

    consoleSpy.mockRestore();
  });
});
