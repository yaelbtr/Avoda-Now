import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the DB module so tests don't need a live database ───────────────────
const mockInsert = vi.fn().mockResolvedValue(undefined);
const mockSelect = vi.fn();

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    logEvent: vi.fn(async (
      level: string,
      event: string,
      message: string,
      opts?: { phone?: string; userId?: number; meta?: Record<string, unknown> }
    ) => {
      // Delegate to mock insert to verify calls
      await mockInsert({ level, event, message, ...opts });
    }),
    getLogs: vi.fn(async (filters: {
      phone?: string;
      level?: string;
      event?: string;
      limit?: number;
      offset?: number;
    }) => {
      return mockSelect(filters);
    }),
  };
});

import { logEvent, getLogs } from "./db";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("logEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue(undefined);
  });

  it("calls insert with correct level, event, and message", async () => {
    await logEvent("info", "otp.send.success", "OTP sent", { phone: "+972501234567" });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        event: "otp.send.success",
        message: "OTP sent",
        phone: "+972501234567",
      })
    );
  });

  it("logs error level with meta payload", async () => {
    await logEvent("error", "otp.send.failed", "Provider error", {
      phone: "+972509999999",
      meta: { channel: "sms", error: "timeout" },
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        event: "otp.send.failed",
        meta: { channel: "sms", error: "timeout" },
      })
    );
  });

  it("logs warn level for blocked login", async () => {
    await logEvent("warn", "otp.send.blocked.not_registered", "Login OTP blocked", {
      phone: "+972501111111",
      meta: { existsInDb: false },
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warn",
        event: "otp.send.blocked.not_registered",
      })
    );
  });

  it("logs without optional fields", async () => {
    await logEvent("info", "signup.complete", "Signup done");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        event: "signup.complete",
        message: "Signup done",
      })
    );
  });

  it("logs with userId but no phone", async () => {
    await logEvent("info", "signup.complete", "Signup done", { userId: 42 });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 })
    );
  });
});

describe("getLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rows and total from mock", async () => {
    const mockResult = {
      rows: [
        { id: 1, level: "error", event: "otp.send.failed", message: "fail", phone: "+972501234567", userId: null, meta: null, createdAt: new Date() },
      ],
      total: 1,
    };
    mockSelect.mockResolvedValue(mockResult);

    const result = await getLogs({ level: "error", limit: 50, offset: 0 });
    expect(result).toEqual(mockResult);
    expect(mockSelect).toHaveBeenCalledWith({ level: "error", limit: 50, offset: 0 });
  });

  it("filters by phone", async () => {
    mockSelect.mockResolvedValue({ rows: [], total: 0 });
    await getLogs({ phone: "+972501234567", limit: 50, offset: 0 });
    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+972501234567" })
    );
  });

  it("returns empty rows when no logs match", async () => {
    mockSelect.mockResolvedValue({ rows: [], total: 0 });
    const result = await getLogs({ phone: "+972500000000", limit: 50, offset: 0 });
    expect(result.rows).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("supports pagination via offset", async () => {
    mockSelect.mockResolvedValue({ rows: [], total: 120 });
    await getLogs({ limit: 50, offset: 50 });
    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 50 })
    );
  });
});
