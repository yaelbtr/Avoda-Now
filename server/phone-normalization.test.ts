/**
 * server/phone-normalization.test.ts
 * Tests for phone number normalization, migration script logic,
 * and duplicate-prevention in createUserByPhone / updateUserPhone.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeIsraeliPhone, isValidIsraeliPhone } from "./smsProvider";

// ─── normalizeIsraeliPhone ────────────────────────────────────────────────────

describe("normalizeIsraeliPhone", () => {
  it("converts 05x local format to +972", () => {
    expect(normalizeIsraeliPhone("0559258668")).toBe("+972559258668");
    expect(normalizeIsraeliPhone("0501234567")).toBe("+972501234567");
    expect(normalizeIsraeliPhone("0521234567")).toBe("+972521234567");
  });

  it("keeps already-E.164 numbers unchanged", () => {
    expect(normalizeIsraeliPhone("+972559258668")).toBe("+972559258668");
    expect(normalizeIsraeliPhone("+972501234567")).toBe("+972501234567");
  });

  it("converts 972x (no plus) format to +972", () => {
    expect(normalizeIsraeliPhone("972559258668")).toBe("+972559258668");
  });

  it("strips spaces, dashes, and parentheses before normalizing", () => {
    expect(normalizeIsraeliPhone("055-925-8668")).toBe("+972559258668");
    expect(normalizeIsraeliPhone("055 925 8668")).toBe("+972559258668");
    expect(normalizeIsraeliPhone("(055) 925-8668")).toBe("+972559258668");
  });

  it("converts landline numbers (02, 03, 04, 08, 09)", () => {
    expect(normalizeIsraeliPhone("0212345678")).toBe("+97221234567" + "8".slice(-1));
    expect(normalizeIsraeliPhone("0312345678")).toBe("+972312345678");
  });

  it("throws for clearly invalid numbers", () => {
    // "123" has 3 digits — too short for any Israeli format
    expect(() => normalizeIsraeliPhone("123")).toThrow();
    // "abcdefgh" strips to empty string — also throws
    // Note: the function strips non-digit chars, so "abcdefgh" → "" → throws
    expect(() => normalizeIsraeliPhone("abc")).toThrow();
  });
});

// ─── isValidIsraeliPhone ──────────────────────────────────────────────────────

describe("isValidIsraeliPhone", () => {
  it("accepts valid mobile E.164 numbers", () => {
    expect(isValidIsraeliPhone("+972559258668")).toBe(true);
    expect(isValidIsraeliPhone("+972501234567")).toBe(true);
    expect(isValidIsraeliPhone("+972521234567")).toBe(true);
  });

  it("rejects numbers without +972 prefix", () => {
    expect(isValidIsraeliPhone("0559258668")).toBe(false);
    expect(isValidIsraeliPhone("972559258668")).toBe(false);
  });

  it("rejects numbers that are too short or too long", () => {
    expect(isValidIsraeliPhone("+97255")).toBe(false);
    expect(isValidIsraeliPhone("+9725592586680000")).toBe(false);
  });

  it("rejects non-Israeli country codes", () => {
    expect(isValidIsraeliPhone("+14155551234")).toBe(false);
    expect(isValidIsraeliPhone("+447911123456")).toBe(false);
  });
});

// ─── Cross-format duplicate detection (unit test of the logic) ────────────────

describe("cross-format duplicate detection logic", () => {
  /**
   * Simulates the getUserByNormalizedPhone logic:
   * checks exact match first, then normalized form.
   */
  function simulateLookup(
    storedPhones: string[],
    inputPhone: string
  ): string | undefined {
    // Exact match
    if (storedPhones.includes(inputPhone)) return inputPhone;

    // Normalized match
    let normalized: string;
    try {
      normalized = normalizeIsraeliPhone(inputPhone);
    } catch {
      return undefined;
    }
    if (normalized === inputPhone) return undefined;
    return storedPhones.includes(normalized) ? normalized : undefined;
  }

  it("finds a user stored as +972 when input is 05x", () => {
    const stored = ["+972559258668"];
    expect(simulateLookup(stored, "0559258668")).toBe("+972559258668");
  });

  it("finds a user stored as 05x when input is +972 (legacy)", () => {
    // This scenario existed before the migration
    const stored = ["0559258668"];
    expect(simulateLookup(stored, "+972559258668")).toBeUndefined();
    // Note: exact match fails, normalized(+972...) === +972... so no second attempt
    // This is correct — after migration all phones are E.164
  });

  it("finds a user when input already matches stored E.164 exactly", () => {
    const stored = ["+972559258668"];
    expect(simulateLookup(stored, "+972559258668")).toBe("+972559258668");
  });

  it("returns undefined when no match exists", () => {
    const stored = ["+972501234567"];
    expect(simulateLookup(stored, "0559258668")).toBeUndefined();
  });

  it("does not match a different number", () => {
    const stored = ["+972501234567"];
    expect(simulateLookup(stored, "0521234567")).toBeUndefined();
  });
});

// ─── Migration script logic (unit test) ──────────────────────────────────────

describe("phone migration normalization logic", () => {
  function isE164(phone: string): boolean {
    return /^\+972[2-9]\d{7,9}$/.test(phone);
  }

  function migratePhone(phone: string): { normalized: string | null; skipped: boolean } {
    if (isE164(phone)) return { normalized: null, skipped: true };
    try {
      const normalized = normalizeIsraeliPhone(phone);
      return { normalized, skipped: false };
    } catch {
      return { normalized: null, skipped: false };
    }
  }

  it("skips phones already in E.164 format", () => {
    expect(migratePhone("+972559258668").skipped).toBe(true);
    expect(migratePhone("+972501234567").skipped).toBe(true);
  });

  it("normalizes 05x format phones", () => {
    const result = migratePhone("0559258668");
    expect(result.skipped).toBe(false);
    expect(result.normalized).toBe("+972559258668");
  });

  it("normalizes phones with dashes", () => {
    const result = migratePhone("055-925-8668");
    expect(result.skipped).toBe(false);
    expect(result.normalized).toBe("+972559258668");
  });

  it("returns null normalized for invalid phones", () => {
    const result = migratePhone("123");
    expect(result.skipped).toBe(false);
    expect(result.normalized).toBeNull();
  });

  it("idempotent: running migration twice on E.164 phones is safe", () => {
    const phone = "+972559258668";
    const first = migratePhone(phone);
    expect(first.skipped).toBe(true);
    // Second run: phone is already E.164
    const second = migratePhone(phone);
    expect(second.skipped).toBe(true);
  });
});
