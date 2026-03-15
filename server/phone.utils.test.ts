/**
 * Tests for phone utility functions in IsraeliPhoneInput.tsx
 * These are pure functions so we can test them directly without DOM.
 */
import { describe, it, expect } from "vitest";

// Import the utility functions directly from the client component
// (they are pure functions with no DOM/React dependencies)
import {
  stripNonDigits,
  applyPhoneMask,
  maskedToPhoneValue,
  normalizeRawPhone,
  parseIsraeliPhone,
  combinePhone,
  toE164,
  isValidPhoneValue,
} from "../client/src/components/IsraeliPhoneInput";

// ─── stripNonDigits ───────────────────────────────────────────────────────────

describe("stripNonDigits", () => {
  it("removes dashes", () => {
    expect(stripNonDigits("054-123-4567")).toBe("0541234567");
  });
  it("removes spaces", () => {
    expect(stripNonDigits("054 123 4567")).toBe("0541234567");
  });
  it("removes parentheses", () => {
    expect(stripNonDigits("(054) 1234567")).toBe("0541234567");
  });
  it("leaves digits intact", () => {
    expect(stripNonDigits("0541234567")).toBe("0541234567");
  });
  it("handles empty string", () => {
    expect(stripNonDigits("")).toBe("");
  });
});

// ─── applyPhoneMask ───────────────────────────────────────────────────────────

describe("applyPhoneMask", () => {
  it("masks a full 10-digit mobile number", () => {
    expect(applyPhoneMask("0541234567")).toBe("054-123-4567");
  });
  it("masks a full 9-digit landline (03)", () => {
    expect(applyPhoneMask("031234567")).toBe("03-123-4567");
  });
  it("masks partial input — prefix only", () => {
    expect(applyPhoneMask("054")).toBe("054");
  });
  it("masks partial input — prefix + 2 digits", () => {
    expect(applyPhoneMask("05412")).toBe("054-12");
  });
  it("handles empty string", () => {
    expect(applyPhoneMask("")).toBe("");
  });
});

// ─── maskedToPhoneValue ───────────────────────────────────────────────────────

describe("maskedToPhoneValue", () => {
  it("parses a full masked mobile number", () => {
    const result = maskedToPhoneValue("054-123-4567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });
  it("parses a full masked landline (03)", () => {
    const result = maskedToPhoneValue("03-123-4567");
    expect(result.prefix).toBe("03");
    expect(result.number).toBe("1234567");
  });
  it("parses unmasked digits", () => {
    const result = maskedToPhoneValue("0521234567");
    expect(result.prefix).toBe("052");
    expect(result.number).toBe("1234567");
  });
  it("handles empty string with default prefix", () => {
    const result = maskedToPhoneValue("");
    expect(result.prefix).toBe("050");
    expect(result.number).toBe("");
  });
});

// ─── normalizeRawPhone ────────────────────────────────────────────────────────

describe("normalizeRawPhone", () => {
  it("handles +972 prefix", () => {
    const result = normalizeRawPhone("+972541234567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });
  it("handles 972 without + (12+ digits)", () => {
    const result = normalizeRawPhone("972541234567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });
  it("handles local format with dashes", () => {
    const result = normalizeRawPhone("054-123-4567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });
  it("handles spaces in pasted number", () => {
    const result = normalizeRawPhone("054 123 4567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });
  it("handles parentheses", () => {
    const result = normalizeRawPhone("(054) 1234567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });
});

// ─── parseIsraeliPhone ────────────────────────────────────────────────────────

describe("parseIsraeliPhone", () => {
  it("parses E.164 format", () => {
    const result = parseIsraeliPhone("+972541234567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });
  it("parses local 10-digit format", () => {
    const result = parseIsraeliPhone("0541234567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });
  it("returns default prefix for null", () => {
    const result = parseIsraeliPhone(null);
    expect(result.prefix).toBe("050");
    expect(result.number).toBe("");
  });
  it("returns default prefix for undefined", () => {
    const result = parseIsraeliPhone(undefined);
    expect(result.prefix).toBe("050");
    expect(result.number).toBe("");
  });
  it("returns default prefix for empty string", () => {
    const result = parseIsraeliPhone("");
    expect(result.prefix).toBe("050");
    expect(result.number).toBe("");
  });
});

// ─── combinePhone ─────────────────────────────────────────────────────────────

describe("combinePhone", () => {
  it("combines prefix and number", () => {
    expect(combinePhone({ prefix: "054", number: "1234567" })).toBe("0541234567");
  });
  it("combines 2-digit prefix", () => {
    expect(combinePhone({ prefix: "03", number: "1234567" })).toBe("031234567");
  });
  it("handles empty number", () => {
    expect(combinePhone({ prefix: "054", number: "" })).toBe("054");
  });
});

// ─── toE164 ───────────────────────────────────────────────────────────────────

describe("toE164", () => {
  it("converts mobile to E.164", () => {
    expect(toE164({ prefix: "054", number: "1234567" })).toBe("+972541234567");
  });
  it("converts landline to E.164", () => {
    expect(toE164({ prefix: "03", number: "1234567" })).toBe("+97231234567");
  });
  it("handles already-E164 prefix (no leading 0)", () => {
    // Edge case: if prefix doesn't start with 0, return as-is
    expect(toE164({ prefix: "54", number: "1234567" })).toBe("541234567");
  });
});

// ─── isValidPhoneValue ────────────────────────────────────────────────────────

describe("isValidPhoneValue", () => {
  it("validates a complete mobile number", () => {
    expect(isValidPhoneValue({ prefix: "054", number: "1234567" })).toBe(true);
  });
  it("validates a complete landline", () => {
    expect(isValidPhoneValue({ prefix: "03", number: "1234567" })).toBe(true);
  });
  it("rejects incomplete number", () => {
    expect(isValidPhoneValue({ prefix: "054", number: "123" })).toBe(false);
  });
  it("rejects empty number", () => {
    expect(isValidPhoneValue({ prefix: "054", number: "" })).toBe(false);
  });
  it("rejects invalid prefix", () => {
    expect(isValidPhoneValue({ prefix: "099", number: "1234567" })).toBe(false);
  });
  it("rejects empty prefix", () => {
    expect(isValidPhoneValue({ prefix: "", number: "1234567" })).toBe(false);
  });
  it("validates all common mobile prefixes", () => {
    const mobilePrefixes = ["050", "051", "052", "053", "054", "055", "056", "057", "058", "059"];
    for (const prefix of mobilePrefixes) {
      expect(isValidPhoneValue({ prefix, number: "1234567" })).toBe(true);
    }
  });
});
