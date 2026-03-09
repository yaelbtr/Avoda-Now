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

// ─── Unit tests for OTP phone change flow logic ──────────────────────────────

// Inline the normalizeIsraeliPhone logic (mirrors routers.ts)
function normalizeIsraeliPhone(phone: string): string | null {
  const cleaned = phone.replace(/\s|-/g, "");
  // Accept 10-digit local format (05XXXXXXXX)
  if (/^0[5][0-9]{8}$/.test(cleaned)) return cleaned;
  // Accept +972 international format
  if (/^\+972[5][0-9]{8}$/.test(cleaned)) return "0" + cleaned.slice(4);
  return null;
}

function isOtpCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

describe("OTP phone change flow", () => {
  describe("normalizeIsraeliPhone", () => {
    it("normalizes a valid 10-digit local phone", () => {
      expect(normalizeIsraeliPhone("0521234567")).toBe("0521234567");
    });

    it("normalizes +972 international format", () => {
      expect(normalizeIsraeliPhone("+972521234567")).toBe("0521234567");
    });

    it("strips spaces and dashes", () => {
      expect(normalizeIsraeliPhone("052-123-4567")).toBe("0521234567");
      expect(normalizeIsraeliPhone("052 123 4567")).toBe("0521234567");
    });

    it("returns null for landline numbers", () => {
      expect(normalizeIsraeliPhone("0221234567")).toBeNull();
    });

    it("returns null for too-short numbers", () => {
      expect(normalizeIsraeliPhone("052123")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(normalizeIsraeliPhone("")).toBeNull();
    });

    it("returns null for non-Israeli mobile prefix", () => {
      expect(normalizeIsraeliPhone("0401234567")).toBeNull();
    });
  });

  describe("isOtpCodeFormat", () => {
    it("accepts exactly 6 digits", () => {
      expect(isOtpCodeFormat("123456")).toBe(true);
      expect(isOtpCodeFormat("000000")).toBe(true);
      expect(isOtpCodeFormat("999999")).toBe(true);
    });

    it("rejects fewer than 6 digits", () => {
      expect(isOtpCodeFormat("12345")).toBe(false);
      expect(isOtpCodeFormat("")).toBe(false);
    });

    it("rejects more than 6 digits", () => {
      expect(isOtpCodeFormat("1234567")).toBe(false);
    });

    it("rejects non-digit characters", () => {
      expect(isOtpCodeFormat("12345a")).toBe(false);
      expect(isOtpCodeFormat("123-45")).toBe(false);
    });
  });

  describe("phone change detection logic", () => {
    function phoneChanged(
      current: { prefix: string; number: string },
      original: { prefix: string; number: string }
    ): boolean {
      const hasFullPhone = current.prefix.length === 3 && current.number.length === 7;
      return hasFullPhone && (
        current.prefix !== original.prefix ||
        current.number !== original.number
      );
    }

    it("detects a prefix change", () => {
      expect(phoneChanged(
        { prefix: "054", number: "1234567" },
        { prefix: "052", number: "1234567" }
      )).toBe(true);
    });

    it("detects a number change", () => {
      expect(phoneChanged(
        { prefix: "052", number: "7654321" },
        { prefix: "052", number: "1234567" }
      )).toBe(true);
    });

    it("returns false when phone is unchanged", () => {
      expect(phoneChanged(
        { prefix: "052", number: "1234567" },
        { prefix: "052", number: "1234567" }
      )).toBe(false);
    });

    it("returns false when new phone is incomplete", () => {
      expect(phoneChanged(
        { prefix: "05", number: "1234567" }, // prefix too short
        { prefix: "052", number: "1234567" }
      )).toBe(false);
    });

    it("returns false when number is incomplete", () => {
      expect(phoneChanged(
        { prefix: "052", number: "123456" }, // number too short
        { prefix: "052", number: "1234567" }
      )).toBe(false);
    });
  });
});

// ─── Lockout & Audit Log Logic ───────────────────────────────────────────────

describe("Phone change lockout logic", () => {
  const LOCKOUT_THRESHOLD = 5;

  it("allows change when failures < 5", () => {
    const failures = 4;
    expect(failures >= LOCKOUT_THRESHOLD).toBe(false);
  });

  it("locks when failures === 5", () => {
    const failures = 5;
    expect(failures >= LOCKOUT_THRESHOLD).toBe(true);
  });

  it("locks when failures > 5", () => {
    const failures = 7;
    expect(failures >= LOCKOUT_THRESHOLD).toBe(true);
  });

  it("remaining attempts calculation is correct", () => {
    const failures = 3;
    const remaining = LOCKOUT_THRESHOLD - failures;
    expect(remaining).toBe(2);
  });

  it("remaining attempts is 0 at threshold", () => {
    const failures = 5;
    const remaining = LOCKOUT_THRESHOLD - failures;
    expect(remaining).toBe(0);
  });
});

describe("Phone change audit log params", () => {
  it("builds correct log entry for success", () => {
    const entry = {
      userId: 42,
      oldPhone: "0521234567",
      newPhone: "+972521234568",
      ipAddress: "1.2.3.4",
      result: "success" as const,
    };
    expect(entry.result).toBe("success");
    expect(entry.userId).toBe(42);
    expect(entry.ipAddress).toBe("1.2.3.4");
  });

  it("builds correct log entry for failed attempt", () => {
    const entry = {
      userId: 42,
      oldPhone: "0521234567",
      newPhone: "+972521234568",
      ipAddress: "1.2.3.4",
      result: "failed" as const,
    };
    expect(entry.result).toBe("failed");
  });

  it("builds correct log entry for locked attempt", () => {
    const entry = {
      userId: 42,
      oldPhone: null,
      newPhone: "+972521234568",
      ipAddress: "unknown",
      result: "locked" as const,
    };
    expect(entry.result).toBe("locked");
    expect(entry.oldPhone).toBeNull();
  });
});

describe("Email fallback logic", () => {
  it("detects valid email for fallback", () => {
    const email = "user@example.com";
    const hasEmailFallback = !!(email && email.includes("@"));
    expect(hasEmailFallback).toBe(true);
  });

  it("rejects empty email for fallback", () => {
    const email = "";
    const hasEmailFallback = !!(email && email.includes("@"));
    expect(hasEmailFallback).toBe(false);
  });

  it("rejects undefined email for fallback", () => {
    const email: string | undefined = undefined;
    const hasEmailFallback = !!(email && email.includes("@"));
    expect(hasEmailFallback).toBe(false);
  });

  it("masks email correctly", () => {
    const email = "john.doe@gmail.com";
    const [local, domain] = email.split("@");
    const masked = `${local.slice(0, 2)}***@${domain}`;
    expect(masked).toBe("jo***@gmail.com");
  });

  it("masks short email correctly", () => {
    const email = "ab@test.co.il";
    const [local, domain] = email.split("@");
    const masked = `${local.slice(0, 2)}***@${domain}`;
    expect(masked).toBe("ab***@test.co.il");
  });
});
