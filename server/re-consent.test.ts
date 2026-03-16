/**
 * Tests for the ReConsentModal blocking behavior and consent logic.
 *
 * Since the modal is a React component, these tests focus on the
 * server-side and shared-logic aspects:
 * - checkOutdatedConsents procedure logic (version comparison)
 * - Consent recording validation (valid types, version format)
 * - Blocking guarantee: only "terms" and "privacy" trigger the modal
 * - Edge cases: future versions, missing consents, partial acceptance
 */
import { describe, it, expect } from "vitest";
import {
  LEGAL_DOCUMENT_VERSIONS,
  LEGAL_DOCUMENT_LABELS,
  LEGAL_DOCUMENT_PATHS,
  type LegalConsentType,
} from "../shared/const";

// ─── Shared helper (mirrors server-side checkOutdatedConsents logic) ─────────

/**
 * Pure function that replicates the server-side outdated-consent detection.
 * Kept here to allow unit testing without a real DB connection.
 */
function detectOutdatedConsents(
  existingConsents: Array<{ consentType: LegalConsentType; documentVersion: string }>,
  currentVersions: typeof LEGAL_DOCUMENT_VERSIONS,
  coreTypes: LegalConsentType[] = ["terms", "privacy"]
): LegalConsentType[] {
  const existingMap = new Map(
    existingConsents.map((c) => [c.consentType, c.documentVersion])
  );
  const outdated: LegalConsentType[] = [];
  for (const [type, currentVersion] of Object.entries(currentVersions) as [LegalConsentType, string][]) {
    const accepted = existingMap.get(type);
    if (!accepted || accepted < currentVersion) {
      if (coreTypes.includes(type)) {
        outdated.push(type);
      }
    }
  }
  return outdated;
}

// ─── Blocking modal trigger conditions ───────────────────────────────────────

describe("ReConsentModal — trigger conditions", () => {
  it("does NOT show for users with all current consents", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: LEGAL_DOCUMENT_VERSIONS.terms },
      { consentType: "privacy" as LegalConsentType, documentVersion: LEGAL_DOCUMENT_VERSIONS.privacy },
    ];
    const outdated = detectOutdatedConsents(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(outdated).toHaveLength(0);
  });

  it("shows for a brand-new user who has never consented", () => {
    const outdated = detectOutdatedConsents([], LEGAL_DOCUMENT_VERSIONS);
    expect(outdated).toContain("terms");
    expect(outdated).toContain("privacy");
    expect(outdated).toHaveLength(2);
  });

  it("shows only for the document whose version is outdated", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: "2025-01" }, // stale
      { consentType: "privacy" as LegalConsentType, documentVersion: LEGAL_DOCUMENT_VERSIONS.privacy }, // current
    ];
    const outdated = detectOutdatedConsents(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(outdated).toContain("terms");
    expect(outdated).not.toContain("privacy");
    expect(outdated).toHaveLength(1);
  });

  it("shows for both documents when both are outdated", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: "2024-06" },
      { consentType: "privacy" as LegalConsentType, documentVersion: "2024-06" },
    ];
    const outdated = detectOutdatedConsents(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(outdated).toContain("terms");
    expect(outdated).toContain("privacy");
  });

  it("does NOT show when user has a future version (forward-compatible)", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: "2099-12" },
      { consentType: "privacy" as LegalConsentType, documentVersion: "2099-12" },
    ];
    const outdated = detectOutdatedConsents(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(outdated).toHaveLength(0);
  });
});

// ─── Non-blocking policy documents ───────────────────────────────────────────

describe("ReConsentModal — policy docs do NOT trigger blocking", () => {
  const policyTypes: LegalConsentType[] = [
    "job_posting_policy",
    "safety_policy",
    "user_content_policy",
    "reviews_policy",
    "age_18",
  ];

  it("never includes policy documents in the outdated list", () => {
    // No consents at all — only terms and privacy should be flagged
    const outdated = detectOutdatedConsents([], LEGAL_DOCUMENT_VERSIONS);
    for (const policyType of policyTypes) {
      expect(outdated, `${policyType} should not trigger the blocking modal`).not.toContain(policyType);
    }
  });

  it("does not block even when all policy consents are missing", () => {
    // User has current terms + privacy but no policy consents
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: LEGAL_DOCUMENT_VERSIONS.terms },
      { consentType: "privacy" as LegalConsentType, documentVersion: LEGAL_DOCUMENT_VERSIONS.privacy },
    ];
    const outdated = detectOutdatedConsents(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(outdated).toHaveLength(0);
  });
});

// ─── Version string format and comparison ────────────────────────────────────

describe("Version comparison correctness", () => {
  it("YYYY-MM lexicographic comparison works for same year", () => {
    expect("2026-03" > "2026-02").toBe(true);
    expect("2026-03" > "2026-01").toBe(true);
    expect("2026-03" < "2026-04").toBe(true);
  });

  it("YYYY-MM lexicographic comparison works across years", () => {
    expect("2026-01" > "2025-12").toBe(true);
    expect("2025-12" < "2026-01").toBe(true);
    expect("2026-03" > "2025-03").toBe(true);
  });

  it("equal versions are not considered outdated", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: "2026-03" },
      { consentType: "privacy" as LegalConsentType, documentVersion: "2026-03" },
    ];
    const outdated = detectOutdatedConsents(consents, {
      ...LEGAL_DOCUMENT_VERSIONS,
      terms: "2026-03",
      privacy: "2026-03",
    });
    expect(outdated).toHaveLength(0);
  });

  it("all current LEGAL_DOCUMENT_VERSIONS follow YYYY-MM format", () => {
    const pattern = /^\d{4}-\d{2}$/;
    for (const [type, version] of Object.entries(LEGAL_DOCUMENT_VERSIONS)) {
      expect(version, `${type} version "${version}" must match YYYY-MM`).toMatch(pattern);
    }
  });
});

// ─── Consent type validation ──────────────────────────────────────────────────

describe("Consent type validation", () => {
  const validTypes: LegalConsentType[] = [
    "terms",
    "privacy",
    "age_18",
    "job_posting_policy",
    "safety_policy",
    "user_content_policy",
    "reviews_policy",
  ];

  it("all 7 consent types are defined in LEGAL_DOCUMENT_VERSIONS", () => {
    const keys = Object.keys(LEGAL_DOCUMENT_VERSIONS) as LegalConsentType[];
    expect(keys.sort()).toEqual(validTypes.sort());
  });

  it("every consent type has a Hebrew label", () => {
    const hebrewPattern = /[\u05D0-\u05EA]/;
    for (const type of validTypes) {
      expect(LEGAL_DOCUMENT_LABELS[type], `${type} must have a Hebrew label`).toMatch(hebrewPattern);
    }
  });

  it("every consent type has a valid path starting with /", () => {
    for (const type of validTypes) {
      expect(LEGAL_DOCUMENT_PATHS[type], `${type} must have a path`).toMatch(/^\//);
    }
  });
});

// ─── Idempotency: re-consenting to current version should not re-trigger ──────

describe("Re-consent idempotency", () => {
  it("after re-consenting, the same version is no longer outdated", () => {
    const currentVersion = LEGAL_DOCUMENT_VERSIONS.terms;
    // Simulate: user just re-consented to current version
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: currentVersion },
      { consentType: "privacy" as LegalConsentType, documentVersion: LEGAL_DOCUMENT_VERSIONS.privacy },
    ];
    const outdated = detectOutdatedConsents(consents, LEGAL_DOCUMENT_VERSIONS);
    expect(outdated).not.toContain("terms");
    expect(outdated).toHaveLength(0);
  });

  it("bumping a version makes previously-current consents outdated", () => {
    const consents = [
      { consentType: "terms" as LegalConsentType, documentVersion: "2026-03" },
      { consentType: "privacy" as LegalConsentType, documentVersion: "2026-03" },
    ];
    // Simulate a future version bump
    const futureVersions = { ...LEGAL_DOCUMENT_VERSIONS, terms: "2026-06" };
    const outdated = detectOutdatedConsents(consents, futureVersions);
    expect(outdated).toContain("terms");
    expect(outdated).not.toContain("privacy");
  });
});
