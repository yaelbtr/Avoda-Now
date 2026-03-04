import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  checkAndIncrementSendRate: vi.fn(),
  checkAndIncrementVerifyAttempts: vi.fn(),
  resetRateLimit: vi.fn(),
  getUserByPhone: vi.fn(),
  createUserByPhone: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
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
}));

// ─── Mock SMS provider ────────────────────────────────────────────────────────
vi.mock("./smsProvider", () => ({
  smsProvider: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
  },
  normalizeIsraeliPhone: vi.fn((raw: string) => {
    const digits = raw.replace(/[\s\-().+]/g, "");
    if (digits.startsWith("0") && digits.length === 10) return `+972${digits.slice(1)}`;
    if (digits.startsWith("972") && digits.length === 12) return `+${digits}`;
    throw new Error("מספר טלפון לא תקין");
  }),
  isValidIsraeliPhone: vi.fn((e164: string) => /^\+9725\d{8}$/.test(e164)),
}));

import * as db from "./db";
import { smsProvider, normalizeIsraeliPhone, isValidIsraeliPhone } from "./smsProvider";

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { "x-forwarded-for": "1.2.3.4" },
      socket: {},
    } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const mockUser = {
  id: 42,
  openId: "phone_+972501234567_123",
  phone: "+972501234567",
  name: "ישראל",
  email: null,
  loginMethod: "phone_otp",
  role: "user" as const,
  status: "active" as const,
  workerTags: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// ─── Phone normalization ──────────────────────────────────────────────────────
describe("normalizeIsraeliPhone", () => {
  it("normalizes 05X-XXXXXXX format", () => {
    expect(normalizeIsraeliPhone("050-1234567")).toBe("+972501234567");
  });

  it("normalizes 05XXXXXXXX format", () => {
    expect(normalizeIsraeliPhone("0501234567")).toBe("+972501234567");
  });

  it("passes through +972 format", () => {
    expect(normalizeIsraeliPhone("+972501234567")).toBe("+972501234567");
  });

  it("throws for invalid numbers", () => {
    expect(() => normalizeIsraeliPhone("123")).toThrow();
  });
});

describe("isValidIsraeliPhone", () => {
  it("accepts valid Israeli mobile", () => {
    expect(isValidIsraeliPhone("+972501234567")).toBe(true);
  });

  it("rejects landline", () => {
    expect(isValidIsraeliPhone("+97231234567")).toBe(false);
  });
});

// ─── auth.sendOtp ─────────────────────────────────────────────────────────────
describe("auth.sendOtp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends OTP successfully and returns normalized phone", async () => {
    vi.mocked(db.checkAndIncrementSendRate).mockResolvedValue(true);
    vi.mocked(smsProvider.sendOtp).mockResolvedValue({ success: true });

    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.sendOtp({ phone: "0501234567" });

    expect(result.success).toBe(true);
    expect(result.phone).toBe("+972501234567");
    expect(smsProvider.sendOtp).toHaveBeenCalledWith("+972501234567");
  });

  it("throws TOO_MANY_REQUESTS when rate limit exceeded", async () => {
    vi.mocked(db.checkAndIncrementSendRate).mockResolvedValue(false);

    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.sendOtp({ phone: "0501234567" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(smsProvider.sendOtp).not.toHaveBeenCalled();
  });

  it("throws INTERNAL_SERVER_ERROR when Twilio fails", async () => {
    vi.mocked(db.checkAndIncrementSendRate).mockResolvedValue(true);
    vi.mocked(smsProvider.sendOtp).mockResolvedValue({
      success: false,
      error: "לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות.",
    });

    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.sendOtp({ phone: "0501234567" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות.",
    });
  });

  it("throws BAD_REQUEST for invalid phone number", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.sendOtp({ phone: "123" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

// ─── auth.verifyOtp ───────────────────────────────────────────────────────────
describe("auth.verifyOtp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new user and sets session cookie on first login", async () => {
    vi.mocked(db.checkAndIncrementVerifyAttempts).mockResolvedValue(true);
    vi.mocked(smsProvider.verifyOtp).mockResolvedValue({ success: true, approved: true });
    vi.mocked(db.getUserByPhone).mockResolvedValue(undefined);
    vi.mocked(db.createUserByPhone).mockResolvedValue(mockUser);
    vi.mocked(db.resetRateLimit).mockResolvedValue(undefined);

    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.verifyOtp({ phone: "+972501234567", code: "123456" });

    expect(result.success).toBe(true);
    expect(result.user?.phone).toBe("+972501234567");
    expect(db.createUserByPhone).toHaveBeenCalledWith("+972501234567", undefined);
    expect((ctx.res as { cookie: ReturnType<typeof vi.fn> }).cookie).toHaveBeenCalledOnce();
  });

  it("logs in existing user and updates lastSignedIn", async () => {
    vi.mocked(db.checkAndIncrementVerifyAttempts).mockResolvedValue(true);
    vi.mocked(smsProvider.verifyOtp).mockResolvedValue({ success: true, approved: true });
    vi.mocked(db.getUserByPhone).mockResolvedValue(mockUser);
    vi.mocked(db.updateUserLastSignedIn).mockResolvedValue(undefined);
    vi.mocked(db.resetRateLimit).mockResolvedValue(undefined);

    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.verifyOtp({ phone: "+972501234567", code: "123456" });

    expect(result.success).toBe(true);
    expect(db.createUserByPhone).not.toHaveBeenCalled();
    expect(db.updateUserLastSignedIn).toHaveBeenCalledWith(42);
  });

  it("throws BAD_REQUEST when OTP is wrong", async () => {
    vi.mocked(db.checkAndIncrementVerifyAttempts).mockResolvedValue(true);
    vi.mocked(smsProvider.verifyOtp).mockResolvedValue({
      success: false,
      approved: false,
      error: "קוד האימות שגוי.",
    });

    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.verifyOtp({ phone: "+972501234567", code: "000000" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "קוד האימות שגוי." });
  });

  it("throws TOO_MANY_REQUESTS when verify attempts exceeded", async () => {
    vi.mocked(db.checkAndIncrementVerifyAttempts).mockResolvedValue(false);

    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.verifyOtp({ phone: "+972501234567", code: "123456" })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(smsProvider.verifyOtp).not.toHaveBeenCalled();
  });

  it("resets rate limit after successful verification", async () => {
    vi.mocked(db.checkAndIncrementVerifyAttempts).mockResolvedValue(true);
    vi.mocked(smsProvider.verifyOtp).mockResolvedValue({ success: true, approved: true });
    vi.mocked(db.getUserByPhone).mockResolvedValue(mockUser);
    vi.mocked(db.updateUserLastSignedIn).mockResolvedValue(undefined);
    vi.mocked(db.resetRateLimit).mockResolvedValue(undefined);

    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.verifyOtp({ phone: "+972501234567", code: "123456" });

    expect(db.resetRateLimit).toHaveBeenCalledWith("+972501234567");
  });
});
