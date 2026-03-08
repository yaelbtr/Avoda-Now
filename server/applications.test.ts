/**
 * Tests for the job application system:
 * - applyToJob procedure (duplicate check, success path)
 * - checkApplied procedure
 * - getApplications procedure (authorization)
 * - getPublicProfile procedure (public access)
 *
 * These tests mock the database helpers so no real DB is needed.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getJobById: vi.fn(),
  getApplicationByWorkerAndJob: vi.fn(),
  createApplication: vi.fn(),
  getApplicationsForJob: vi.fn(),
  getApplicationById: vi.fn(),
  revealApplicationContact: vi.fn(),
  updateApplicationStatus: vi.fn(),
  getPublicWorkerProfile: vi.fn(),
  // Other functions used by the router (return safe defaults)
  getActiveJobs: vi.fn().mockResolvedValue([]),
  getJobsNearLocation: vi.fn().mockResolvedValue([]),
  getTodayJobs: vi.fn().mockResolvedValue([]),
  getUrgentJobs: vi.fn().mockResolvedValue([]),
  getMyJobs: vi.fn().mockResolvedValue([]),
  countActiveJobsByUser: vi.fn().mockResolvedValue(0),
  createJob: vi.fn(),
  deleteJob: vi.fn(),
  updateJob: vi.fn(),
  updateJobStatus: vi.fn(),
  markJobFilled: vi.fn(),
  reportJob: vi.fn(),
  checkAndIncrementSendRate: vi.fn().mockResolvedValue(true),
  checkAndIncrementVerifyAttempts: vi.fn().mockResolvedValue(true),
  resetRateLimit: vi.fn(),
  getUserByPhone: vi.fn(),
  createUserByPhone: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
  setWorkerAvailable: vi.fn(),
  setWorkerUnavailable: vi.fn(),
  getWorkerAvailability: vi.fn(),
  getNearbyWorkers: vi.fn().mockResolvedValue([]),
  getLiveStats: vi.fn().mockResolvedValue({ availableWorkers: 0, newJobsLastHour: 0, urgentJobsNow: 0 }),
  getActivityFeed: vi.fn().mockResolvedValue([]),
  setUserMode: vi.fn(),
  getUserMode: vi.fn().mockResolvedValue(null),
  clearUserMode: vi.fn(),
  getWorkerProfile: vi.fn(),
  updateWorkerProfile: vi.fn(),
  getWorkersMatchingJob: vi.fn().mockResolvedValue([]),
  getNotificationPrefs: vi.fn().mockResolvedValue("both"),
  updateNotificationPrefs: vi.fn(),
  savePushSubscription: vi.fn(),
  deletePushSubscriptionByEndpoint: vi.fn(),
  getMyJobsWithPendingCounts: vi.fn().mockResolvedValue([]),
  getMyApplications: vi.fn().mockResolvedValue([]),
  getUnreadApplicationsCount: vi.fn().mockResolvedValue(0),
  getApplicationsForJobWithDistance: vi.fn().mockResolvedValue([]),
}));

vi.mock("./sms", () => ({
  sendJobAlerts: vi.fn().mockResolvedValue(0),
  sendSms: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./smsProvider", () => ({
  smsProvider: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
  },
  isValidIsraeliPhone: vi.fn().mockReturnValue(true),
  normalizeIsraeliPhone: vi.fn((p: string) => p),
}));

vi.mock("./adminDb", () => ({
  adminGetStats: vi.fn(),
  adminGetAllJobs: vi.fn().mockResolvedValue([]),
  adminGetReportedJobs: vi.fn().mockResolvedValue([]),
  adminApproveJob: vi.fn(),
  adminRejectJob: vi.fn(),
  adminDeleteJob: vi.fn(),
  adminSetJobStatus: vi.fn(),
  adminGetAllReports: vi.fn().mockResolvedValue([]),
  adminClearJobReports: vi.fn(),
  adminGetAllUsers: vi.fn().mockResolvedValue([]),
  adminBlockUser: vi.fn(),
  adminUnblockUser: vi.fn(),
  adminSetUserRole: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 42,
    openId: "worker-42",
    name: "Test Worker",
    email: null,
    phone: "+972501234567",
    loginMethod: "phone_otp",
    role: "user",
    userMode: "worker",
    workerTags: null,
    preferredCategories: null,
    preferredCity: null,
    workerBio: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Test Job",
    description: "Test description",
    category: "delivery" as const,
    address: "Tel Aviv",
    city: "Tel Aviv",
    latitude: "32.0853",
    longitude: "34.7818",
    salary: "50.00",
    salaryType: "hourly" as const,
    contactPhone: "+972501111111",
    contactName: "Employer",
    businessName: null,
    workingHours: null,
    startTime: "flexible" as const,
    startDateTime: null,
    isUrgent: false,
    isLocalBusiness: false,
    showPhone: false,
    reminderSentAt: null,
    closedReason: null,
    workersNeeded: 1,
    postedBy: 99,
    activeDuration: "1" as const,
    expiresAt: new Date(Date.now() + 86400000),
    status: "active" as const,
    reportCount: 0,
    jobTags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("jobs.applyToJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully applies to a job and records the application", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser();
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getJobById).mockResolvedValue(makeJob() as ReturnType<typeof makeJob>);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue(null);
    vi.mocked(db.createApplication).mockResolvedValue(undefined);

    const result = await caller.jobs.applyToJob({ jobId: 1 });

    expect(result).toEqual({ success: true });
    expect(db.createApplication).toHaveBeenCalledWith(user.id, 1, undefined);
  });

  it("throws CONFLICT when worker already applied", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser();
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getJobById).mockResolvedValue(makeJob() as ReturnType<typeof makeJob>);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue({
      id: 5,
      jobId: 1,
      workerId: user.id,
      status: "pending" as const,
      message: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(caller.jobs.applyToJob({ jobId: 1 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(db.createApplication).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser();
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getJobById).mockResolvedValue(undefined);

    await expect(caller.jobs.applyToJob({ jobId: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST when job is not active", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser();
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getJobById).mockResolvedValue(makeJob({ status: "closed" }) as ReturnType<typeof makeJob>);

    await expect(caller.jobs.applyToJob({ jobId: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const ctx = makeCtx(null); // unauthenticated
    const caller = appRouter.createCaller(ctx);

    await expect(caller.jobs.applyToJob({ jobId: 1 })).rejects.toBeInstanceOf(TRPCError);
  });
});

describe("jobs.checkApplied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns applied: false when no application exists", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser();
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue(null);

    const result = await caller.jobs.checkApplied({ jobId: 1 });
    expect(result).toEqual({ applied: false });
  });

  it("returns applied: true when application exists", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser();
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue({
      id: 5,
      jobId: 1,
      workerId: user.id,
      status: "pending" as const,
      message: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await caller.jobs.checkApplied({ jobId: 1 });
    expect(result).toEqual({ applied: true });
  });
});

describe("jobs.getApplications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns applications for job owner", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 }); // job owner
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getJobById).mockResolvedValue(makeJob({ postedBy: 99 }) as ReturnType<typeof makeJob>);
    vi.mocked(db.getApplicationsForJob).mockResolvedValue([]);

    const result = await caller.jobs.getApplications({ jobId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws FORBIDDEN for non-owner", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 42 }); // not the owner
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getJobById).mockResolvedValue(makeJob({ postedBy: 99 }) as ReturnType<typeof makeJob>);

    await expect(caller.jobs.getApplications({ jobId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("user.getPublicProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public profile for any user (no auth required)", async () => {
    const { appRouter } = await import("./routers");
    const ctx = makeCtx(null); // unauthenticated
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getPublicWorkerProfile).mockResolvedValue({
      id: 42,
      name: "Test Worker",
      preferredCategories: ["delivery"],
      preferredCity: "Tel Aviv",
      workerBio: "Experienced worker",
      workerTags: null,
      createdAt: new Date(),
    });

    const result = await caller.user.getPublicProfile({ userId: 42 });
    expect(result.id).toBe(42);
    expect(result.name).toBe("Test Worker");
  });

  it("throws NOT_FOUND when profile does not exist", async () => {
    const { appRouter } = await import("./routers");
    const ctx = makeCtx(null);
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getPublicWorkerProfile).mockResolvedValue(null);

    await expect(caller.user.getPublicProfile({ userId: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── Helper: make a mock application row ──────────────────────────────────────
function makeAppRow(overrides: Partial<{
  id: number;
  jobId: number;
  workerId: number;
  jobPostedBy: number;
  contactRevealed: boolean;
  revealedAt: Date | null;
  workerPhone: string | null;
  workerName: string | null;
  jobTitle: string;
}> = {}) {
  return {
    id: 10,
    jobId: 1,
    workerId: 20,
    status: "pending" as const,
    message: null,
    contactRevealed: false,
    revealedAt: null,
    createdAt: new Date(),
    workerName: "Test Worker",
    workerPhone: "+972501234567",
    workerBio: null,
    workerPreferredCity: "Tel Aviv",
    workerPreferredCategories: ["delivery"],
    workerTags: null,
    workerCreatedAt: new Date(),
    jobPostedBy: 99,
    jobTitle: "Test Job",
    ...overrides,
  };
}

describe("jobs.getApplication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns application without phone when contactRevealed=false", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 }); // job owner
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(makeAppRow({ jobPostedBy: 99, contactRevealed: false }));
    const result = await caller.jobs.getApplication({ id: 10 });
    expect(result.workerPhone).toBeNull();
    expect(result.contactRevealed).toBe(false);
  });

  it("returns phone when contactRevealed=true", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(
      makeAppRow({ jobPostedBy: 99, contactRevealed: true, revealedAt: new Date() })
    );
    const result = await caller.jobs.getApplication({ id: 10 });
    expect(result.workerPhone).toBe("+972501234567");
  });

  it("throws FORBIDDEN for non-owner", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 42 }); // not the owner
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(makeAppRow({ jobPostedBy: 99 }));
    await expect(caller.jobs.getApplication({ id: 10 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when application does not exist", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(null);
    await expect(caller.jobs.getApplication({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("jobs.revealContact", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reveals contact and returns phone for job owner", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(makeAppRow({ jobPostedBy: 99 }));
    vi.mocked(db.revealApplicationContact).mockResolvedValue(undefined);
    const result = await caller.jobs.revealContact({ id: 10 });
    expect(result.success).toBe(true);
    expect(result.workerPhone).toBe("+972501234567");
    expect(db.revealApplicationContact).toHaveBeenCalledWith(10);
  });

  it("throws FORBIDDEN for non-owner", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 42 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(makeAppRow({ jobPostedBy: 99 }));
    await expect(caller.jobs.revealContact({ id: 10 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.revealApplicationContact).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when application does not exist", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(null);
    await expect(caller.jobs.revealContact({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("jobs.updateApplicationStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts application and returns phone for job owner", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(makeAppRow({ jobPostedBy: 99 }));
    vi.mocked(db.updateApplicationStatus).mockResolvedValue(undefined);
    const result = await caller.jobs.updateApplicationStatus({ id: 10, action: "accept" });
    expect(result.success).toBe(true);
    expect(result.workerPhone).toBe("+972501234567");
    expect(db.updateApplicationStatus).toHaveBeenCalledWith(10, "accept");
  });

  it("rejects application and returns null phone", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(makeAppRow({ jobPostedBy: 99 }));
    vi.mocked(db.updateApplicationStatus).mockResolvedValue(undefined);
    const result = await caller.jobs.updateApplicationStatus({ id: 10, action: "reject" });
    expect(result.success).toBe(true);
    expect(result.workerPhone).toBeNull();
    expect(db.updateApplicationStatus).toHaveBeenCalledWith(10, "reject");
  });

  it("throws FORBIDDEN for non-owner", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 42 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(makeAppRow({ jobPostedBy: 99 }));
    await expect(
      caller.jobs.updateApplicationStatus({ id: 10, action: "accept" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateApplicationStatus).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when application does not exist", async () => {
    const { appRouter } = await import("./routers");
    const user = makeUser({ id: 99 });
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    vi.mocked(db.getApplicationById).mockResolvedValue(null);
    await expect(
      caller.jobs.updateApplicationStatus({ id: 999, action: "accept" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const ctx = makeCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.jobs.updateApplicationStatus({ id: 10, action: "accept" })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});
