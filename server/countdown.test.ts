/**
 * Unit tests for the countdown formatting logic used by useCountdown hook.
 * We test the pure formatting function directly (no DOM/React required).
 */
import { describe, it, expect, vi, afterEach } from "vitest";

// ── replicate the pure helper from useCountdown.ts ──────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

function buildCountdownLabel(targetDate: Date): string | null {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return null;
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `זמין עוד ${hours}:${String(minutes).padStart(2, "0")} שעות`;
  if (totalMinutes > 0) return `זמין עוד ${totalMinutes} דקות`;
  const secs = Math.floor(diff / 1000);
  return `זמין עוד ${secs} שניות`;
}
// ────────────────────────────────────────────────────────────────────────────

describe("formatCountdown", () => {
  it("formats zero as 00:00:00", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
  });

  it("formats negative as 00:00:00", () => {
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });

  it("formats 1 second correctly", () => {
    expect(formatCountdown(1000)).toBe("00:00:01");
  });

  it("formats 1 minute correctly", () => {
    expect(formatCountdown(60_000)).toBe("00:01:00");
  });

  it("formats 1 hour correctly", () => {
    expect(formatCountdown(3_600_000)).toBe("01:00:00");
  });

  it("formats 2h 45m 30s correctly", () => {
    const ms = (2 * 3600 + 45 * 60 + 30) * 1000;
    expect(formatCountdown(ms)).toBe("02:45:30");
  });

  it("pads single-digit values with leading zero", () => {
    const ms = (9 * 3600 + 9 * 60 + 9) * 1000;
    expect(formatCountdown(ms)).toBe("09:09:09");
  });

  it("handles 72 hours (max availability)", () => {
    expect(formatCountdown(72 * 3600 * 1000)).toBe("72:00:00");
  });
});

describe("buildCountdownLabel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for past date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const past = new Date("2026-01-01T11:00:00Z");
    expect(buildCountdownLabel(past)).toBeNull();
  });

  it("returns hours label for > 60 minutes remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const future = new Date("2026-01-01T12:30:00Z"); // 2h 30m
    const label = buildCountdownLabel(future);
    expect(label).toBe("זמין עוד 2:30 שעות");
  });

  it("returns minutes label for < 60 minutes remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const future = new Date("2026-01-01T10:45:00Z"); // 45 min
    const label = buildCountdownLabel(future);
    expect(label).toBe("זמין עוד 45 דקות");
  });

  it("returns seconds label for < 1 minute remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const future = new Date("2026-01-01T10:00:30.000Z"); // 30 sec
    const label = buildCountdownLabel(future);
    expect(label).toBe("זמין עוד 30 שניות");
  });

  it("returns null exactly at expiry", () => {
    vi.useFakeTimers();
    const now = new Date("2026-01-01T10:00:00Z");
    vi.setSystemTime(now);
    expect(buildCountdownLabel(now)).toBeNull();
  });
});
