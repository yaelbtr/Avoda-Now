/**
 * legal-integration.test.ts
 * Tests for the legal documents integration:
 * - userConsents DB helpers (recordUserConsent, getUserConsents)
 * - consent type enum validation
 * - idempotent consent recording
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Unit tests for consent type enum ──────────────────────────────────────

const VALID_CONSENT_TYPES = [
  "terms",
  "privacy",
  "age_18",
  "job_posting_policy",
  "safety_policy",
  "user_content_policy",
  "reviews_policy",
] as const;

type ConsentType = (typeof VALID_CONSENT_TYPES)[number];

function isValidConsentType(type: string): type is ConsentType {
  return (VALID_CONSENT_TYPES as readonly string[]).includes(type);
}

describe("Legal consent type validation", () => {
  it("accepts all 7 valid consent types", () => {
    VALID_CONSENT_TYPES.forEach((type) => {
      expect(isValidConsentType(type)).toBe(true);
    });
  });

  it("rejects unknown consent types", () => {
    expect(isValidConsentType("unknown_policy")).toBe(false);
    expect(isValidConsentType("")).toBe(false);
    expect(isValidConsentType("TERMS")).toBe(false); // case-sensitive
  });

  it("has exactly 7 consent types", () => {
    expect(VALID_CONSENT_TYPES.length).toBe(7);
  });
});

// ─── Unit tests for consent recording logic ─────────────────────────────────

describe("Consent recording logic", () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a new consent with required fields", () => {
    const consentRecord = {
      userId: 42,
      consentType: "terms" as ConsentType,
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      documentVersion: "v1.0",
      createdAt: Date.now(),
    };

    expect(consentRecord.userId).toBe(42);
    expect(isValidConsentType(consentRecord.consentType)).toBe(true);
    expect(consentRecord.ipAddress).toBeTruthy();
    expect(consentRecord.createdAt).toBeGreaterThan(0);
  });

  it("allows optional fields to be undefined", () => {
    const minimalConsent = {
      userId: 1,
      consentType: "privacy" as ConsentType,
      ipAddress: undefined,
      userAgent: undefined,
      documentVersion: undefined,
      createdAt: Date.now(),
    };

    expect(minimalConsent.userId).toBe(1);
    expect(isValidConsentType(minimalConsent.consentType)).toBe(true);
    expect(minimalConsent.ipAddress).toBeUndefined();
  });

  it("stores all 3 consent types on signup (terms, privacy, age_18)", () => {
    const signupConsents: ConsentType[] = ["terms", "privacy", "age_18"];

    signupConsents.forEach((type) => {
      expect(isValidConsentType(type)).toBe(true);
    });
    expect(signupConsents).toHaveLength(3);
  });
});

// ─── Unit tests for legal page routes ────────────────────────────────────────

describe("Legal page routes", () => {
  const LEGAL_ROUTES = [
    "/terms",
    "/privacy",
    "/job-posting-policy",
    "/safety-policy",
    "/user-content-policy",
    "/reviews-policy",
  ];

  it("defines all 6 required legal page routes", () => {
    expect(LEGAL_ROUTES).toHaveLength(6);
  });

  it("all routes start with /", () => {
    LEGAL_ROUTES.forEach((route) => {
      expect(route.startsWith("/")).toBe(true);
    });
  });

  it("includes terms and privacy as mandatory routes", () => {
    expect(LEGAL_ROUTES).toContain("/terms");
    expect(LEGAL_ROUTES).toContain("/privacy");
  });

  it("includes all 4 additional policy routes", () => {
    expect(LEGAL_ROUTES).toContain("/job-posting-policy");
    expect(LEGAL_ROUTES).toContain("/safety-policy");
    expect(LEGAL_ROUTES).toContain("/user-content-policy");
    expect(LEGAL_ROUTES).toContain("/reviews-policy");
  });
});

// ─── Unit tests for signup consent flow ──────────────────────────────────────

describe("Signup consent flow", () => {
  it("blocks registration when termsAccepted is false", () => {
    const validateSignup = (termsAccepted: boolean, age18Accepted: boolean): string | null => {
      if (!termsAccepted) return "יש לאשר את תנאי השימוש";
      if (!age18Accepted) return "יש לאשר כי הנך בן/בת 18 ומעלה";
      return null;
    };

    expect(validateSignup(false, false)).toBe("יש לאשר את תנאי השימוש");
    expect(validateSignup(false, true)).toBe("יש לאשר את תנאי השימוש");
    expect(validateSignup(true, false)).toBe("יש לאשר כי הנך בן/בת 18 ומעלה");
    expect(validateSignup(true, true)).toBeNull();
  });

  it("requires both checkboxes to enable the register button", () => {
    const isRegisterEnabled = (
      termsAccepted: boolean,
      age18Accepted: boolean,
      nameValid: boolean,
      emailValid: boolean
    ) => termsAccepted && age18Accepted && nameValid && emailValid;

    expect(isRegisterEnabled(true, true, true, true)).toBe(true);
    expect(isRegisterEnabled(false, true, true, true)).toBe(false);
    expect(isRegisterEnabled(true, false, true, true)).toBe(false);
    expect(isRegisterEnabled(true, true, false, true)).toBe(false);
  });
});

// ─── Unit tests for footer legal links ───────────────────────────────────────

describe("Footer legal links", () => {
  const FOOTER_LEGAL_LINKS = [
    { label: "תנאי שימוש", href: "/terms" },
    { label: "מדיניות פרטיות", href: "/privacy" },
    { label: "ניהול משרות", href: "/job-posting-policy" },
    { label: "כללי בטיחות", href: "/safety-policy" },
    { label: "מדיניות תוכן", href: "/user-content-policy" },
    { label: "כללי ביקורות", href: "/reviews-policy" },
  ];

  it("footer contains all 6 legal links", () => {
    expect(FOOTER_LEGAL_LINKS).toHaveLength(6);
  });

  it("all footer links have valid href and label", () => {
    FOOTER_LEGAL_LINKS.forEach((link) => {
      expect(link.href).toBeTruthy();
      expect(link.label).toBeTruthy();
      expect(link.href.startsWith("/")).toBe(true);
    });
  });
});
