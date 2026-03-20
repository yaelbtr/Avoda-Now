import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock @sendgrid/mail before importing emailOtp ──────────────────────────
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([{ statusCode: 202 }]),
  },
}));

// ── Mock db helpers ────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

import { generateEmailCode, hashEmailCode } from "./emailOtp";

describe("generateCode", () => {
  it("returns a 6-digit string", () => {
    const code = generateEmailCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes on repeated calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateEmailCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("hashCode", () => {
  it("returns a non-empty hex string", () => {
    const hash = hashEmailCode("123456");
    expect(hash).toMatch(/^[a-f0-9]+$/);
    expect(hash.length).toBeGreaterThan(10);
  });

  it("same code produces same hash", () => {
    const h1 = hashEmailCode("654321");
    const h2 = hashEmailCode("654321");
    expect(h1).toBe(h2);
  });

  it("different codes produce different hashes", () => {
    const h1 = hashEmailCode("111111");
    const h2 = hashEmailCode("222222");
    expect(h1).not.toBe(h2);
  });

  it("hash is not the original code (actually hashed)", () => {
    const code = "999999";
    const hash = hashEmailCode(code);
    expect(hash).not.toBe(code);
  });
});
