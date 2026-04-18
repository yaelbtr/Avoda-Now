/**
 * Unit tests for the minor late-hours filter applied inside queryJobs.
 *
 * Because queryJobs runs against a real database, we test the *predicate logic*
 * directly by extracting it into a pure helper that mirrors the SQL condition.
 * This keeps the tests fast, deterministic, and free of DB dependencies.
 *
 * The SQL condition in db.ts (simplified):
 *   workEndTime IS NULL
 *   OR (workEndTime <= '22:00' AND (workStartTime IS NULL OR workEndTime >= workStartTime))
 *
 * In plain English for a worker under 18:
 *   - No end time set          → show (no restriction)
 *   - End time <= 22:00 AND same-day (end >= start or no start) → show
 *   - End time > 22:00         → hide (late shift)
 *   - End time < start time    → hide (overnight shift)
 */

import { describe, it, expect } from "vitest";

/**
 * Pure mirror of the SQL predicate used in queryJobs for the minor late-hours filter.
 * Returns true when the job SHOULD be shown to a minor (passes the filter).
 */
function isJobVisibleToMinor(
  workEndTime: string | null | undefined,
  workStartTime: string | null | undefined,
): boolean {
  // workEndTime IS NULL → always show
  if (!workEndTime) return true;

  // workEndTime > '22:00' → hide
  if (workEndTime > "22:00") return false;

  // Overnight: workStartTime is set AND workEndTime < workStartTime → hide
  if (workStartTime && workEndTime < workStartTime) return false;

  return true;
}

describe("minor late-hours filter (mirrors queryJobs SQL predicate)", () => {
  // ── Should be SHOWN to minors ──────────────────────────────────────────────
  it("no end time → show (no restriction)", () =>
    expect(isJobVisibleToMinor(null, null)).toBe(true));

  it("no end time with start → show", () =>
    expect(isJobVisibleToMinor(null, "09:00")).toBe(true));

  it("08:00 → 16:00 normal shift → show", () =>
    expect(isJobVisibleToMinor("16:00", "08:00")).toBe(true));

  it("09:00 → 17:00 normal shift → show", () =>
    expect(isJobVisibleToMinor("17:00", "09:00")).toBe(true));

  it("end exactly 22:00 → show (boundary inclusive)", () =>
    expect(isJobVisibleToMinor("22:00", "14:00")).toBe(true));

  it("end 21:59 → show", () =>
    expect(isJobVisibleToMinor("21:59", "13:00")).toBe(true));

  it("end time set but no start time → show (can't determine overnight)", () =>
    expect(isJobVisibleToMinor("20:00", null)).toBe(true));

  // ── Should be HIDDEN from minors ───────────────────────────────────────────
  it("end 22:01 → hide (past legal limit)", () =>
    expect(isJobVisibleToMinor("22:01", "14:00")).toBe(false));

  it("end 23:00 → hide", () =>
    expect(isJobVisibleToMinor("23:00", "15:00")).toBe(false));

  it("end 00:00 midnight → hide (late)", () =>
    expect(isJobVisibleToMinor("00:00", "22:00")).toBe(false));

  it("overnight 22:00 → 06:00 → hide (end < start)", () =>
    expect(isJobVisibleToMinor("06:00", "22:00")).toBe(false));

  it("overnight 20:00 → 04:00 → hide (end < start)", () =>
    expect(isJobVisibleToMinor("04:00", "20:00")).toBe(false));

  it("overnight 23:00 → 07:00 → hide (end < start)", () =>
    expect(isJobVisibleToMinor("07:00", "23:00")).toBe(false));

  // ── Edge cases ─────────────────────────────────────────────────────────────
  it("same start and end (zero-duration) at 10:00 → show (not late)", () =>
    expect(isJobVisibleToMinor("10:00", "10:00")).toBe(true));

  it("same start and end at 23:00 → hide (late)", () =>
    expect(isJobVisibleToMinor("23:00", "23:00")).toBe(false));
});
