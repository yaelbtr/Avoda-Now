/**
 * Tests for Web Push notification fan-out on job creation.
 *
 * Verifies:
 * 1. sendJobPushNotifications is called with matching worker IDs after job creation
 * 2. sendJobPushNotifications is NOT called when no matching workers exist
 * 3. sendJobPushNotifications receives the correct job metadata
 * 4. push.subscribe saves a subscription for the current user
 * 5. push.unsubscribe removes a subscription by endpoint
 * 6. push.vapidKey returns the public key
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./sms", () => ({
  sendJobAlerts: vi.fn().mockResolvedValue(0),
}));

vi.mock("./webPush", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
  sendJobPushNotifications: vi.fn().mockResolvedValue(2),
}));

vi.mock("./db", () => ({
  countActiveJobsByUser: vi.fn().mockResolvedValue(0),
  createJob: vi.fn().mockResolvedValue({ id: 77, title: "Test Job", city: "תל אביב" }),
  getJobById: vi.fn(),
  getActiveJobs: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  getJobsNearLocation: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  getMyJobs: vi.fn().mockResolvedValue([]),
  updateJobStatus: vi.fn(),
  deleteJob: vi.fn(),
  updateJob: vi.fn(),
  reportJob: vi.fn(),
  getWorkersMatchingJob: vi.fn().mockResolvedValue([
    { id: 10, phone: "0501111111", name: "Worker A", preferredCity: "תל אביב" },
    { id: 11, phone: "0502222222", name: "Worker B", preferredCity: null },
  ]),
  savePushSubscription: vi.fn().mockResolvedValue(undefined),
  deletePushSubscriptionByEndpoint: vi.fn().mockResolvedValue(undefined),
  expireOldJobs: vi.fn().mockResolvedValue(undefined),
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

import * as db from "./db";
import * as webPush from "./webPush";

// ── Helpers ──────────────────────────────────────────────────────────────────

type AuthUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  const user: AuthUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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

const baseJobInput = {
  title: "שליח דחוף",
  description: "דרוש שליח לאזור המרכז",
  category: "delivery" as const,
  address: "תל אביב",
  latitude: 32.0853,
  longitude: 34.7818,
  salaryType: "hourly" as const,
  contactPhone: "0501234567",
  contactName: "ישראל",
  startTime: "today" as const,
  workersNeeded: 1,
  activeDuration: "7" as const,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("push notifications — job creation fan-out", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls sendJobPushNotifications with matching worker IDs after job creation", async () => {
    vi.mocked(db.countActiveJobsByUser).mockResolvedValue(0);
    vi.mocked(db.createJob).mockResolvedValue({ id: 77, title: baseJobInput.title, city: "תל אביב" } as never);
    vi.mocked(db.getWorkersMatchingJob).mockResolvedValue([
      { id: 10, phone: "0501111111", name: "Worker A", preferredCity: "תל אביב" },
      { id: 11, phone: "0502222222", name: "Worker B", preferredCity: null },
    ]);

    const caller = appRouter.createCaller(makeCtx());
    await caller.jobs.create(baseJobInput);

    // Allow fire-and-forget to resolve
    await new Promise((r) => setTimeout(r, 50));

    expect(webPush.sendJobPushNotifications).toHaveBeenCalledOnce();
    const [workerIds, jobMeta] = vi.mocked(webPush.sendJobPushNotifications).mock.calls[0];
    expect(workerIds).toEqual([10, 11]);
    expect(jobMeta).toMatchObject({
      title: baseJobInput.title,
      category: baseJobInput.category,
      id: 77,
    });
  });

  it("does NOT call sendJobPushNotifications when no matching workers exist", async () => {
    vi.mocked(db.countActiveJobsByUser).mockResolvedValue(0);
    vi.mocked(db.createJob).mockResolvedValue({ id: 78, title: baseJobInput.title, city: "חיפה" } as never);
    vi.mocked(db.getWorkersMatchingJob).mockResolvedValue([]);

    const caller = appRouter.createCaller(makeCtx());
    await caller.jobs.create(baseJobInput);

    // Allow fire-and-forget to resolve
    await new Promise((r) => setTimeout(r, 50));

    expect(webPush.sendJobPushNotifications).not.toHaveBeenCalled();
  });

  it("passes isUrgent flag correctly to push notifications", async () => {
    vi.mocked(db.countActiveJobsByUser).mockResolvedValue(0);
    vi.mocked(db.createJob).mockResolvedValue({ id: 79, title: "דחוף!", city: "תל אביב" } as never);
    vi.mocked(db.getWorkersMatchingJob).mockResolvedValue([
      { id: 20, phone: "0503333333", name: "Worker C", preferredCity: null },
    ]);

    const caller = appRouter.createCaller(makeCtx());
    await caller.jobs.create({ ...baseJobInput, isUrgent: true });

    await new Promise((r) => setTimeout(r, 50));

    expect(webPush.sendJobPushNotifications).toHaveBeenCalledOnce();
    const [, jobMeta] = vi.mocked(webPush.sendJobPushNotifications).mock.calls[0];
    expect(jobMeta.isUrgent).toBe(true);
  });
});

describe("push.subscribe / unsubscribe / vapidKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a push subscription for the current user", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 5 }));
    const result = await caller.push.subscribe({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlTiESgX776I0w6skurq6w3y63cEsFnAIsZx6QZew",
      auth: "tBHItJI5svbpez7KI4CCXg",
    });
    expect(result).toEqual({ success: true });
    expect(db.savePushSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 5 })
    );
  });

  it("removes a push subscription by endpoint", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 5 }));
    const result = await caller.push.unsubscribe({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
    });
    expect(result).toEqual({ success: true });
    expect(db.deletePushSubscriptionByEndpoint).toHaveBeenCalledWith(
      "https://fcm.googleapis.com/fcm/send/test-endpoint"
    );
  });

  it("returns VAPID public key", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.push.vapidKey();
    // Key may be empty in test env (VAPID not set), but should return an object with publicKey
    expect(result).toHaveProperty("publicKey");
    expect(typeof result.publicKey).toBe("string");
  });
});
