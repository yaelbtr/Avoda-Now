import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Shared mock helpers ───────────────────────────────────────────────────────

function makeCtx(role: "user" | "admin" | null): TrpcContext {
  const user =
    role === null
      ? null
      : {
          id: role === "admin" ? 1 : 2,
          openId: role === "admin" ? "admin-open-id" : "user-open-id",
          phone: role === "admin" ? "+972501111111" : "+972502222222",
          name: role === "admin" ? "Admin User" : "Regular User",
          email: null,
          loginMethod: "phone",
          role,
          status: "active" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };

  return {
    user,
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Mock adminDb functions ────────────────────────────────────────────────────

vi.mock("./adminDb", () => ({
  adminGetStats: vi.fn().mockResolvedValue({
    totalJobs: 10,
    activeJobs: 7,
    underReviewJobs: 2,
    totalUsers: 5,
    totalReports: 3,
    newUsersToday: 1,
  }),
  adminGetAllJobs: vi.fn().mockResolvedValue([
    { id: 1, title: "Test Job", status: "active", reportCount: 0, category: "delivery", city: "Tel Aviv", contactName: "John", contactPhone: "+972501234567", createdAt: new Date() },
  ]),
  adminGetReportedJobs: vi.fn().mockResolvedValue([
    { id: 2, title: "Reported Job", status: "under_review", reportCount: 3, city: "Haifa", contactName: "Jane", createdAt: new Date() },
  ]),
  adminApproveJob: vi.fn().mockResolvedValue(undefined),
  adminRejectJob: vi.fn().mockResolvedValue(undefined),
  adminDeleteJob: vi.fn().mockResolvedValue(undefined),
  adminSetJobStatus: vi.fn().mockResolvedValue(undefined),
  adminGetAllReports: vi.fn().mockResolvedValue([
    { id: 1, jobId: 2, reporterPhone: "+972503333333", reason: "spam", createdAt: new Date(), jobTitle: "Reported Job", jobStatus: "under_review" },
  ]),
  adminClearJobReports: vi.fn().mockResolvedValue(undefined),
  adminGetAllUsers: vi.fn().mockResolvedValue([
    { id: 1, phone: "+972501111111", name: "Admin", role: "admin", status: "active", createdAt: new Date(), lastSignedIn: new Date() },
    { id: 2, phone: "+972502222222", name: "User", role: "user", status: "active", createdAt: new Date(), lastSignedIn: new Date() },
  ]),
  adminBlockUser: vi.fn().mockResolvedValue(undefined),
  adminUnblockUser: vi.fn().mockResolvedValue(undefined),
  adminSetUserRole: vi.fn().mockResolvedValue(undefined),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("admin RBAC — unauthenticated access", () => {
  it("blocks guest from admin.stats", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("blocks guest from admin.listJobs", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.admin.listJobs({})).rejects.toThrow();
  });

  it("blocks guest from admin.listUsers", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.admin.listUsers({})).rejects.toThrow();
  });
});

describe("admin RBAC — regular user access", () => {
  it("blocks regular user from admin.stats", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("blocks regular user from admin.approveJob", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.approveJob({ jobId: 1 })).rejects.toThrow();
  });

  it("blocks regular user from admin.blockUser", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.blockUser({ userId: 2 })).rejects.toThrow();
  });

  it("blocks regular user from admin.deleteJob", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.deleteJob({ jobId: 1 })).rejects.toThrow();
  });
});

describe("admin RBAC — admin user access", () => {
  it("allows admin to get stats", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const stats = await caller.admin.stats();
    expect(stats.totalJobs).toBe(10);
    expect(stats.activeJobs).toBe(7);
    expect(stats.underReviewJobs).toBe(2);
  });

  it("allows admin to list all jobs", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listJobs({});
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Test Job");
  });

  it("allows admin to list reported jobs", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.reportedJobs();
    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe("under_review");
  });

  it("allows admin to approve a job", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.approveJob({ jobId: 2 });
    expect(result.success).toBe(true);
  });

  it("allows admin to reject a job", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.rejectJob({ jobId: 2 });
    expect(result.success).toBe(true);
  });

  it("allows admin to delete a job", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.deleteJob({ jobId: 1 });
    expect(result.success).toBe(true);
  });

  it("allows admin to list all users", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listUsers({});
    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe("admin");
  });

  it("allows admin to block a user", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.blockUser({ userId: 2 });
    expect(result.success).toBe(true);
  });

  it("allows admin to unblock a user", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.unblockUser({ userId: 2 });
    expect(result.success).toBe(true);
  });

  it("allows admin to set user role", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.setUserRole({ userId: 2, role: "admin" });
    expect(result.success).toBe(true);
  });

  it("allows admin to list all reports", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listReports();
    expect(result).toHaveLength(1);
    expect(result[0]?.reason).toBe("spam");
  });

  it("allows admin to clear reports", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.clearReports({ jobId: 2 });
    expect(result.success).toBe(true);
  });
});
