import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock sms module to prevent real SMS sends in tests
vi.mock("./sms", () => ({
  sendJobAlerts: vi.fn().mockResolvedValue(0),
  sendSms: vi.fn().mockResolvedValue(undefined),
}));

// Mock all DB helpers
vi.mock("./db", () => ({
  createJob: vi.fn(),
  getJobById: vi.fn(),
  getActiveJobs: vi.fn(),
  getJobsNearLocation: vi.fn(),
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
  // Regional activation system
  checkRegionActiveForJob: vi.fn().mockResolvedValue({ allowed: true }),
  findNearestRegion: vi.fn().mockResolvedValue(undefined),
  associateWorkerWithRegion: vi.fn().mockResolvedValue(undefined),
  // Application helpers
  getApplicationsForJob: vi.fn().mockResolvedValue([]),
  getApplicationsForJobWithDistance: vi.fn().mockResolvedValue([]),
  createJobOffer: vi.fn().mockResolvedValue(undefined),
  respondToJobOffer: vi.fn().mockResolvedValue(undefined),
  getApplicationByWorkerAndJob: vi.fn().mockResolvedValue(null),
  countActiveOffers: vi.fn().mockResolvedValue(0),
  getApplicationById: vi.fn().mockResolvedValue(null),
  getWorkerProfile: vi.fn().mockResolvedValue(null),
  markEmployerApplicationsViewed: vi.fn().mockResolvedValue(undefined),
  getUnreadApplicationsCount: vi.fn().mockResolvedValue(0),
  revealApplicationContact: vi.fn().mockResolvedValue(undefined),
  updateApplicationStatus: vi.fn().mockResolvedValue(undefined),
  getMyApplications: vi.fn().mockResolvedValue([]),
  createApplication: vi.fn().mockResolvedValue(undefined),
  withdrawApplication: vi.fn().mockResolvedValue(undefined),
  getWorkerBirthDate: vi.fn().mockResolvedValue(null),
  getWorkersMinorStatus: vi.fn().mockResolvedValue({}),
  // Candidate cap helpers — default to 0 accepted (cap not reached)
  countAcceptedCandidates: vi.fn().mockResolvedValue(0),
  autoCloseJobIfCapReached: vi.fn().mockResolvedValue(false),
}));

import * as db from "./db";

type AuthUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  const user: AuthUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    phone: "+972501234567",
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

describe("jobs.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a job successfully", async () => {
    vi.mocked(db.createJob).mockResolvedValue({ id: 42, ...baseJobInput } as never);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jobs.create(baseJobInput);
    expect(result).toMatchObject({ id: 42 });
    expect(db.createJob).toHaveBeenCalledOnce();
  });

  it("throws UNAUTHORIZED when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: {} } as TrpcContext["req"],
      res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.jobs.create(baseJobInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("jobs.report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports a job successfully", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 1, status: "active" } as never);
    vi.mocked(db.reportJob).mockResolvedValue(undefined);

    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: { "x-forwarded-for": "1.2.3.4" }, socket: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.jobs.report({ jobId: 1, reason: "ספאם" });
    expect(result).toEqual({ success: true });
    expect(db.reportJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 1, reason: "ספאם", reporterIp: "1.2.3.4" })
    );
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(undefined);

    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.jobs.report({ jobId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("jobs.updateStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows owner to close their own job", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 1, postedBy: 1, status: "active" } as never);
    vi.mocked(db.updateJobStatus).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    const result = await caller.jobs.updateStatus({ id: 1, status: "closed" });
    expect(result).toEqual({ success: true });
  });

  it("throws FORBIDDEN when non-owner tries to close a job", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 1, postedBy: 99, status: "active" } as never);

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    await expect(caller.jobs.updateStatus({ id: 1, status: "closed" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect((ctx.res as { clearCookie: ReturnType<typeof vi.fn> }).clearCookie).toHaveBeenCalledOnce();
  });
});

describe("jobs.sendJobOffer — active offer limit", () => {
  beforeEach(() => vi.clearAllMocks());

  const offerInput = { jobId: 10, workerId: 20, origin: "https://avodanow.co.il" };

  it("sends offer successfully when active count is below limit", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 10, postedBy: 1, category: "delivery", title: "שליח" } as never);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue(null);
    vi.mocked(db.countActiveOffers).mockResolvedValue(3); // below MAX_ACTIVE_OFFERS=5
    vi.mocked(db.getWorkerProfile).mockResolvedValue({ id: 20, name: "עובד", phone: "+972501234567", notificationPrefs: "sms_only" } as never);
    vi.mocked(db.createJobOffer).mockResolvedValue({ id: 99 } as never);

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    const result = await caller.jobs.sendJobOffer(offerInput);
    expect(result).toEqual({ success: true, alreadyExists: false });
    expect(db.createJobOffer).toHaveBeenCalledWith(20, 10);
  });

  it("sends offer successfully when active count equals limit minus 1 (boundary)", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 10, postedBy: 1, category: "delivery", title: "שליח" } as never);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue(null);
    vi.mocked(db.countActiveOffers).mockResolvedValue(4); // exactly MAX_ACTIVE_OFFERS - 1
    vi.mocked(db.getWorkerProfile).mockResolvedValue({ id: 20, name: "עובד", phone: "+972501234567", notificationPrefs: "push_only" } as never);
    vi.mocked(db.createJobOffer).mockResolvedValue({ id: 100 } as never);

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    const result = await caller.jobs.sendJobOffer(offerInput);
    expect(result).toEqual({ success: true, alreadyExists: false });
  });

  it("throws BAD_REQUEST when active offer count equals MAX_ACTIVE_OFFERS", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 10, postedBy: 1, category: "delivery", title: "שליח" } as never);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue(null);
    vi.mocked(db.countActiveOffers).mockResolvedValue(5); // exactly at limit

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    await expect(caller.jobs.sendJobOffer(offerInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(db.createJobOffer).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when active offer count exceeds MAX_ACTIVE_OFFERS", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 10, postedBy: 1, category: "delivery", title: "שליח" } as never);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue(null);
    vi.mocked(db.countActiveOffers).mockResolvedValue(7); // over limit

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    await expect(caller.jobs.sendJobOffer(offerInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(db.createJobOffer).not.toHaveBeenCalled();
  });

  it("returns alreadyExists=true without checking limit when duplicate offer exists", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 10, postedBy: 1, category: "delivery", title: "שליח" } as never);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue({ id: 55, status: "offered" } as never);
    // countActiveOffers should NOT be called since we short-circuit on duplicate

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    const result = await caller.jobs.sendJobOffer(offerInput);
    expect(result).toEqual({ success: true, alreadyExists: true });
    expect(db.countActiveOffers).not.toHaveBeenCalled();
    expect(db.createJobOffer).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN when non-owner tries to send offer", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ id: 10, postedBy: 99, category: "delivery", title: "שליח" } as never);

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    await expect(caller.jobs.sendJobOffer(offerInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.countActiveOffers).not.toHaveBeenCalled();
  });
});
