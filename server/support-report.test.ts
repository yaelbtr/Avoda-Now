/**
 * Tests for support.reportProblem tRPC procedure
 * Covers: validation, rate-limiting, email dispatch, and success response.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock the email helper so no real SMTP calls are made ──────────────────────
vi.mock("./supportEmail", () => ({
  sendSupportReport: vi.fn().mockResolvedValue(undefined),
}));

// ── Minimal tRPC caller factory ───────────────────────────────────────────────
async function makeCaller(userOverride?: { id: number; phone: string; role: string } | null) {
  const { appRouter } = await import("./routers");
  return appRouter.createCaller({
    user: userOverride ?? null,
    req: {
      headers: { "x-forwarded-for": "1.2.3.4" },
      socket: { remoteAddress: "1.2.3.4" },
    } as unknown as import("express").Request,
    res: {} as unknown as import("express").Response,
  });
}

const BASE_INPUT = {
  message: "כפתור שליחה לא עובד",
  pageUrl: "https://avodanow.co.il/jobs",
  userAgent: "Mozilla/5.0",
  timestamp: new Date().toISOString(),
};

describe("support.reportProblem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the in-memory rate-limit store between tests by re-importing the module
    vi.resetModules();
  });

  it("returns { success: true } for a valid report", async () => {
    const caller = await makeCaller();
    const result = await caller.support.reportProblem(BASE_INPUT);
    expect(result).toEqual({ success: true });
  });

  it("calls sendSupportReport with correct payload", async () => {
    const { sendSupportReport } = await import("./supportEmail");
    const caller = await makeCaller({ id: 42, phone: "+972501234567", role: "user" });
    await caller.support.reportProblem({
      ...BASE_INPUT,
      subject: "בעיה בכפתור",
      phone: "0501234567",
      screenResolution: "1920x1080",
      screenshotBase64: "data:image/png;base64,abc123",
    });
    expect(sendSupportReport).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "42",
        message: "כפתור שליחה לא עובד",
        subject: "בעיה בכפתור",
        screenshotBase64: "data:image/png;base64,abc123",
      })
    );
  });

  it("throws BAD_REQUEST when message is empty", async () => {
    const caller = await makeCaller();
    await expect(
      caller.support.reportProblem({ ...BASE_INPUT, message: "" })
    ).rejects.toThrow();
  });

  it("throws BAD_REQUEST when message exceeds 5000 chars", async () => {
    const caller = await makeCaller();
    await expect(
      caller.support.reportProblem({ ...BASE_INPUT, message: "a".repeat(5001) })
    ).rejects.toThrow();
  });

  it("accepts report without optional fields", async () => {
    const caller = await makeCaller();
    const result = await caller.support.reportProblem({
      message: "בעיה כלשהי",
      pageUrl: "/",
      userAgent: "test-agent",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("uses user phone as fallback when phone not provided", async () => {
    const { sendSupportReport } = await import("./supportEmail");
    const caller = await makeCaller({ id: 7, phone: "+972509999999", role: "user" });
    await caller.support.reportProblem(BASE_INPUT);
    expect(sendSupportReport).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+972509999999" })
    );
  });

  it("passes null phone when user is not logged in and no phone provided", async () => {
    const { sendSupportReport } = await import("./supportEmail");
    const caller = await makeCaller(null);
    await caller.support.reportProblem(BASE_INPUT);
    expect(sendSupportReport).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null })
    );
  });

  it("passes null userId when user is not logged in", async () => {
    const { sendSupportReport } = await import("./supportEmail");
    const caller = await makeCaller(null);
    await caller.support.reportProblem(BASE_INPUT);
    expect(sendSupportReport).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null })
    );
  });

  it("throws TOO_MANY_REQUESTS after exceeding rate limit", async () => {
    // Re-import fresh module to get a clean rate-limit store
    const { appRouter } = await import("./routers");
    const ctx = {
      user: null,
      req: {
        headers: { "x-forwarded-for": "9.9.9.9" },
        socket: { remoteAddress: "9.9.9.9" },
      } as unknown as import("express").Request,
      res: {} as unknown as import("express").Response,
    };
    const caller = appRouter.createCaller(ctx);

    // Send 5 reports (the limit)
    for (let i = 0; i < 5; i++) {
      await caller.support.reportProblem(BASE_INPUT);
    }

    // 6th should be rate-limited
    await expect(
      caller.support.reportProblem(BASE_INPUT)
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("propagates INTERNAL_SERVER_ERROR when sendSupportReport throws", async () => {
    const { sendSupportReport } = await import("./supportEmail");
    (sendSupportReport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("SMTP connection refused")
    );
    const caller = await makeCaller();
    await expect(
      caller.support.reportProblem(BASE_INPUT)
    ).rejects.toThrow();
  });
});
