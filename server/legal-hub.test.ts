/**
 * Tests for legal hub features:
 * - LEGAL_DOCUMENT_VERSIONS constant completeness and format
 * - checkOutdatedConsents logic (version comparison)
 * - LEGAL_DOCUMENT_LABELS and LEGAL_DOCUMENT_PATHS completeness
 */
import { describe, it, expect } from "vitest";
import {
  LEGAL_DOCUMENT_VERSIONS,
  LEGAL_DOCUMENT_LABELS,
  LEGAL_DOCUMENT_PATHS,
  type LegalConsentType,
} from "../shared/const";

// ─── LEGAL_DOCUMENT_VERSIONS ────────────────────────────────────────────────

describe("LEGAL_DOCUMENT_VERSIONS", () => {
  const expectedTypes: LegalConsentType[] = [
    "terms",
    "privacy",
    "age_18",
    "job_posting_policy",
    "safety_policy",
    "user_content_policy",
    "reviews_policy",
  ];

  it("contains all 7 required consent types", () => {
    const keys = Object.keys(LEGAL_DOCUMENT_VERSIONS) as LegalConsentType[];
    expect(keys.sort()).toEqual(expectedTypes.sort());
  });

  it("all versions follow YYYY-MM format", () => {
    const versionPattern = /^\d{4}-\d{2}$/;
    for (const [type, version] of Object.entries(LEGAL_DOCUMENT_VERSIONS)) {
      expect(version, `${type} version "${version}" should match YYYY-MM`).toMatch(versionPattern);
    }
  });

  it("all versions are in 2026 or later (not stale)", () => {
    for (const [type, version] of Object.entries(LEGAL_DOCUMENT_VERSIONS)) {
      const year = parseInt(version.split("-")[0], 10);
      expect(year, `${type} version year should be >= 2026`).toBeGreaterThanOrEqual(2026);
    }
  });
});

// ─── LEGAL_DOCUMENT_LABELS ──────────────────────────────────────────────────

describe("LEGAL_DOCUMENT_LABELS", () => {
  it("has a label for every consent type in LEGAL_DOCUMENT_VERSIONS", () => {
    for (const type of Object.keys(LEGAL_DOCUMENT_VERSIONS) as LegalConsentType[]) {
      expect(LEGAL_DOCUMENT_LABELS[type], `Missing label for ${type}`).toBeDefined();
      expect(LEGAL_DOCUMENT_LABELS[type].length, `Label for ${type} should not be empty`).toBeGreaterThan(0);
    }
  });

  it("labels are in Hebrew", () => {
    const hebrewPattern = /[\u05D0-\u05EA]/;
    for (const [type, label] of Object.entries(LEGAL_DOCUMENT_LABELS)) {
      expect(label, `Label for ${type} should contain Hebrew characters`).toMatch(hebrewPattern);
    }
  });
});

// ─── LEGAL_DOCUMENT_PATHS ───────────────────────────────────────────────────

describe("LEGAL_DOCUMENT_PATHS", () => {
  it("has a path for every consent type in LEGAL_DOCUMENT_VERSIONS", () => {
    for (const type of Object.keys(LEGAL_DOCUMENT_VERSIONS) as LegalConsentType[]) {
      expect(LEGAL_DOCUMENT_PATHS[type], `Missing path for ${type}`).toBeDefined();
    }
  });

  it("all paths start with /", () => {
    for (const [type, path] of Object.entries(LEGAL_DOCUMENT_PATHS)) {
      expect(path, `Path for ${type} should start with /`).toMatch(/^\//);
    }
  });

  it("paths reference existing legal routes", () => {
    const validPaths = [
      "/terms",
      "/privacy",
      "/job-posting-policy",
      "/safety-policy",
      "/user-content-policy",
      "/reviews-policy",
    ];
    for (const [type, path] of Object.entries(LEGAL_DOCUMENT_PATHS)) {
      expect(validPaths, `Path "${path}" for ${type} is not a known legal route`).toContain(path);
    }
  });
});

// ─── Outdated consent detection logic ───────────────────────────────────────

describe("Outdated consent detection logic", () => {
  /**
   * Simulates the server-side checkOutdatedConsents logic
   * without needing a real DB connection.
   */
  function detectOutdated(
    existingConsents: Array<{ consentType: LegalConsentType; documentVersion: string }>,
    currentVersions: typeof LEGAL_DOCUMENT_VERSIONS,
    flaggedTypes: LegalConsentType[] = ["terms", "privacy"]
  ): LegalConsentType[] {
    const existingMap = new Map(
      existingConsents.map((c) => [c.consentType, c.documentVersion])
    );
    const outdated: LegalConsentType[] = [];
    for (const [type, currentVersion] of Object.entries(currentVersions) as [LegalConsentType, string][]) {
      const acceptedVersion = existingMap.get(type);
      if (!acceptedVersion || acceptedVersion < currentVersion) {
        if (flaggedTypes.includes(type)) {
          outdated.push(type);
        }
      }
    }
    return outdated;
  }

  it("returns empty array when all core consents are up-to-date", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: "2026-03" },
      { consentType: "privacy" as LegalConsentType, documentVersion: "2026-03" },
    ];
    const result = detectOutdated(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(result).toHaveLength(0);
  });

  it("returns outdated types when user accepted older version", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: "2025-01" }, // older
      { consentType: "privacy" as LegalConsentType, documentVersion: "2026-03" }, // current
    ];
    const result = detectOutdated(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(result).toContain("terms");
    expect(result).not.toContain("privacy");
  });

  it("returns both types when user has never accepted either", () => {
    const result = detectOutdated([], LEGAL_DOCUMENT_VERSIONS);
    expect(result).toContain("terms");
    expect(result).toContain("privacy");
  });

  it("does not flag policy docs (only terms and privacy are core)", () => {
    const consents: Array<{ consentType: LegalConsentType; documentVersion: string }> = [];
    const result = detectOutdated(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(result).not.toContain("job_posting_policy");
    expect(result).not.toContain("safety_policy");
    expect(result).not.toContain("user_content_policy");
    expect(result).not.toContain("reviews_policy");
    expect(result).not.toContain("age_18");
  });

  it("returns empty when user has future version (edge case)", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: "2099-12" }, // future
      { consentType: "privacy" as LegalConsentType, documentVersion: "2099-12" },
    ];
    const result = detectOutdated(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(result).toHaveLength(0);
  });

  it("version comparison is lexicographic (YYYY-MM format works correctly)", () => {
    // "2026-03" > "2026-02" > "2025-12"
    expect("2026-03" > "2026-02").toBe(true);
    expect("2026-03" > "2025-12").toBe(true);
    expect("2026-03" < "2026-04").toBe(true);
  });
});
