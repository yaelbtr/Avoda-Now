/**
 * profile.minor.test.ts
 *
 * Verifies that the updateProfile procedure strips the "night" time slot
 * when the authenticated user is a minor (age 16–17), regardless of what
 * the client sends.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── DB mock ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  updateWorkerProfile: vi.fn().mockResolvedValue(undefined),
  getWorkerBirthDate: vi.fn(),
  // stubs for other imports used by routers.ts
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
    id: 42,
    openId: "test-minor",
    email: null,
    name: "Test Minor",
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

/** Returns a YYYY-MM-DD birthdate for a person exactly `years` old today */
function birthdateForAge(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("user.updateProfile — minor night-slot stripping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("strips 'night' from preferredTimeSlots when user is 16 (minor)", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(16));

    const caller = appRouter.createCaller(makeCtx());
    await caller.user.updateProfile({
      preferredTimeSlots: ["morning", "night", "evening"],
    });

    expect(db.updateWorkerProfile).toHaveBeenCalledOnce();
    const savedSlots = vi.mocked(db.updateWorkerProfile).mock.calls[0][1].preferredTimeSlots;
    expect(savedSlots).toEqual(["morning", "evening"]);
    expect(savedSlots).not.toContain("night");
  });

  it("strips 'night' from preferredTimeSlots when user is 17 (minor)", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(17));

    const caller = appRouter.createCaller(makeCtx());
    await caller.user.updateProfile({
      preferredTimeSlots: ["night"],
    });

    const savedSlots = vi.mocked(db.updateWorkerProfile).mock.calls[0][1].preferredTimeSlots;
    expect(savedSlots).toEqual([]);
  });

  it("keeps 'night' when user is 18 (adult)", async () => {
    vi.mocked(db.getWorkerBirthDate).mockResolvedValue(birthdateForAge(18));

    const caller = appRouter.createCaller(makeCtx());
    await caller.user.updateProfile({
      preferredTimeSlots: ["morning", "night"],
    });

    const savedSlots = vi.mocked(db.updateWorkerProfile).mock.calls[0][1].preferredTimeSlots;
    expect(savedSlots).toContain("night");
  });

  it("does not call getWorkerBirthDate when 'night' is not in the submitted slots", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.user.updateProfile({
      preferredTimeSlots: ["morning", "afternoon"],
    });

    // No need to check age if night was never submitted
    expect(db.getWorkerBirthDate).not.toHaveBeenCalled();
  });

  it("handles undefined preferredTimeSlots without error", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.user.updateProfile({ preferredTimeSlots: undefined })
    ).resolves.not.toThrow();

    expect(db.getWorkerBirthDate).not.toHaveBeenCalled();
  });
});
