/**
 * Regression tests for IsraeliPhoneInput utilities.
 *
 * Covers the bug where hasFullPhoneVal used a hardcoded `prefix.length === 3`
 * check instead of isValidPhoneValue, causing 2-digit-prefix numbers (02/03/04)
 * and VoIP prefixes (072/073) to be silently dropped during wizard submit.
 */
import { describe, it, expect } from "vitest";
import {
  isValidPhoneValue,
  maskedToPhoneValue,
  combinePhone,
  parseIsraeliPhone,
  type PhoneValue,
} from "../components/IsraeliPhoneInput";

// ─── isValidPhoneValue ────────────────────────────────────────────────────────

describe("isValidPhoneValue", () => {
  it("accepts standard 3-digit mobile prefix (050)", () => {
    expect(isValidPhoneValue({ prefix: "050", number: "1234567" })).toBe(true);
  });

  it("accepts 3-digit mobile prefix (054)", () => {
    expect(isValidPhoneValue({ prefix: "054", number: "1234567" })).toBe(true);
  });

  it("accepts 3-digit mobile prefix (058)", () => {
    expect(isValidPhoneValue({ prefix: "058", number: "1234567" })).toBe(true);
  });

  it("accepts 2-digit landline prefix (02) — regression for wizard bug", () => {
    // This was the bug: prefix.length === 3 check would reject 2-digit prefixes
    expect(isValidPhoneValue({ prefix: "02", number: "1234567" })).toBe(true);
  });

  it("accepts 2-digit landline prefix (03)", () => {
    expect(isValidPhoneValue({ prefix: "03", number: "1234567" })).toBe(true);
  });

  it("accepts 2-digit landline prefix (04)", () => {
    expect(isValidPhoneValue({ prefix: "04", number: "1234567" })).toBe(true);
  });

  it("accepts 2-digit landline prefix (08)", () => {
    expect(isValidPhoneValue({ prefix: "08", number: "1234567" })).toBe(true);
  });

  it("accepts 2-digit landline prefix (09)", () => {
    expect(isValidPhoneValue({ prefix: "09", number: "1234567" })).toBe(true);
  });

  it("rejects empty prefix", () => {
    expect(isValidPhoneValue({ prefix: "", number: "1234567" })).toBe(false);
  });

  it("rejects empty number", () => {
    expect(isValidPhoneValue({ prefix: "050", number: "" })).toBe(false);
  });

  it("rejects both empty", () => {
    expect(isValidPhoneValue({ prefix: "", number: "" })).toBe(false);
  });

  it("rejects unknown prefix", () => {
    expect(isValidPhoneValue({ prefix: "099", number: "1234567" })).toBe(false);
  });
});

// ─── maskedToPhoneValue ───────────────────────────────────────────────────────

describe("maskedToPhoneValue", () => {
  it("parses 054-123-4567 into prefix=054, number=1234567", () => {
    expect(maskedToPhoneValue("054-123-4567")).toEqual({ prefix: "054", number: "1234567" });
  });

  it("parses 02-1234567 into prefix=02, number=1234567", () => {
    expect(maskedToPhoneValue("02-1234567")).toEqual({ prefix: "02", number: "1234567" });
  });

  it("parses 0521234567 (no dashes) correctly", () => {
    expect(maskedToPhoneValue("0521234567")).toEqual({ prefix: "052", number: "1234567" });
  });
});

// ─── combinePhone ─────────────────────────────────────────────────────────────

describe("combinePhone", () => {
  it("combines prefix + number into local format", () => {
    expect(combinePhone({ prefix: "054", number: "1234567" })).toBe("0541234567");
  });

  it("combines 2-digit prefix correctly", () => {
    expect(combinePhone({ prefix: "03", number: "1234567" })).toBe("031234567");
  });
});

// ─── parseIsraeliPhone ────────────────────────────────────────────────────────

describe("parseIsraeliPhone", () => {
  it("parses E.164 format +972541234567", () => {
    const result = parseIsraeliPhone("+972541234567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });

  it("parses local format 0541234567", () => {
    const result = parseIsraeliPhone("0541234567");
    expect(result.prefix).toBe("054");
    expect(result.number).toBe("1234567");
  });

  it("returns default prefix for null input", () => {
    const result = parseIsraeliPhone(null);
    expect(result.prefix).toBe("050");
    expect(result.number).toBe("");
  });
});

// ─── Wizard phone submit simulation ──────────────────────────────────────────

describe("wizard phone submit (regression)", () => {
  it("correctly identifies a valid phone entered via IsraeliPhoneInput", () => {
    // Simulate user entering 054-123-4567 in the wizard
    const phoneVal: PhoneValue = maskedToPhoneValue("054-123-4567");
    // This was the bug: old code used prefix.length === 3 && number.length === 7
    // New code uses isValidPhoneValue which handles all prefix lengths
    const hasFullPhoneVal = isValidPhoneValue(phoneVal);
    expect(hasFullPhoneVal).toBe(true);
    const combinedPhone = hasFullPhoneVal ? combinePhone(phoneVal) : undefined;
    expect(combinedPhone).toBe("0541234567");
  });

  it("correctly identifies a valid 2-digit-prefix phone (regression for dropped phone bug)", () => {
    // Simulate user entering 03-123-4567 in the wizard
    const phoneVal: PhoneValue = maskedToPhoneValue("03-1234567");
    const hasFullPhoneVal = isValidPhoneValue(phoneVal);
    expect(hasFullPhoneVal).toBe(true);
    const combinedPhone = hasFullPhoneVal ? combinePhone(phoneVal) : undefined;
    expect(combinedPhone).toBe("031234567");
  });

  it("returns undefined for incomplete phone input", () => {
    const phoneVal: PhoneValue = { prefix: "054", number: "123" }; // incomplete
    const hasFullPhoneVal = isValidPhoneValue(phoneVal);
    expect(hasFullPhoneVal).toBe(false);
    const combinedPhone = hasFullPhoneVal ? combinePhone(phoneVal) : undefined;
    expect(combinedPhone).toBeUndefined();
  });
});
