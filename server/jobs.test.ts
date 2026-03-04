import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock all DB helpers
vi.mock("./db", () => ({
  countActiveJobsByUser: vi.fn(),
  createJob: vi.fn(),
  getJobById: vi.fn(),
  getActiveJobs: vi.fn(),
  getJobsNearLocation: vi.fn(),
  getMyJobs: vi.fn(),
  updateJobStatus: vi.fn(),
  deleteJob: vi.fn(),
  updateJob: vi.fn(),
  reportJob: vi.fn(),
  createOtp: vi.fn(),
  getValidOtp: vi.fn(),
  markOtpUsed: vi.fn(),
  getUserByPhone: vi.fn(),
  createUserByPhone: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
}));

import * as db from "./db";

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

describe("jobs.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a job when under the 3-job limit", async () => {
    vi.mocked(db.countActiveJobsByUser).mockResolvedValue(0);
    vi.mocked(db.createJob).mockResolvedValue({ id: 42, ...baseJobInput } as never);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jobs.create(baseJobInput);
    expect(result).toMatchObject({ id: 42 });
    expect(db.createJob).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when user has 3 active jobs", async () => {
    vi.mocked(db.countActiveJobsByUser).mockResolvedValue(3);

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.jobs.create(baseJobInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.createJob).not.toHaveBeenCalled();
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
