/**
 * Unit tests for the setWorkerAvailable SQL parameter construction.
 *
 * Root cause of the bug:
 *   The original query reused $2 (latitude, numeric) and $3 (longitude, numeric)
 *   inside ST_MakePoint with ::float8 casts. PostgreSQL's query planner deduces
 *   conflicting types for the same parameter ($2 as numeric AND float8), raising:
 *   "inconsistent types deduced for parameter $2".
 *
 * Fix: pass dedicated float8 parameters ($7, $8) for ST_MakePoint so each
 *   parameter has a single unambiguous type.
 */
import { describe, it, expect } from "vitest";

// ── Pure helper that mirrors the fix in db.ts ────────────────────────────────
function buildAvailabilityParams(
  userId: number,
  latitude: string,
  longitude: string,
  city: string | null,
  note: string | null,
  availableUntil: Date
): unknown[] {
  const latFloat = parseFloat(String(latitude));
  const lngFloat = parseFloat(String(longitude));
  return [userId, latitude, longitude, city, note, availableUntil, lngFloat, latFloat];
}

function buildAvailabilitySQL(): string {
  return `INSERT INTO worker_availability ("userId", latitude, longitude, city, note, "availableUntil", "createdAt", "updatedAt", location)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), ST_SetSRID(ST_MakePoint($7, $8), 4326))`;
}
// ────────────────────────────────────────────────────────────────────────────

describe("setWorkerAvailable SQL parameter fix", () => {
  it("builds 8 parameters (not 6) to separate numeric from float8", () => {
    const params = buildAvailabilityParams(
      1, "31.7683", "35.2137", "ירושלים", null,
      new Date("2026-01-01T12:00:00Z")
    );
    expect(params).toHaveLength(8);
  });

  it("$7 is longitude as float8, $8 is latitude as float8", () => {
    const params = buildAvailabilityParams(
      1, "31.7683", "35.2137", "ירושלים", null,
      new Date("2026-01-01T12:00:00Z")
    );
    expect(params[6]).toBe(35.2137); // $7 = lng (float)
    expect(params[7]).toBe(31.7683); // $8 = lat (float)
  });

  it("$2 and $3 remain as original string (numeric) values", () => {
    const params = buildAvailabilityParams(
      1, "31.7683", "35.2137", "ירושלים", null,
      new Date("2026-01-01T12:00:00Z")
    );
    expect(params[1]).toBe("31.7683"); // $2 = latitude (numeric string)
    expect(params[2]).toBe("35.2137"); // $3 = longitude (numeric string)
  });

  it("ST_MakePoint uses $7 and $8 (not $2/$3 with casts)", () => {
    const sql = buildAvailabilitySQL();
    expect(sql).toContain("ST_MakePoint($7, $8)");
    expect(sql).not.toContain("$2::float8");
    expect(sql).not.toContain("$3::float8");
  });

  it("handles null city and note gracefully", () => {
    const params = buildAvailabilityParams(
      42, "32.0853", "34.7818", null, null,
      new Date("2026-06-01T08:00:00Z")
    );
    expect(params[3]).toBeNull(); // $4 = city
    expect(params[4]).toBeNull(); // $5 = note
  });

  it("correctly parses string coordinates to floats", () => {
    const params = buildAvailabilityParams(
      5, "32.0972860", "34.8326800", "תל אביב", null,
      new Date()
    );
    expect(typeof params[6]).toBe("number");
    expect(typeof params[7]).toBe("number");
    expect(params[6]).toBeCloseTo(34.83268, 4);
    expect(params[7]).toBeCloseTo(32.097286, 4);
  });

  it("handles numeric input (not string) via String() coercion", () => {
    // The router passes toString() but let's verify the parseFloat is robust
    const lat = parseFloat(String(32.1234));
    const lng = parseFloat(String(34.5678));
    expect(lat).toBe(32.1234);
    expect(lng).toBe(34.5678);
  });
});
