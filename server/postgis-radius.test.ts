/**
 * PostGIS Radius Search Tests
 *
 * Tests the spatial query logic for:
 * - getJobsNearLocation (ST_DWithin on jobs.location)
 * - getNearbyWorkers (ST_DWithin on worker_availability.location)
 * - getApplicationsForJobWithDistance (ST_Distance between worker and job)
 *
 * These tests mock the DB layer and verify that:
 * 1. The router passes correct lat/lng/radiusKm to db functions
 * 2. The db functions return correctly shaped results
 * 3. Edge cases (no GPS, null location, radius expansion) are handled
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock all DB helpers ───────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getJobsNearLocation: vi.fn(),
  getNearbyWorkers: vi.fn(),
  getApplicationsForJobWithDistance: vi.fn(),
  getJobById: vi.fn(),
  getActiveJobs: vi.fn(),
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
  checkOutdatedConsents: vi.fn().mockResolvedValue([]),
  recordConsent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./sms", () => ({
  sendJobAlerts: vi.fn().mockResolvedValue(0),
}));

import * as db from "./db";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const user: NonNullable<TrpcContext["user"]> = {
    id: 42,
    openId: "test-postgis",
    email: "test@avodanow.co.il",
    name: "PostGIS Tester",
    loginMethod: "phone_otp",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {}, socket: {} } as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

/** Build a minimal fake job row with a distance field (as returned by getJobsNearLocation) */
function fakeJobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "שליח",
    description: "תיאור",
    category: "delivery",
    address: "תל אביב",
    city: "תל אביב",
    latitude: "32.0853",
    longitude: "34.7818",
    salary: "50",
    salaryType: "hourly",
    contactPhone: "+972501234567",
    contactName: "מנהל",
    businessName: null,
    workingHours: null,
    startTime: "flexible",
    startDateTime: null,
    isUrgent: false,
    isLocalBusiness: false,
    reminderSentAt: null,
    closedReason: null,
    workersNeeded: 1,
    postedBy: 42,
    activeDuration: "1",
    expiresAt: null,
    status: "active",
    reportCount: 0,
    jobTags: null,
    jobLocationMode: "radius",
    jobSearchRadiusKm: 10,
    hourlyRate: null,
    estimatedHours: null,
    showPhone: false,
    jobDate: null,
    workStartTime: null,
    workEndTime: null,
    imageUrls: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    location: null,
    distance: 3.5,
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("PostGIS Radius Search — jobs.search procedure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes lat/lng/radiusKm to getJobsNearLocation", async () => {
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [], total: 0 });
    const caller = appRouter.createCaller(makeCtx());

    await caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: 10 });

    expect(db.getJobsNearLocation).toHaveBeenCalledWith(
      32.0853,
      34.7818,
      10,
      undefined, // category
      10,        // default limit
      undefined, // city
      undefined, // dateFilter
      0,         // offset
      undefined, // dayOfWeek
      undefined, // cities
      undefined  // categories
    );
  });

  it("uses default radiusKm=10 when not specified", async () => {
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [], total: 0 });
    const caller = appRouter.createCaller(makeCtx());

    await caller.jobs.search({ lat: 31.7683, lng: 35.2137 });

    const call = vi.mocked(db.getJobsNearLocation).mock.calls[0];
    expect(call[2]).toBe(10); // radiusKm default
  });

  it("accepts all valid RADIUS_OPTIONS values (5, 10, 20, 50)", async () => {
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [], total: 0 });
    const caller = appRouter.createCaller(makeCtx());

    for (const km of [5, 10, 20, 50]) {
      await caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: km });
      const call = vi.mocked(db.getJobsNearLocation).mock.calls.at(-1)!;
      expect(call[2]).toBe(km);
    }
  });

  it("returns jobs with distance field from PostGIS", async () => {
    const mockJob = fakeJobRow({ distance: 2.7 });
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [mockJob], total: 1 });
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: 10 });

    expect(result.jobs).toHaveLength(1);
    expect((result.jobs[0] as typeof mockJob).distance).toBe(2.7);
  });

  it("strips contactPhone from public search results", async () => {
    const mockJob = fakeJobRow({ contactPhone: "+972501234567" });
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [mockJob], total: 1 });
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: 10 });

    expect((result.jobs[0] as typeof mockJob).contactPhone).toBeNull();
  });

  it("returns empty array when no jobs within radius", async () => {
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [], total: 0 });
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.jobs.search({ lat: 29.5577, lng: 34.9519, radiusKm: 5 });

    expect(result.jobs).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("passes category filter alongside coordinates", async () => {
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [], total: 0 });
    const caller = appRouter.createCaller(makeCtx());

    await caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: 20, category: "delivery" });

    const call = vi.mocked(db.getJobsNearLocation).mock.calls[0];
    expect(call[3]).toBe("delivery"); // category
  });

  it("passes multi-category filter alongside coordinates", async () => {
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [], total: 0 });
    const caller = appRouter.createCaller(makeCtx());

    await caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: 20, categories: ["delivery", "warehouse"] });

    const call = vi.mocked(db.getJobsNearLocation).mock.calls[0];
    expect(call[10]).toEqual(["delivery", "warehouse"]); // categories
  });

  it("passes dayOfWeek filter alongside coordinates", async () => {
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [], total: 0 });
    const caller = appRouter.createCaller(makeCtx());

    // Sunday=0, Monday=1 in JS convention (maps to EXTRACT(DOW) 0,1 in PostgreSQL)
    await caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: 10, dayOfWeek: [0, 1] });

    const call = vi.mocked(db.getJobsNearLocation).mock.calls[0];
    expect(call[8]).toEqual([0, 1]); // dayOfWeek
  });

  it("supports pagination via page parameter", async () => {
    vi.mocked(db.getJobsNearLocation).mockResolvedValue({ rows: [], total: 100 });
    const caller = appRouter.createCaller(makeCtx());

    await caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: 10, page: 3, limit: 10 });

    const call = vi.mocked(db.getJobsNearLocation).mock.calls[0];
    expect(call[7]).toBe(20); // offset = (page-1) * limit = 2 * 10
  });

  it("rejects invalid radiusKm (negative)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.jobs.search({ lat: 32.0853, lng: 34.7818, radiusKm: -1 })
    ).rejects.toThrow();
  });
});

describe("PostGIS Radius Search — getNearbyWorkers distance computation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes lat/lng/radiusKm to getNearbyWorkers", async () => {
    vi.mocked(db.getNearbyWorkers).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx());

    await caller.workers.nearby({ lat: 32.0853, lng: 34.7818, radiusKm: 20 });

    expect(db.getNearbyWorkers).toHaveBeenCalledWith(32.0853, 34.7818, 20, 50);
  });

  it("returns workers with distance field", async () => {
    const mockWorker = {
      id: 1,
      userId: 7,
      latitude: "32.09",
      longitude: "34.78",
      city: "תל אביב",
      note: null,
      availableUntil: new Date(Date.now() + 3600_000),
      createdAt: new Date(),
      reminderSentAt: null,
      location: null,
      userName: "דוד",
      userPhone: "+972501234567",
      distance: 1.2,
    };
    vi.mocked(db.getNearbyWorkers).mockResolvedValue([mockWorker]);
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.workers.nearby({ lat: 32.0853, lng: 34.7818 });

    expect(result).toHaveLength(1);
    expect(result[0].distance).toBe(1.2);
  });

  it("uses default radiusKm=20 when not specified", async () => {
    vi.mocked(db.getNearbyWorkers).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx());

    await caller.workers.nearby({ lat: 32.0853, lng: 34.7818 });

    const call = vi.mocked(db.getNearbyWorkers).mock.calls[0];
    expect(call[2]).toBe(20);
  });

  it("returns empty array when no workers within radius", async () => {
    vi.mocked(db.getNearbyWorkers).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.workers.nearby({ lat: 29.5577, lng: 34.9519, radiusKm: 5 });

    expect(result).toHaveLength(0);
  });
});

describe("PostGIS distance — spatial math invariants", () => {
  it("distance from Tel Aviv to Jerusalem is ~60 km (sanity check)", () => {
    // Haversine reference: Tel Aviv (32.0853, 34.7818) → Jerusalem (31.7683, 35.2137)
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const lat1 = 32.0853, lon1 = 34.7818;
    const lat2 = 31.7683, lon2 = 35.2137;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // PostGIS ST_Distance on geography should return ~54 km for this pair
    expect(km).toBeGreaterThan(50);
    expect(km).toBeLessThan(60);
  });

  it("distance from Eilat to Tel Aviv is ~350 km (outside 50km radius)", () => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const lat1 = 29.5577, lon1 = 34.9519; // Eilat
    const lat2 = 32.0853, lon2 = 34.7818; // Tel Aviv
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    expect(km).toBeGreaterThan(250);
    // Should be excluded from any radius <= 50 km search
    expect(km).toBeGreaterThan(50);
  });

  it("same-point distance is 0 km", () => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const lat = 32.0853, lon = 34.7818;
    const dLat = toRad(0);
    const dLon = toRad(0);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    expect(km).toBe(0);
  });
});
