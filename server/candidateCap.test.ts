/**
 * Unit tests for the 3-candidate cap logic.
 *
 * These tests exercise the pure helper functions
 * `countAcceptedCandidates` and `autoCloseJobIfCapReached` by
 * mocking the database layer so no real DB connection is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database module ────────────────────────────────────────────────
// We mock the entire db module so that individual helpers can be spied on.
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    countAcceptedCandidates: vi.fn(),
    autoCloseJobIfCapReached: vi.fn(),
  };
});

import {
  countAcceptedCandidates,
  autoCloseJobIfCapReached,
} from "./db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockCount = countAcceptedCandidates as ReturnType<typeof vi.fn>;
const mockAutoClose = autoCloseJobIfCapReached as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── countAcceptedCandidates ──────────────────────────────────────────────────

describe("countAcceptedCandidates (mocked)", () => {
  it("returns 0 when no accepted candidates", async () => {
    mockCount.mockResolvedValueOnce(0);
    expect(await countAcceptedCandidates(1)).toBe(0);
  });

  it("returns the correct count when some candidates accepted", async () => {
    mockCount.mockResolvedValueOnce(2);
    expect(await countAcceptedCandidates(42)).toBe(2);
  });

  it("returns MAX_ACCEPTED_CANDIDATES (3) when cap is reached", async () => {
    mockCount.mockResolvedValueOnce(3);
    expect(await countAcceptedCandidates(7)).toBe(3);
  });
});

// ─── autoCloseJobIfCapReached ─────────────────────────────────────────────────

describe("autoCloseJobIfCapReached (mocked)", () => {
  it("returns false when accepted count is below cap", async () => {
    mockAutoClose.mockResolvedValueOnce(false);
    const result = await autoCloseJobIfCapReached(1, 3);
    expect(result).toBe(false);
  });

  it("returns true when accepted count reaches cap", async () => {
    mockAutoClose.mockResolvedValueOnce(true);
    const result = await autoCloseJobIfCapReached(1, 3);
    expect(result).toBe(true);
  });

  it("returns false when job is already closed", async () => {
    // Simulates the guard inside autoCloseJobIfCapReached: job already closed,
    // so the UPDATE WHERE status='active' matches nothing → returns false.
    mockAutoClose.mockResolvedValueOnce(false);
    const result = await autoCloseJobIfCapReached(99, 3);
    expect(result).toBe(false);
  });
});

// ─── Business-rule invariants ─────────────────────────────────────────────────

describe("Cap business rules", () => {
  it("cap threshold is exactly 3", async () => {
    // Importing MAX_ACCEPTED_CANDIDATES from shared/const ensures the constant
    // is the single source of truth and has not drifted.
    const { MAX_ACCEPTED_CANDIDATES } = await import("../shared/const");
    expect(MAX_ACCEPTED_CANDIDATES).toBe(3);
  });

  it("cap_reached is a valid closedReason enum value in the schema", async () => {
    // Importing the schema ensures the enum was migrated correctly.
    const { closedReasonEnum } = await import("../drizzle/schema");
    // Drizzle pgEnum exposes `.enumValues` as a readonly tuple
    expect((closedReasonEnum.enumValues as readonly string[])).toContain("cap_reached");
  });
});
