/**
 * Tests for the job details bottom sheet integration:
 * - getById procedure returns full job details including description, expiresAt, contactPhone
 * - checkApplied procedure works correctly for the bottom sheet apply flow
 * - applyToJob procedure works from the bottom sheet context
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
  getWorkerProfile: vi.fn(),
  updateWorkerProfile: vi.fn(),
  clearUserMode: vi.fn(),
  getWorkersMatchingJob: vi.fn().mockResolvedValue([]),
  getMyJobsWithPendingCounts: vi.fn().mockResolvedValue([]),
  getMyApplications: vi.fn().mockResolvedValue([]),
  getApplicationsForJobWithDistance: vi.fn().mockResolvedValue([]),
  getUnreadApplicationsCount: vi.fn().mockResolvedValue(0),
  savePushSubscription: vi.fn(),
  deletePushSubscriptionByEndpoint: vi.fn(),
  getNotificationPrefs: vi.fn().mockResolvedValue(null),
  updateNotificationPrefs: vi.fn(),
  markEmployerApplicationsViewed: vi.fn(),
  getCities: vi.fn().mockResolvedValue([]),
  getPhonePrefixes: vi.fn().mockResolvedValue([]),
  isValidPhonePrefix: vi.fn().mockResolvedValue(true),
  saveJob: vi.fn(),
  unsaveJob: vi.fn(),
  getSavedJobIds: vi.fn().mockResolvedValue([]),
  getSavedJobs: vi.fn().mockResolvedValue([]),
  updateUserPhone: vi.fn(),
  logPhoneChange: vi.fn(),
  countRecentPhoneChangeFailures: vi.fn().mockResolvedValue(0),
  rateWorker: vi.fn(),
  getExistingRating: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));
vi.mock("./sms", () => ({ sendJobAlerts: vi.fn() }));
vi.mock("./webPush", () => ({ sendPushToUser: vi.fn() }));
vi.mock("./_core/adminDb", () => ({
  adminApproveJob: vi.fn(),
  adminBlockUser: vi.fn(),
  adminCancelBatch: vi.fn(),
  adminGetPhoneChangeLockoutStatus: vi.fn(),
  adminClearPhoneChangeLockout: vi.fn(),
  adminClearJobReports: vi.fn(),
  adminDeleteJob: vi.fn(),
  adminGetAllApplications: vi.fn().mockResolvedValue([]),
  adminGetAllUsers: vi.fn().mockResolvedValue([]),
  adminGetAllJobs: vi.fn().mockResolvedValue([]),
  adminGetDashboardStats: vi.fn().mockResolvedValue({}),
  adminGetReportedJobs: vi.fn().mockResolvedValue([]),
  adminGetPendingJobs: vi.fn().mockResolvedValue([]),
  adminGetJobsByStatus: vi.fn().mockResolvedValue([]),
  adminGetUserById: vi.fn(),
  adminUpdateUserRole: vi.fn(),
  adminGetJobById: vi.fn(),
  adminGetApplicationById: vi.fn(),
  adminGetWorkersByCity: vi.fn().mockResolvedValue([]),
  adminGetJobsByCity: vi.fn().mockResolvedValue([]),
  adminGetJobsWithMostApplications: vi.fn().mockResolvedValue([]),
}));

import { appRouter } from "./routers";
import * as db from "./db";

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockJob = {
  id: 42,
  title: "מלצר/ית",
  category: "food",
  address: "רחוב הרצל 1, תל אביב",
  city: "תל אביב",
  salary: "50",
  salaryType: "hourly",
  contactPhone: "0501234567",
  showPhone: true,
  businessName: "מסעדת הים",
  startTime: "morning",
  startDateTime: null,
  isUrgent: false,
  workersNeeded: 2,
  createdAt: new Date("2026-03-01"),
  expiresAt: new Date("2026-03-31"),
  description: "דרוש מלצר/ית לעבודה בסופי שבוע",
  status: "active",
  postedBy: 1,
  isLocalBusiness: false,
};

function makeCtx(user: TrpcContext["user"] = null): TrpcContext {
  return { user } as TrpcContext;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Job Details Bottom Sheet — getById procedure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns full job details including description and expiresAt for authenticated users", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(mockJob as any);
    const caller = appRouter.createCaller(makeCtx({ id: 99, name: "עובד", role: "user" } as any));
    const result = await caller.jobs.getById({ id: 42 });
    expect(result.id).toBe(42);
    expect(result.description).toBe("דרוש מלצר/ית לעבודה בסופי שבוע");
    expect(result.contactPhone).toBe("0501234567");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("hides contactPhone for unauthenticated users", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(mockJob as any);
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.jobs.getById({ id: 42 });
    expect(result.contactPhone).toBeNull();
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(null as any);
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.jobs.getById({ id: 999 })).rejects.toThrow(TRPCError);
  });
});

describe("Job Details Bottom Sheet — checkApplied procedure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns applied=true when application exists", async () => {
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue({ id: 1 } as any);
    const caller = appRouter.createCaller(makeCtx({ id: 5, name: "עובד", role: "user" } as any));
    const result = await caller.jobs.checkApplied({ jobId: 42 });
    expect(result.applied).toBe(true);
  });

  it("returns applied=false when no application exists", async () => {
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue(null as any);
    const caller = appRouter.createCaller(makeCtx({ id: 5, name: "עובד", role: "user" } as any));
    const result = await caller.jobs.checkApplied({ jobId: 42 });
    expect(result.applied).toBe(false);
  });
});

describe("Job Details Bottom Sheet — applyToJob procedure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates application successfully when job is active and user not applied", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(mockJob as any);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue(null as any);
    vi.mocked(db.createApplication).mockResolvedValue({ id: 10 } as any);
    const caller = appRouter.createCaller(makeCtx({ id: 5, name: "עובד", role: "user" } as any));
    const result = await caller.jobs.applyToJob({ jobId: 42, origin: "https://avodanow.co.il" });
    expect(result.success).toBe(true);
    // createApplication is called with positional args: (workerId, jobId, message)
    expect(db.createApplication).toHaveBeenCalledWith(5, 42, undefined);
  });

  it("throws CONFLICT when user already applied", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(mockJob as any);
    vi.mocked(db.getApplicationByWorkerAndJob).mockResolvedValue({ id: 1 } as any);
    const caller = appRouter.createCaller(makeCtx({ id: 5, name: "עובד", role: "user" } as any));
    await expect(
      caller.jobs.applyToJob({ jobId: 42, origin: "https://avodanow.co.il" })
    ).rejects.toThrow(TRPCError);
  });

  it("throws UNAUTHORIZED when user is not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.jobs.applyToJob({ jobId: 42, origin: "https://avodanow.co.il" })
    ).rejects.toThrow(TRPCError);
  });
});
