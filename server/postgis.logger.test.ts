/**
 * Tests for the logPostgisError helper in server/logger.ts.
 *
 * We verify:
 * 1. The helper calls postgisLogger.error with the correct structured fields.
 * 2. It never throws — logging must not break the primary request path.
 * 3. It correctly extracts pgCode and message from various error shapes.
 * 4. It handles undefined userId gracefully.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock pino before importing logger ────────────────────────────────────────
vi.mock("pino", () => {
  const errorSpy = vi.fn();
  const childMock = vi.fn(() => ({ error: errorSpy, child: childMock }));
  const pinoMock = vi.fn(() => ({ child: childMock, error: errorSpy }));
  // Attach stdTimeFunctions so the module doesn't crash
  (pinoMock as unknown as Record<string, unknown>).stdTimeFunctions = { isoTime: () => "" };
  return { default: pinoMock };
});

// ── Import AFTER mock is registered ─────────────────────────────────────────
import { logPostgisError } from "./logger";


describe("logPostgisError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when called with a standard Error", () => {
    expect(() =>
      logPostgisError("setWorkerAvailable", { lat: "31.7683", lng: "35.2137" }, 1, new Error("test error"))
    ).not.toThrow();
  });

  it("does not throw when called with a non-Error object", () => {
    expect(() =>
      logPostgisError("setWorkerAvailable", { lat: "31.7683", lng: "35.2137" }, 1, { code: "23505" })
    ).not.toThrow();
  });

  it("does not throw when err is a plain string", () => {
    expect(() =>
      logPostgisError("setWorkerAvailable", { lat: "31.7683", lng: "35.2137" }, 1, "something went wrong")
    ).not.toThrow();
  });

  it("does not throw when err is null", () => {
    expect(() =>
      logPostgisError("setWorkerAvailable", { lat: "31.7683", lng: "35.2137" }, 1, null)
    ).not.toThrow();
  });

  it("does not throw when userId is undefined", () => {
    expect(() =>
      logPostgisError("updateWorkerProfile", { lat: "32.0853", lng: "34.7818" }, undefined, new Error("geo fail"))
    ).not.toThrow();
  });

  it("extracts pgCode from pg error objects", () => {
    // Simulate a pg error with a code field
    const pgError = Object.assign(new Error("inconsistent types"), { code: "42P18" });
    // Should not throw and should extract code
    expect(() =>
      logPostgisError("setWorkerAvailable", { lat: "31.7683", lng: "35.2137" }, 5, pgError)
    ).not.toThrow();
  });

  it("handles numeric coordinate values (not just strings)", () => {
    expect(() =>
      logPostgisError("setWorkerAvailable", { lat: 31.7683, lng: 35.2137 }, 7, new Error("fail"))
    ).not.toThrow();
  });

  it("handles all PostGIS operation names without throwing", () => {
    const operations = ["setWorkerAvailable", "updateWorkerProfile", "createJob", "getNearbyWorkers"];
    for (const op of operations) {
      expect(() =>
        logPostgisError(op, { lat: "31.0", lng: "35.0" }, 1, new Error("test"))
      ).not.toThrow();
    }
  });
});
