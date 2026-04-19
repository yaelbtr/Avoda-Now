/**
 * Unit tests for shared/cityValidation.ts
 *
 * Tests are grouped by rule:
 *  1. Empty / whitespace
 *  2. Length guard (> 40 chars)
 *  3. ASCII digit guard
 *  4. Hebrew ordinal suffix guard
 *  5. Address keyword guard (non-allowlisted)
 *  6. CITY_ALLOWLIST — allowlisted names must pass despite containing keywords
 *  7. Valid city names (must NOT produce errors)
 *  8. Zod refine helper
 */

import { describe, it, expect } from "vitest";
import {
  validateCityName,
  cityZodRefine,
  CITY_MAX_LENGTH,
  CITY_ALLOWLIST,
} from "./cityValidation";

// ─── helpers ─────────────────────────────────────────────────────────────────

function valid(city: string) {
  return validateCityName(city);
}

function invalid(city: string) {
  return validateCityName(city);
}

// ─── 1. Empty / whitespace ────────────────────────────────────────────────────

describe("empty / whitespace", () => {
  it("returns valid for empty string when not required", () => {
    expect(valid("").valid).toBe(true);
    expect(valid("   ").valid).toBe(true);
  });

  it("returns error for empty string when required", () => {
    const r = validateCityName("", { required: true });
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("returns valid for null / undefined when not required", () => {
    expect(validateCityName(null).valid).toBe(true);
    expect(validateCityName(undefined).valid).toBe(true);
  });
});

// ─── 2. Length guard ──────────────────────────────────────────────────────────

describe("length guard", () => {
  it("rejects strings longer than CITY_MAX_LENGTH", () => {
    const longCity = "א".repeat(CITY_MAX_LENGTH + 1);
    const r = invalid(longCity);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/כתובת מלאה/);
  });

  it("accepts strings exactly at CITY_MAX_LENGTH", () => {
    const borderCity = "א".repeat(CITY_MAX_LENGTH);
    expect(valid(borderCity).valid).toBe(true);
  });
});

// ─── 3. ASCII digit guard ─────────────────────────────────────────────────────

describe("ASCII digit guard", () => {
  it("rejects city with street number (Hebrew + digits)", () => {
    expect(invalid("הרצל 12").valid).toBe(false);
    expect(invalid("הרצל 12").error).toMatch(/מספרים/);
  });

  it("rejects full address with building number", () => {
    expect(invalid("אברבנאל 121א בני ברק").valid).toBe(false);
  });

  it("rejects city with any digit", () => {
    expect(invalid("עיר 5").valid).toBe(false);
  });
});

// ─── 4. Hebrew ordinal suffix guard ──────────────────────────────────────────

describe("Hebrew ordinal suffix guard", () => {
  it("rejects digit immediately followed by Hebrew letter", () => {
    expect(invalid("121א").valid).toBe(false);
    expect(invalid("5ב").valid).toBe(false);
  });

  it("does NOT reject standalone Hebrew letters in city names", () => {
    // "באר שבע" contains aleph but not after a digit
    expect(valid("באר שבע").valid).toBe(true);
  });
});

// ─── 5. Address keyword guard (non-allowlisted) ───────────────────────────────

describe("address keyword guard (non-allowlisted)", () => {
  it("rejects input containing 'רחוב'", () => {
    expect(invalid("רחוב הרצל").valid).toBe(false);
  });

  it("rejects 'שדרות רוטשילד' (keyword + street name, not a city)", () => {
    expect(invalid("שדרות רוטשילד").valid).toBe(false);
  });

  it("rejects input containing 'כיכר' followed by a name", () => {
    expect(invalid("כיכר רבין").valid).toBe(false);
  });

  it("rejects input containing 'דרך'", () => {
    expect(invalid("דרך מנחם בגין").valid).toBe(false);
  });

  it("rejects input containing abbreviated 'רח\\''", () => {
    expect(invalid("רח' הרצל").valid).toBe(false);
  });

  it("rejects 'מעלה הגבעה' (not in allowlist)", () => {
    // Generic "מעלה X" that is not a real locality name
    expect(invalid("מעלה הגבעה").valid).toBe(false);
  });
});

// ─── 6. CITY_ALLOWLIST ────────────────────────────────────────────────────────

describe("CITY_ALLOWLIST — allowlisted names bypass keyword guard", () => {
  it("CITY_ALLOWLIST is a non-empty Set", () => {
    expect(CITY_ALLOWLIST.size).toBeGreaterThan(0);
  });

  it("accepts 'שדרות' (city in the Negev)", () => {
    expect(valid("שדרות").valid).toBe(true);
    expect(valid("שדרות").error).toBeNull();
  });

  it("accepts 'מעלה אדומים'", () => {
    expect(valid("מעלה אדומים").valid).toBe(true);
  });

  it("accepts 'מעלה גלבוע'", () => {
    expect(valid("מעלה גלבוע").valid).toBe(true);
  });

  it("accepts 'מעלה עירון'", () => {
    expect(valid("מעלה עירון").valid).toBe(true);
  });

  it("accepts 'מעלה אפרים'", () => {
    expect(valid("מעלה אפרים").valid).toBe(true);
  });

  it("accepts 'מעלה מכמש'", () => {
    expect(valid("מעלה מכמש").valid).toBe(true);
  });

  it("accepts 'מעלה שומרון'", () => {
    expect(valid("מעלה שומרון").valid).toBe(true);
  });

  it("accepts 'מעלה חמישה'", () => {
    expect(valid("מעלה חמישה").valid).toBe(true);
  });

  it("accepts 'כיכר המדינה'", () => {
    expect(valid("כיכר המדינה").valid).toBe(true);
  });

  it("still rejects 'שדרות רוטשילד' even though 'שדרות' is allowlisted (full name differs)", () => {
    // The allowlist checks the FULL trimmed string, not a prefix.
    expect(invalid("שדרות רוטשילד").valid).toBe(false);
  });

  it("still rejects 'מעלה הגבעה' (not in allowlist)", () => {
    expect(invalid("מעלה הגבעה").valid).toBe(false);
  });
});

// ─── 7. Valid city names ──────────────────────────────────────────────────────

describe("valid city names", () => {
  const validCities = [
    "תל אביב",
    "ירושלים",
    "חיפה",
    "בני ברק",
    "באר שבע",
    "ראשון לציון",
    "פתח תקווה",
    "אשדוד",
    "נתניה",
    "רמת גן",
    "הרצליה",
    "רעננה",
    "כפר סבא",
    "מודיעין",
    "אילת",
    "טבריה",
    "נצרת",
    "אום אל-פחם",
    "טייבה",
    "קריית גת",
    // allowlisted cities also appear here as a cross-check
    "שדרות",
    "מעלה אדומים",
  ];

  for (const city of validCities) {
    it(`accepts "${city}"`, () => {
      expect(valid(city).valid).toBe(true);
    });
  }
});

// ─── 8. Zod refine helper ─────────────────────────────────────────────────────

describe("cityZodRefine", () => {
  it("does not add issue for valid city", () => {
    const issues: unknown[] = [];
    const ctx = { addIssue: (i: unknown) => issues.push(i) };
    cityZodRefine("תל אביב", ctx);
    expect(issues).toHaveLength(0);
  });

  it("does not add issue for allowlisted city 'שדרות'", () => {
    const issues: unknown[] = [];
    const ctx = { addIssue: (i: unknown) => issues.push(i) };
    cityZodRefine("שדרות", ctx);
    expect(issues).toHaveLength(0);
  });

  it("does not add issue for allowlisted city 'מעלה אדומים'", () => {
    const issues: unknown[] = [];
    const ctx = { addIssue: (i: unknown) => issues.push(i) };
    cityZodRefine("מעלה אדומים", ctx);
    expect(issues).toHaveLength(0);
  });

  it("does not add issue for undefined (let .optional() handle it)", () => {
    const issues: unknown[] = [];
    const ctx = { addIssue: (i: unknown) => issues.push(i) };
    cityZodRefine(undefined, ctx);
    expect(issues).toHaveLength(0);
  });

  it("adds issue for address-like input", () => {
    const issues: { code: string; message: string }[] = [];
    const ctx = { addIssue: (i: { code: string; message: string }) => issues.push(i) };
    cityZodRefine("הרצל 12 תל אביב", ctx);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("custom");
    expect(issues[0].message).toBeTruthy();
  });

  it("adds issue for non-allowlisted keyword string 'שדרות רוטשילד'", () => {
    const issues: { code: string; message: string }[] = [];
    const ctx = { addIssue: (i: { code: string; message: string }) => issues.push(i) };
    cityZodRefine("שדרות רוטשילד", ctx);
    expect(issues).toHaveLength(1);
  });
});
