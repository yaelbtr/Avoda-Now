/**
 * minor.guard.test.ts
 *
 * Tests for:
 *   1. assertMinorEligible (unit) — all four rules
 *   2. applyToJob integration — guard called, minAge check still works
 *   3. updateApplicationStatus "accept" integration — guard called for worker
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertMinorEligible } from "./minorGuard";
import type { TrpcContext } from "./_core/context";

// ── Shared DB mock ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  // minorGuard deps
  getWorkerBirthDate: vi.fn(),
  getCategoryBySlug: vi.fn(),
  // applyToJob deps
  getJobById: vi.fn(),
  getApplicationByWorkerAndJob: vi.fn().mockResolvedValue(null),
  createApplication: vi.fn().mockResolvedValue(undefined),
  getNotificationPrefs: vi.fn().mockResolvedValue("both"),
  // updateApplicationStatus deps
  getApplicationById: vi.fn(),
  updateApplicationStatus: vi.fn().mockResolvedValue(undefined),
  // profile update deps (used by other routers loaded in the same bundle)
  updateWorkerProfile: vi.fn().mockResolvedValue(undefined),
  getUserByNormalizedPhone: vi.fn().mockResolvedValue(null),
  isValidPhonePrefix: vi.fn().mockResolvedValue(true),
  associateWorkerWithRegion: vi.fn().mockResolvedValue(undefined),
  getWorkerRegions: vi.fn().mockResolvedValue([]),
  getCitiesByIds: vi.fn().mockResolvedValue([]),
  upsertWorkerRegionAssociations: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";

// ── Helpers ──────────────────────────────────────────────────────────────────
type AuthUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  const user: AuthUser = {
    id: 1,
    openId: "test-user",
    email: null,
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

function birthdateForAge(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

// ── 1. assertMinorEligible unit tests ────────────────────────────────────────
describe("assertMinorEligible", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws PRECONDITION_FAILED when birthDate is null (no birth date declared)", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(null);
    await expect(
      assertMinorEligible(1, { category: "cleaning", workEndTime: "18:00" })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("throws FORBIDDEN when worker is under 16", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(15));
    await expect(
      assertMinorEligible(1, { category: "cleaning", workEndTime: "18:00" })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: expect.stringContaining("16") });
  });

  it("throws FORBIDDEN when minor (age 16) applies to a category not allowed for minors", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(16));
    vi.mocked(db.getCategoryBySlug).mockResolvedValue({
      id: 99, slug: "security", name: "אבטחה", allowedForMinors: false,
      icon: null, groupName: null, imageUrl: null, isActive: true, sortOrder: 0,
    } as any);
    await expect(
      assertMinorEligible(1, { category: "security", workEndTime: "18:00" })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: expect.stringContaining("אבטחה") });
  });

  it("throws FORBIDDEN when minor (age 17) applies to a job ending after 22:00", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(17));
    vi.mocked(db.getCategoryBySlug).mockResolvedValue({
      id: 1, slug: "cleaning", name: "ניקיון", allowedForMinors: true,
      icon: null, groupName: null, imageUrl: null, isActive: true, sortOrder: 0,
    } as any);
    await expect(
      assertMinorEligible(1, { category: "cleaning", workEndTime: "23:00" })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: expect.stringContaining("22:00") });
  });

  it("passes for a minor (age 16) in an allowed category with early end time", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(16));
    vi.mocked(db.getCategoryBySlug).mockResolvedValue({
      id: 1, slug: "cleaning", name: "ניקיון", allowedForMinors: true,
      icon: null, groupName: null, imageUrl: null, isActive: true, sortOrder: 0,
    } as any);
    await expect(
      assertMinorEligible(1, { category: "cleaning", workEndTime: "20:00" })
    ).resolves.toBeUndefined();
  });

  it("passes for an adult (age 18) even in a restricted category with late hours", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(18));
    // getCategoryBySlug should NOT be called for adults
    await expect(
      assertMinorEligible(1, { category: "security", workEndTime: "23:00" })
    ).resolves.toBeUndefined();
    expect(db.getCategoryBySlug).not.toHaveBeenCalled();
  });

  it("does not call getCategoryBySlug for adults (performance guard)", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(25));
    await assertMinorEligible(1, { category: "security", workEndTime: "23:00" });
    expect(db.getCategoryBySlug).not.toHaveBeenCalled();
  });
});

// ── 2. applyToJob integration ─────────────────────────────────────────────────
import { appRouter } from "./routers";

describe("applyToJob — minor guard integration", () => {
  beforeEach(() => vi.clearAllMocks());

  const activeJob = {
    id: 10, title: "Test Job", status: "active", category: "security",
    workEndTime: "18:00", minAge: 16, postedBy: 99, contactPhone: null,
  };

  it("blocks a minor applying to a restricted category", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(activeJob as any);
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(16));
    vi.mocked(db.getCategoryBySlug).mockResolvedValue({
      id: 99, slug: "security", name: "אבטחה", allowedForMinors: false,
      icon: null, groupName: null, imageUrl: null, isActive: true, sortOrder: 0,
    } as any);

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    await expect(caller.jobs.applyToJob({ jobId: 10 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("אבטחה"),
    });
    expect(db.createApplication).not.toHaveBeenCalled();
  });

  it("allows an adult applying to a restricted category", async () => {
    vi.mocked(db.getJobById).mockResolvedValue(activeJob as any);
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(25));
    vi.mocked(db.getCategoryBySlug).mockResolvedValue(null); // not called for adults

    const caller = appRouter.createCaller(makeCtx({ id: 1 }));
    await expect(caller.jobs.applyToJob({ jobId: 10 })).resolves.toBeDefined();
    expect(db.createApplication).toHaveBeenCalledOnce();
  });
});

// ── 3. updateApplicationStatus "accept" integration ──────────────────────────
describe("updateApplicationStatus accept — minor guard integration", () => {
  beforeEach(() => vi.clearAllMocks());

  const baseApp = {
    id: 5, jobId: 10, workerId: 2, status: "pending",
    jobPostedBy: 99, jobTitle: "Test Job",
    jobCategory: "security", jobWorkEndTime: "18:00",
    workerPhone: "+972500000000",
    message: null, contactRevealed: false, revealedAt: null, createdAt: new Date(),
    workerName: "Test Worker", workerBio: null, workerPreferredCity: null,
    workerPreferredCategories: null, workerTags: null, workerCreatedAt: new Date(),
  };

  it("blocks employer from accepting a minor into a restricted category", async () => {
    vi.mocked(db.getApplicationById).mockResolvedValue(baseApp as any);
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(16));
    vi.mocked(db.getCategoryBySlug).mockResolvedValue({
      id: 99, slug: "security", name: "אבטחה", allowedForMinors: false,
      icon: null, groupName: null, imageUrl: null, isActive: true, sortOrder: 0,
    } as any);

    const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
    await expect(
      caller.jobs.updateApplicationStatus({ id: 5, action: "accept" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateApplicationStatus).not.toHaveBeenCalled();
  });

  it("allows employer to reject a minor in a restricted category (guard skipped on reject)", async () => {
    vi.mocked(db.getApplicationById).mockResolvedValue(baseApp as any);

    const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
    await expect(
      caller.jobs.updateApplicationStatus({ id: 5, action: "reject" })
    ).resolves.toMatchObject({ success: true });
    // Guard should NOT have been called for reject
    expect(db.getWorkerBirthDate).not.toHaveBeenCalled();
    expect(db.updateApplicationStatus).toHaveBeenCalledOnce();
  });

  it("allows employer to accept an adult worker into a restricted category", async () => {
    vi.mocked(db.getApplicationById).mockResolvedValue(baseApp as any);
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(25));

    const caller = appRouter.createCaller(makeCtx({ id: 99, role: "user" }));
    await expect(
      caller.jobs.updateApplicationStatus({ id: 5, action: "accept" })
    ).resolves.toMatchObject({ success: true });
    expect(db.updateApplicationStatus).toHaveBeenCalledOnce();
  });
});
