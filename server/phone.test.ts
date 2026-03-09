import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Unit tests for Israeli phone validation logic ────────────────────────────
// These tests cover the pure validation functions without requiring a DB connection.

// ── Inline the validation logic (mirrors routers.ts) ──────────────────────────

function isValidPhoneNumberPart(number: string): boolean {
  return /^\d{7}$/.test(number);
}

function isValidPrefixFormat(prefix: string): boolean {
  return /^0\d{2}$/.test(prefix);
}

function combinePhone(prefix: string, number: string): string {
  return `${prefix}${number}`;
}

function parseIsraeliPhone(phone: string): { prefix: string; number: string } | null {
  if (!phone) return null;
  // Remove +972 prefix if present
  let local = phone.replace(/^\+972/, "0").replace(/\s/g, "");
  if (local.startsWith("0") && local.length === 10) {
    return { prefix: local.slice(0, 3), number: local.slice(3) };
  }
  return null;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Israeli phone number validation", () => {
  describe("isValidPhoneNumberPart", () => {
    it("accepts exactly 7 digits", () => {
      expect(isValidPhoneNumberPart("1234567")).toBe(true);
      expect(isValidPhoneNumberPart("0000000")).toBe(true);
      expect(isValidPhoneNumberPart("9999999")).toBe(true);
    });

    it("rejects fewer than 7 digits", () => {
      expect(isValidPhoneNumberPart("123456")).toBe(false);
      expect(isValidPhoneNumberPart("")).toBe(false);
    });

    it("rejects more than 7 digits", () => {
      expect(isValidPhoneNumberPart("12345678")).toBe(false);
    });

    it("rejects non-digit characters", () => {
      expect(isValidPhoneNumberPart("123456a")).toBe(false);
      expect(isValidPhoneNumberPart("123-456")).toBe(false);
      expect(isValidPhoneNumberPart("1234 56")).toBe(false);
    });
  });

  describe("isValidPrefixFormat", () => {
    it("accepts valid Israeli mobile prefixes", () => {
      const validPrefixes = ["050", "052", "053", "054", "055", "058", "059"];
      for (const p of validPrefixes) {
        expect(isValidPrefixFormat(p)).toBe(true);
      }
    });

    it("rejects prefixes not starting with 0", () => {
      expect(isValidPrefixFormat("152")).toBe(false);
      expect(isValidPrefixFormat("52")).toBe(false);
    });

    it("rejects prefixes with wrong length", () => {
      expect(isValidPrefixFormat("05")).toBe(false);
      expect(isValidPrefixFormat("0521")).toBe(false);
    });

    it("rejects non-digit characters in prefix", () => {
      expect(isValidPrefixFormat("05a")).toBe(false);
    });
  });

  describe("combinePhone", () => {
    it("concatenates prefix and number correctly", () => {
      expect(combinePhone("052", "1234567")).toBe("0521234567");
      expect(combinePhone("050", "0000000")).toBe("0500000000");
    });

    it("produces a 10-digit string for valid inputs", () => {
      const result = combinePhone("054", "9876543");
      expect(result).toHaveLength(10);
    });
  });

  describe("parseIsraeliPhone", () => {
    it("parses a standard 10-digit Israeli phone", () => {
      const result = parseIsraeliPhone("0521234567");
      expect(result).toEqual({ prefix: "052", number: "1234567" });
    });

    it("parses a +972 international format", () => {
      const result = parseIsraeliPhone("+972521234567");
      expect(result).toEqual({ prefix: "052", number: "1234567" });
    });

    it("returns null for empty string", () => {
      expect(parseIsraeliPhone("")).toBeNull();
    });

    it("returns null for too-short numbers", () => {
      expect(parseIsraeliPhone("052123")).toBeNull();
    });

    it("returns null for numbers not starting with 0", () => {
      expect(parseIsraeliPhone("1521234567")).toBeNull();
    });

    it("round-trips through combinePhone", () => {
      const original = "0541234567";
      const parsed = parseIsraeliPhone(original);
      expect(parsed).not.toBeNull();
      const combined = combinePhone(parsed!.prefix, parsed!.number);
      expect(combined).toBe(original);
    });
  });

  describe("full phone validation flow", () => {
    it("validates a complete phone entry", () => {
      const prefix = "052";
      const number = "1234567";
      expect(isValidPrefixFormat(prefix)).toBe(true);
      expect(isValidPhoneNumberPart(number)).toBe(true);
      expect(combinePhone(prefix, number)).toBe("0521234567");
    });

    it("rejects incomplete entries", () => {
      expect(isValidPhoneNumberPart("123456")).toBe(false); // 6 digits
      expect(isValidPrefixFormat("05")).toBe(false); // short prefix
    });

    it("validates all seeded prefixes", () => {
      const seededPrefixes = ["050", "052", "053", "054", "055", "058", "059"];
      for (const p of seededPrefixes) {
        expect(isValidPrefixFormat(p)).toBe(true);
      }
    });
  });
});
