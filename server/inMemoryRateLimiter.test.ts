import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInMemoryRateLimiter } from "./security";

describe("createInMemoryRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request", () => {
    const limiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);
    const result = limiter.check("user:1");
    expect(result.allowed).toBe(true);
  });

  it("allows up to maxRequests within the window", () => {
    const limiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);
    expect(limiter.check("user:1").allowed).toBe(true);
    expect(limiter.check("user:1").allowed).toBe(true);
    expect(limiter.check("user:1").allowed).toBe(true);
  });

  it("blocks the (maxRequests + 1)th request within the window", () => {
    const limiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);
    limiter.check("user:1");
    limiter.check("user:1");
    limiter.check("user:1");
    const result = limiter.check("user:1");
    expect(result.allowed).toBe(false);
  });

  it("returns retryAfterMs > 0 when blocked", () => {
    const limiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);
    limiter.check("user:1");
    limiter.check("user:1");
    limiter.check("user:1");
    const result = limiter.check("user:1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(10 * 60 * 1000);
    }
  });

  it("resets the window after windowMs has elapsed", () => {
    const limiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);
    limiter.check("user:1");
    limiter.check("user:1");
    limiter.check("user:1");
    // Advance time past the window
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    const result = limiter.check("user:1");
    expect(result.allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    const limiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);
    limiter.check("user:1");
    limiter.check("user:1");
    limiter.check("user:1");
    // user:2 has its own fresh window
    expect(limiter.check("user:2").allowed).toBe(true);
    expect(limiter.check("user:2").allowed).toBe(true);
    expect(limiter.check("user:2").allowed).toBe(true);
    expect(limiter.check("user:2").allowed).toBe(false);
  });

  it("reset() clears the key so the next call is allowed", () => {
    const limiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);
    limiter.check("user:1");
    limiter.check("user:1");
    limiter.check("user:1");
    expect(limiter.check("user:1").allowed).toBe(false);
    limiter.reset("user:1");
    expect(limiter.check("user:1").allowed).toBe(true);
  });

  it("allows exactly maxRequests=1 and blocks the second", () => {
    const limiter = createInMemoryRateLimiter(1, 60_000);
    expect(limiter.check("u").allowed).toBe(true);
    expect(limiter.check("u").allowed).toBe(false);
  });

  it("retryAfterMs decreases as time passes within the window", () => {
    const limiter = createInMemoryRateLimiter(1, 60_000);
    limiter.check("u");
    const r1 = limiter.check("u");
    expect(r1.allowed).toBe(false);
    const ms1 = r1.allowed ? 0 : r1.retryAfterMs;

    vi.advanceTimersByTime(10_000);
    const r2 = limiter.check("u");
    expect(r2.allowed).toBe(false);
    const ms2 = r2.allowed ? 0 : r2.retryAfterMs;

    expect(ms2).toBeLessThan(ms1);
  });

  it("publishOtpRateLimiter scenario: 3 sends allowed, 4th blocked, resets after 10 min", () => {
    const limiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);
    const key = "publish-otp:42";
    expect(limiter.check(key).allowed).toBe(true);  // send 1
    expect(limiter.check(key).allowed).toBe(true);  // send 2
    expect(limiter.check(key).allowed).toBe(true);  // send 3
    const blocked = limiter.check(key);
    expect(blocked.allowed).toBe(false);            // send 4 — blocked
    if (!blocked.allowed) {
      const minutes = Math.ceil(blocked.retryAfterMs / 60_000);
      expect(minutes).toBeGreaterThanOrEqual(1);
      expect(minutes).toBeLessThanOrEqual(10);
    }
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(limiter.check(key).allowed).toBe(true);  // window reset
  });
});
