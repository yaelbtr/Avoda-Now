/**
 * Tests for notification log tRPC procedures.
 * Verifies that admin procedures exist and are accessible only to admins.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
          loginMethod: "phone" as const,
          role,
          status: "active" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
  return { user, req: {} as never, res: {} as never };
}

describe("admin notification tracking procedures", () => {
  it("admin.getJobsWithNotificationStats exists in the router", () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    expect(typeof caller.admin.getJobsWithNotificationStats).toBe("function");
  });

  it("admin.getNotificationLogsForJob exists in the router", () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    expect(typeof caller.admin.getNotificationLogsForJob).toBe("function");
  });

  it("admin.getNotificationBatchSummaryForJob exists in the router", () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    expect(typeof caller.admin.getNotificationBatchSummaryForJob).toBe("function");
  });

  it("non-admin user is forbidden from getJobsWithNotificationStats", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.getJobsWithNotificationStats()).rejects.toThrow();
  });

  it("guest is unauthorized from getJobsWithNotificationStats", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.admin.getJobsWithNotificationStats()).rejects.toThrow();
  });

  it("non-admin user is forbidden from getNotificationLogsForJob", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.getNotificationLogsForJob({ jobId: 1 })).rejects.toThrow();
  });

  it("non-admin user is forbidden from getNotificationBatchSummaryForJob", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.getNotificationBatchSummaryForJob({ jobId: 1 })).rejects.toThrow();
  });
});
