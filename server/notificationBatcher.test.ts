/**
 * Tests for the batched application notification system.
 *
 * Strategy:
 *  - Mock `./db` (getPendingBatchForJob, createNotificationBatch, incrementBatchCount, markBatchSent)
 *  - Mock `./sms` (sendSms)
 *  - Use fake timers to control setTimeout without waiting real time
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock db helpers ───────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getPendingBatchForJob: vi.fn(),
  createNotificationBatch: vi.fn(),
  incrementBatchCount: vi.fn(),
  markBatchSent: vi.fn(),
}));

// ── Mock SMS sender ───────────────────────────────────────────────────────────
vi.mock("./sms", () => ({
  sendSms: vi.fn().mockResolvedValue({ success: true, sid: "SM_test" }),
}));

import * as db from "./db";
import * as smsModule from "./sms";
import {
  recordApplicationAndNotify,
  clearAllBatchTimers,
  BATCH_THRESHOLD,
  BATCH_WINDOW_MS,
} from "./notificationBatcher";

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeBatch = (overrides: Partial<{
  id: number; jobId: number; employerPhone: string;
  pendingCount: number; status: string; scheduledAt: Date; sentAt: Date | null;
  createdAt: Date; updatedAt: Date;
}> = {}) => ({
  id: 1,
  jobId: 42,
  employerPhone: "+972501234567",
  pendingCount: 1,
  status: "pending",
  scheduledAt: new Date(Date.now() + BATCH_WINDOW_MS),
  sentAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  clearAllBatchTimers();
});

afterEach(() => {
  clearAllBatchTimers();
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("recordApplicationAndNotify", () => {
  it("creates a new batch when no pending batch exists", async () => {
    vi.mocked(db.getPendingBatchForJob).mockResolvedValue(null);
    vi.mocked(db.createNotificationBatch).mockResolvedValue(makeBatch({ pendingCount: 1 }));

    await recordApplicationAndNotify(42, "+972501234567", BATCH_WINDOW_MS, BATCH_THRESHOLD);

    expect(db.createNotificationBatch).toHaveBeenCalledWith(42, "+972501234567", BATCH_WINDOW_MS);
    expect(db.incrementBatchCount).not.toHaveBeenCalled();
    // SMS not sent yet — window hasn't elapsed
    expect(smsModule.sendSms).not.toHaveBeenCalled();
  });

  it("increments count when a pending batch already exists", async () => {
    vi.mocked(db.getPendingBatchForJob).mockResolvedValue(makeBatch({ pendingCount: 1 }));
    vi.mocked(db.incrementBatchCount).mockResolvedValue(makeBatch({ pendingCount: 2 }));

    await recordApplicationAndNotify(42, "+972501234567", BATCH_WINDOW_MS, BATCH_THRESHOLD);

    expect(db.createNotificationBatch).not.toHaveBeenCalled();
    expect(db.incrementBatchCount).toHaveBeenCalledWith(1);
    // Count is 2, threshold is 3 — no immediate flush
    expect(db.markBatchSent).not.toHaveBeenCalled();
    expect(smsModule.sendSms).not.toHaveBeenCalled();
  });

  it("flushes immediately when threshold is reached", async () => {
    vi.mocked(db.getPendingBatchForJob).mockResolvedValue(makeBatch({ pendingCount: 2 }));
    vi.mocked(db.incrementBatchCount).mockResolvedValue(makeBatch({ pendingCount: 3 }));
    vi.mocked(db.markBatchSent).mockResolvedValue(undefined);

    await recordApplicationAndNotify(42, "+972501234567", BATCH_WINDOW_MS, BATCH_THRESHOLD);

    expect(db.markBatchSent).toHaveBeenCalledWith(1);
    expect(smsModule.sendSms).toHaveBeenCalledWith(
      "+972501234567",
      expect.stringContaining("3 עובדים חדשים")
    );
    expect(smsModule.sendSms).toHaveBeenCalledWith(
      "+972501234567",
      expect.stringContaining("/jobs/42/applications")
    );
  });

  it("flushes after the window timer elapses", async () => {
    vi.mocked(db.getPendingBatchForJob).mockResolvedValue(null);
    const batch = makeBatch({ pendingCount: 1 });
    vi.mocked(db.createNotificationBatch).mockResolvedValue(batch);
    vi.mocked(db.markBatchSent).mockResolvedValue(undefined);

    const shortWindow = 500; // 500 ms for test speed
    await recordApplicationAndNotify(42, "+972501234567", shortWindow, BATCH_THRESHOLD);

    // SMS not sent yet
    expect(smsModule.sendSms).not.toHaveBeenCalled();

    // Advance fake timers past the window
    await vi.runAllTimersAsync();

    expect(db.markBatchSent).toHaveBeenCalledWith(batch.id);
    expect(smsModule.sendSms).toHaveBeenCalledWith(
      "+972501234567",
      expect.stringContaining("עובד חדש הגיש מועמדות")
    );
  });

  it("does not double-send if timer fires after threshold flush", async () => {
    // First call: creates batch
    vi.mocked(db.getPendingBatchForJob).mockResolvedValueOnce(null);
    const batch = makeBatch({ pendingCount: 1 });
    vi.mocked(db.createNotificationBatch).mockResolvedValue(batch);
    vi.mocked(db.markBatchSent).mockResolvedValue(undefined);

    const shortWindow = 500;
    await recordApplicationAndNotify(42, "+972501234567", shortWindow, 2);

    // Second call: increments to threshold → immediate flush
    vi.mocked(db.getPendingBatchForJob).mockResolvedValueOnce(batch);
    vi.mocked(db.incrementBatchCount).mockResolvedValue(makeBatch({ pendingCount: 2 }));
    await recordApplicationAndNotify(42, "+972501234567", shortWindow, 2);

    expect(smsModule.sendSms).toHaveBeenCalledTimes(1); // flushed once

    // Timer fires — but batch is already cancelled (timer was cleared)
    await vi.runAllTimersAsync();

    // Still only one SMS
    expect(smsModule.sendSms).toHaveBeenCalledTimes(1);
  });

  it("handles DB unavailable gracefully (no throw)", async () => {
    vi.mocked(db.getPendingBatchForJob).mockRejectedValue(new Error("DB down"));

    // Should not throw
    await expect(
      recordApplicationAndNotify(42, "+972501234567")
    ).resolves.toBeUndefined();
  });

  it("uses singular form for exactly 1 applicant in SMS body", async () => {
    vi.mocked(db.getPendingBatchForJob).mockResolvedValue(null);
    const batch = makeBatch({ pendingCount: 1 });
    vi.mocked(db.createNotificationBatch).mockResolvedValue(batch);
    vi.mocked(db.markBatchSent).mockResolvedValue(undefined);

    await recordApplicationAndNotify(42, "+972501234567", 100, BATCH_THRESHOLD);
    await vi.runAllTimersAsync();

    expect(smsModule.sendSms).toHaveBeenCalledWith(
      "+972501234567",
      expect.stringContaining("עובד חדש הגיש מועמדות")
    );
    // Should NOT contain the plural form
    const body = vi.mocked(smsModule.sendSms).mock.calls[0][1];
    expect(body).not.toContain("עובדים חדשים");
  });

  it("uses plural form for 2+ applicants in SMS body", async () => {
    vi.mocked(db.getPendingBatchForJob).mockResolvedValue(makeBatch({ pendingCount: 4 }));
    vi.mocked(db.incrementBatchCount).mockResolvedValue(makeBatch({ pendingCount: 5 }));
    vi.mocked(db.markBatchSent).mockResolvedValue(undefined);

    await recordApplicationAndNotify(42, "+972501234567", BATCH_WINDOW_MS, 5);

    expect(smsModule.sendSms).toHaveBeenCalledWith(
      "+972501234567",
      expect.stringContaining("5 עובדים חדשים")
    );
  });
});
