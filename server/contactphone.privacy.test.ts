/**
 * Security tests: contactPhone must NEVER be exposed to workers or unauthenticated users.
 * These tests verify that all job-listing procedures strip the phone field server-side.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const PHONE = "0501234567";

const mockJob = (id: number) => ({
  id,
  title: "Test Job",
  contactPhone: PHONE,
  category: "food",
  address: "Tel Aviv",
  city: "Tel Aviv",
  salary: "50",
  salaryType: "hourly",
  startTime: "morning",
  workersNeeded: 1,
  createdAt: new Date(),
  status: "active",
  isUrgent: false,
  expiresAt: null,
  businessName: null,
  startDateTime: null,
  description: null,
  postedBy: 1,
});

vi.mock("./db", () => ({
  getActiveJobs: vi.fn().mockResolvedValue([mockJob(1)]),
  getJobsNearLocation: vi.fn().mockResolvedValue([mockJob(2)]),
  getJobById: vi.fn().mockResolvedValue(mockJob(3)),
  getTodayJobs: vi.fn().mockResolvedValue([mockJob(4)]),
  getUrgentJobs: vi.fn().mockResolvedValue([{ ...mockJob(5), isUrgent: true }]),
  getSavedJobs: vi.fn().mockResolvedValue([{ ...mockJob(6), savedAt: new Date() }]),
  expireOldJobs: vi.fn().mockResolvedValue(undefined),
  countActiveJobsByUser: vi.fn().mockResolvedValue(0),
  getMyJobs: vi.fn().mockResolvedValue([]),
  getMyJobsWithPendingCounts: vi.fn().mockResolvedValue([]),
  getMyApplications: vi.fn().mockResolvedValue([]),
  getUnreadApplicationsCount: vi.fn().mockResolvedValue(0),
  getSavedJobIds: vi.fn().mockResolvedValue([]),
  getNotificationPrefs: vi.fn().mockResolvedValue("none"),
  createApplication: vi.fn().mockResolvedValue({ id: 1 }),
  getApplicationByWorkerAndJob: vi.fn().mockResolvedValue(null),
}));

function makeCtx(user: { id: number; role: string; phone?: string | null } | null = null) {
  return { user } as any;
}

describe("contactPhone privacy — server-side stripping", () => {
  describe("jobs.list", () => {
    it("strips contactPhone for unauthenticated users", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx(null));
      const jobs = await caller.jobs.list({});
      expect(jobs[0].contactPhone).toBeNull();
    });

    it("strips contactPhone for authenticated workers", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
      const jobs = await caller.jobs.list({});
      expect(jobs[0].contactPhone).toBeNull();
    });
  });

  describe("jobs.search", () => {
    it("strips contactPhone for authenticated workers", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
      const jobs = await caller.jobs.search({ lat: 32.0, lng: 34.8 });
      expect(jobs[0].contactPhone).toBeNull();
    });

    it("strips contactPhone for unauthenticated users", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx(null));
      const jobs = await caller.jobs.search({ lat: 32.0, lng: 34.8 });
      expect(jobs[0].contactPhone).toBeNull();
    });
  });

  describe("jobs.getById", () => {
    it("strips contactPhone for authenticated workers", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
      const job = await caller.jobs.getById({ id: 3 });
      expect(job.contactPhone).toBeNull();
    });

    it("strips contactPhone for unauthenticated users", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx(null));
      const job = await caller.jobs.getById({ id: 3 });
      expect(job.contactPhone).toBeNull();
    });
  });

  describe("jobs.listToday", () => {
    it("strips contactPhone for authenticated workers", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
      const jobs = await caller.jobs.listToday({});
      expect(jobs[0].contactPhone).toBeNull();
    });

    it("strips contactPhone for unauthenticated users", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx(null));
      const jobs = await caller.jobs.listToday({});
      expect(jobs[0].contactPhone).toBeNull();
    });
  });

  describe("jobs.listUrgent", () => {
    it("strips contactPhone for authenticated workers", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
      const jobs = await caller.jobs.listUrgent({});
      expect(jobs[0].contactPhone).toBeNull();
    });

    it("strips contactPhone for unauthenticated users", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx(null));
      const jobs = await caller.jobs.listUrgent({});
      expect(jobs[0].contactPhone).toBeNull();
    });
  });

  describe("savedJobs.getSavedJobs", () => {
    it("strips contactPhone from saved jobs for authenticated workers", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
      const jobs = await caller.savedJobs.getSavedJobs();
      expect(jobs[0].contactPhone).toBeNull();
    });
  });
});
