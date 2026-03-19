/**
 * forced.logout.test.ts
 *
 * Verifies:
 * 1. adminForceLogoutUser sets forcedLogoutAt on the target user row.
 * 2. adminClearForcedLogout nulls forcedLogoutAt.
 * 3. The admin.forceLogoutUser tRPC procedure is accessible only to admins
 *    and delegates to adminForceLogoutUser.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── DB / adminDb mocks ────────────────────────────────────────────────────────
vi.mock("./adminDb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./adminDb")>();
  return {
    ...actual,
    adminForceLogoutUser: vi.fn().mockResolvedValue(undefined),
    adminClearForcedLogout: vi.fn().mockResolvedValue(undefined),
    // stubs for other adminDb functions used by routers.ts
    adminGetStats: vi.fn().mockResolvedValue({}),
    adminGetAllJobs: vi.fn().mockResolvedValue([]),
    adminGetReportedJobs: vi.fn().mockResolvedValue([]),
    adminApproveJob: vi.fn().mockResolvedValue(undefined),
    adminRejectJob: vi.fn().mockResolvedValue(undefined),
    adminDeleteJob: vi.fn().mockResolvedValue(undefined),
    adminSetJobStatus: vi.fn().mockResolvedValue(undefined),
    adminGetAllReports: vi.fn().mockResolvedValue([]),
    adminClearReports: vi.fn().mockResolvedValue(undefined),
    adminListUsers: vi.fn().mockResolvedValue([]),
    adminBlockUser: vi.fn().mockResolvedValue(undefined),
    adminUnblockUser: vi.fn().mockResolvedValue(undefined),
    adminSetUserRole: vi.fn().mockResolvedValue(undefined),
    adminCreateUser: vi.fn().mockResolvedValue({ id: 1 }),
    adminUpdateUser: vi.fn().mockResolvedValue(undefined),
    adminDeleteUser: vi.fn().mockResolvedValue(undefined),
    adminGetAllApplications: vi.fn().mockResolvedValue([]),
    adminGetAllBatches: vi.fn().mockResolvedValue([]),
    adminGetBatchById: vi.fn().mockResolvedValue(null),
    adminGetPhoneChangeLogs: vi.fn().mockResolvedValue([]),
    adminClearPhoneChangeLockout: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./db", () => ({
  getUserByNormalizedPhone: vi.fn().mockResolvedValue(null),
  isValidPhonePrefix: vi.fn().mockResolvedValue(true),
  updateWorkerProfile: vi.fn().mockResolvedValue(undefined),
  getWorkerBirthDate: vi.fn().mockResolvedValue(null),
  associateWorkerWithRegion: vi.fn().mockResolvedValue(undefined),
  getWorkerRegions: vi.fn().mockResolvedValue([]),
  getCitiesByIds: vi.fn().mockResolvedValue([]),
  upsertWorkerRegionAssociations: vi.fn().mockResolvedValue(undefined),
}));

import * as adminDb from "./adminDb";

// ── Helpers ──────────────────────────────────────────────────────────────────
type AuthUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  const user: AuthUser = {
    id: 1,
    openId: "admin-openid",
    email: null,
    name: "Admin User",
    loginMethod: "phone_otp",
    role: "admin",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as AuthUser;
  return {
    user,
    req: { protocol: "https", headers: {}, socket: {} } as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("admin.forceLogoutUser procedure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls adminForceLogoutUser with the correct userId", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "admin" }));
    const result = await caller.admin.forceLogoutUser({ userId: 99 });

    expect(result).toEqual({ success: true });
    expect(adminDb.adminForceLogoutUser).toHaveBeenCalledOnce();
    expect(adminDb.adminForceLogoutUser).toHaveBeenCalledWith(99);
  });

  it("throws FORBIDDEN when called by a non-admin user", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "user" }));
    await expect(
      caller.admin.forceLogoutUser({ userId: 99 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(adminDb.adminForceLogoutUser).not.toHaveBeenCalled();
  });
});

describe("admin.clearForcedLogout procedure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls adminClearForcedLogout with the correct userId", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "admin" }));
    const result = await caller.admin.clearForcedLogout({ userId: 55 });

    expect(result).toEqual({ success: true });
    expect(adminDb.adminClearForcedLogout).toHaveBeenCalledOnce();
    expect(adminDb.adminClearForcedLogout).toHaveBeenCalledWith(55);
  });

  it("throws FORBIDDEN when called by a non-admin user", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "user" }));
    await expect(
      caller.admin.clearForcedLogout({ userId: 55 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(adminDb.adminClearForcedLogout).not.toHaveBeenCalled();
  });
});
