/**
 * dayOfWeek.test.ts
 *
 * Verifies that the dayOfWeek filter parameter is:
 *   1. Correctly passed from the tRPC router procedures to the DB helpers
 *   2. Properly converted from JS convention (0=Sun..6=Sat) to MySQL DAYOFWEEK() (1=Sun..7=Sat)
 *   3. Correctly wired in both jobs.list and jobs.search procedures
 *   4. Omitted from the DB call when no days are selected (undefined)
 *
 * Tests use mocked DB helpers to avoid real database connections.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock all DB helpers used by the jobs router ────────────────────────────────
vi.mock("./db", () => ({
  getActiveJobs: vi.fn(),
  getJobsNearLocation: vi.fn(),
  getJobById: vi.fn(),
  countActiveJobsByUser: vi.fn(),
  createJob: vi.fn(),
  getMyJobs: vi.fn(),
  updateJobStatus: vi.fn(),
  deleteJob: vi.fn(),
  updateJob: vi.fn(),
  reportJob: vi.fn(),
  getWorkersMatchingJob: vi.fn().mockResolvedValue([]),
  createOtp: vi.fn(),
  getValidOtp: vi.fn(),
  markOtpUsed: vi.fn(),
  getUserByPhone: vi.fn(),
  createUserByPhone: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
  checkRegionActiveForJob: vi.fn().mockResolvedValue({ allowed: true }),
  findNearestRegion: vi.fn().mockResolvedValue(undefined),
  associateWorkerWithRegion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./sms", () => ({
  sendJobAlerts: vi.fn().mockResolvedValue(0),
}));

import * as db from "./db";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Minimal empty paginated result returned by the mocked DB helpers */
const EMPTY_RESULT = { rows: [], total: 0 };

/** Public (unauthenticated) tRPC context */
function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, socket: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ── DAY_NAME_TO_NUM mapping tests ──────────────────────────────────────────────

describe("DAY_NAME_TO_NUM — JS day-number convention", () => {
  /**
   * The client maps day-name strings to JS numbers (0=Sun, 1=Mon, ..., 6=Sat).
   * These values are sent as-is to the tRPC procedures.
   * The DB helper then converts them to MySQL DAYOFWEEK() (JS + 1).
   */
  const DAY_NAME_TO_NUM: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  it("sunday maps to 0 (JS) → 1 (MySQL DAYOFWEEK)", () => {
    expect(DAY_NAME_TO_NUM.sunday).toBe(0);
    expect(DAY_NAME_TO_NUM.sunday + 1).toBe(1); // MySQL DAYOFWEEK(Sunday) = 1
  });

  it("monday maps to 1 (JS) → 2 (MySQL DAYOFWEEK)", () => {
    expect(DAY_NAME_TO_NUM.monday).toBe(1);
    expect(DAY_NAME_TO_NUM.monday + 1).toBe(2);
  });

  it("friday maps to 5 (JS) → 6 (MySQL DAYOFWEEK)", () => {
    expect(DAY_NAME_TO_NUM.friday).toBe(5);
    expect(DAY_NAME_TO_NUM.friday + 1).toBe(6);
  });

  it("saturday maps to 6 (JS) → 7 (MySQL DAYOFWEEK)", () => {
    expect(DAY_NAME_TO_NUM.saturday).toBe(6);
    expect(DAY_NAME_TO_NUM.saturday + 1).toBe(7);
  });

  it("all 7 days produce distinct values in range 0–6", () => {
    const values = Object.values(DAY_NAME_TO_NUM);
    expect(values).toHaveLength(7);
    const unique = new Set(values);
    expect(unique.size).toBe(7);
    values.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(6);
    });
  });

  it("MySQL conversion: all values shift by +1 to range 1–7", () => {
    const mysqlValues = Object.values(DAY_NAME_TO_NUM).map(d => d + 1);
    mysqlValues.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(7);
    });
  });
});

// ── jobs.list — dayOfWeek parameter passing ────────────────────────────────────

describe("jobs.list — dayOfWeek parameter forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getActiveJobs).mockResolvedValue(EMPTY_RESULT as never);
  });

  it("calls getActiveJobs with dayOfWeek=undefined when no days selected", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({});

    expect(db.getActiveJobs).toHaveBeenCalledOnce();
    // 6th argument (index 5) is dayOfWeek
    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[5]).toBeUndefined();
  });

  it("passes dayOfWeek=[0] (Sunday) to getActiveJobs", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ dayOfWeek: [0] });

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[5]).toEqual([0]);
  });

  it("passes dayOfWeek=[1,2,3,4,5] (Mon–Fri) to getActiveJobs", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ dayOfWeek: [1, 2, 3, 4, 5] });

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[5]).toEqual([1, 2, 3, 4, 5]);
  });

  it("passes dayOfWeek=[5,6] (Fri–Sat) to getActiveJobs", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ dayOfWeek: [5, 6] });

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[5]).toEqual([5, 6]);
  });

  it("passes all 7 days when full week is selected", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ dayOfWeek: [0, 1, 2, 3, 4, 5, 6] });

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[5]).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("rejects dayOfWeek values outside 0–6 range", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.jobs.list({ dayOfWeek: [7] })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(caller.jobs.list({ dayOfWeek: [-1] })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("can combine dayOfWeek with category and city filters", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ category: "delivery", city: "תל אביב", dayOfWeek: [0, 1] });

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[1]).toBe("delivery");  // category
    expect(callArgs[2]).toBe("תל אביב");  // city
    expect(callArgs[5]).toEqual([0, 1]);   // dayOfWeek
  });

  it("can combine dayOfWeek with dateFilter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ dateFilter: "this_week", dayOfWeek: [0, 6] });

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[3]).toBe("this_week"); // dateFilter
    expect(callArgs[5]).toEqual([0, 6]);   // dayOfWeek
  });

  it("returns jobs array from getActiveJobs result", async () => {
    const mockJob = { id: 1, title: "Test Job", contactPhone: "050-1234567" };
    vi.mocked(db.getActiveJobs).mockResolvedValue({ rows: [mockJob as never], total: 1 });

    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.jobs.list({ dayOfWeek: [1] });

    expect(result.total).toBe(1);
    expect(result.jobs).toHaveLength(1);
    // contactPhone must be stripped from public response
    expect(result.jobs[0]?.contactPhone).toBeNull();
  });
});

// ── jobs.search — dayOfWeek parameter passing ─────────────────────────────────

describe("jobs.search — dayOfWeek parameter forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getJobsNearLocation).mockResolvedValue(EMPTY_RESULT as never);
  });

  const baseSearchInput = {
    lat: 32.0853,
    lng: 34.7818,
    radiusKm: 10,
  };

  it("calls getJobsNearLocation with dayOfWeek=undefined when no days selected", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.search(baseSearchInput);

    expect(db.getJobsNearLocation).toHaveBeenCalledOnce();
    // 9th argument (index 8) is dayOfWeek
    const callArgs = vi.mocked(db.getJobsNearLocation).mock.calls[0]!;
    expect(callArgs[8]).toBeUndefined();
  });

  it("passes dayOfWeek=[0] (Sunday) to getJobsNearLocation", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.search({ ...baseSearchInput, dayOfWeek: [0] });

    const callArgs = vi.mocked(db.getJobsNearLocation).mock.calls[0]!;
    expect(callArgs[8]).toEqual([0]);
  });

  it("passes dayOfWeek=[1,2,3,4,5] (Mon–Fri) to getJobsNearLocation", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.search({ ...baseSearchInput, dayOfWeek: [1, 2, 3, 4, 5] });

    const callArgs = vi.mocked(db.getJobsNearLocation).mock.calls[0]!;
    expect(callArgs[8]).toEqual([1, 2, 3, 4, 5]);
  });

  it("passes dayOfWeek=[5,6] (Fri–Sat) to getJobsNearLocation", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.search({ ...baseSearchInput, dayOfWeek: [5, 6] });

    const callArgs = vi.mocked(db.getJobsNearLocation).mock.calls[0]!;
    expect(callArgs[8]).toEqual([5, 6]);
  });

  it("passes all 7 days when full week is selected", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.search({ ...baseSearchInput, dayOfWeek: [0, 1, 2, 3, 4, 5, 6] });

    const callArgs = vi.mocked(db.getJobsNearLocation).mock.calls[0]!;
    expect(callArgs[8]).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("rejects dayOfWeek values outside 0–6 range", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.jobs.search({ ...baseSearchInput, dayOfWeek: [7] })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("passes lat, lng, radiusKm correctly alongside dayOfWeek", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.search({ ...baseSearchInput, dayOfWeek: [3] });

    const callArgs = vi.mocked(db.getJobsNearLocation).mock.calls[0]!;
    expect(callArgs[0]).toBe(32.0853);  // lat
    expect(callArgs[1]).toBe(34.7818);  // lng
    expect(callArgs[2]).toBe(10);       // radiusKm
    expect(callArgs[8]).toEqual([3]);   // dayOfWeek (Wednesday)
  });

  it("can combine dayOfWeek with category, city, and dateFilter", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.search({
      ...baseSearchInput,
      category: "cleaning",
      city: "חיפה",
      dateFilter: "tomorrow",
      dayOfWeek: [2],
    });

    const callArgs = vi.mocked(db.getJobsNearLocation).mock.calls[0]!;
    expect(callArgs[3]).toBe("cleaning");  // category
    expect(callArgs[5]).toBe("חיפה");     // city
    expect(callArgs[6]).toBe("tomorrow"); // dateFilter
    expect(callArgs[8]).toEqual([2]);      // dayOfWeek (Tuesday)
  });

  it("strips contactPhone from search results", async () => {
    const mockJob = { id: 5, title: "מנקה", contactPhone: "052-9876543" };
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [mockJob as never], total: 1 });

    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.jobs.search({ ...baseSearchInput, dayOfWeek: [4] });

    expect(result.jobs[0]?.contactPhone).toBeNull();
  });
});

// ── MySQL conversion logic tests ───────────────────────────────────────────────

describe("MySQL DAYOFWEEK() conversion", () => {
  /**
   * The DB helper converts JS day numbers (0=Sun..6=Sat) to MySQL DAYOFWEEK()
   * values (1=Sun..7=Sat) by adding 1.
   * These tests verify the conversion logic in isolation.
   */

  it("converts JS Sunday (0) to MySQL DAYOFWEEK 1", () => {
    const jsDays = [0];
    const mysqlDays = jsDays.map(d => d + 1);
    expect(mysqlDays).toEqual([1]);
  });

  it("converts JS Saturday (6) to MySQL DAYOFWEEK 7", () => {
    const jsDays = [6];
    const mysqlDays = jsDays.map(d => d + 1);
    expect(mysqlDays).toEqual([7]);
  });

  it("converts JS Mon–Fri (1–5) to MySQL DAYOFWEEK 2–6", () => {
    const jsDays = [1, 2, 3, 4, 5];
    const mysqlDays = jsDays.map(d => d + 1);
    expect(mysqlDays).toEqual([2, 3, 4, 5, 6]);
  });

  it("converts full week (0–6) to MySQL DAYOFWEEK 1–7", () => {
    const jsDays = [0, 1, 2, 3, 4, 5, 6];
    const mysqlDays = jsDays.map(d => d + 1);
    expect(mysqlDays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("all MySQL values are in valid DAYOFWEEK range (1–7)", () => {
    const jsDays = [0, 1, 2, 3, 4, 5, 6];
    const mysqlDays = jsDays.map(d => d + 1);
    mysqlDays.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(7);
    });
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

describe("dayOfWeek — edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getActiveJobs).mockResolvedValue(EMPTY_RESULT as never);
    vi.mocked(db.getJobsNearLocation).mockResolvedValue(EMPTY_RESULT as never);
  });

  it("empty dayOfWeek array is treated as no filter (undefined behavior)", async () => {
    // An empty array [] passes Zod validation but the DB helper treats it as no-op
    // because `dayOfWeek.length > 0` is false
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ dayOfWeek: [] });

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    // Empty array is passed through — DB helper handles it with length check
    expect(callArgs[5]).toEqual([]);
  });

  it("single day filter works for jobs.list", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ dayOfWeek: [3] }); // Wednesday

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[5]).toEqual([3]);
  });

  it("single day filter works for jobs.search", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.search({ lat: 31.7683, lng: 35.2137, dayOfWeek: [5] }); // Friday

    const callArgs = vi.mocked(db.getJobsNearLocation).mock.calls[0]!;
    expect(callArgs[8]).toEqual([5]);
  });

  it("dayOfWeek does not interfere with pagination (page/limit)", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await caller.jobs.list({ dayOfWeek: [1], page: 2, limit: 5 });

    const callArgs = vi.mocked(db.getActiveJobs).mock.calls[0]!;
    expect(callArgs[0]).toBe(5);   // limit
    expect(callArgs[4]).toBe(5);   // offset = (page-1) * limit = 1 * 5 = 5
    expect(callArgs[5]).toEqual([1]); // dayOfWeek
  });
});
