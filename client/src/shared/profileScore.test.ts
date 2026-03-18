/**
 * Unit tests for shared/profileScore.ts
 *
 * Covers calcProfileScore and calcProfileMissingItems across:
 *  - null / undefined input (guard clause)
 *  - completely empty profile (all fields missing)
 *  - fully complete profile (all 7 checks pass)
 *  - each field in isolation (one field filled, rest empty)
 *  - whitespace-only strings (should be treated as missing)
 *  - location alternatives: preferredCity vs workerLatitude
 *  - empty-array fields: preferredCategories, preferredDays
 *  - partial profiles (various combinations)
 *  - score rounding (Math.round boundary)
 *  - missing-items list correctness and ordering
 */

import { describe, it, expect } from "vitest";
import {
  calcProfileScore,
  calcProfileMissingItems,
  type ProfileScoreInput,
} from "./profileScore";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const EMPTY_PROFILE: ProfileScoreInput = {};

const FULL_PROFILE: ProfileScoreInput = {
  name: "יעל כהן",
  profilePhoto: "https://cdn.example.com/photo.jpg",
  preferredCategories: ["cleaning", "childcare"],
  preferredCity: "תל אביב",
  workerBio: "עובדת מסורה עם ניסיון של 5 שנים",
  preferenceText: "מעדיפה בוקר, קרוב לבית",
  preferredDays: ["sunday", "monday", "tuesday"],
};

// All 7 Hebrew labels in the order they appear in the source
const ALL_MISSING_LABELS = [
  "שם מלא",
  "תמונת פרופיל",
  "קטגוריות עבודה",
  "אזור מועדף",
  "ביו קצר",
  "תיאור העדפות",
  "ימים מועדפים",
];

// ── calcProfileScore ──────────────────────────────────────────────────────────

describe("calcProfileScore", () => {
  // ── Guard clauses ────────────────────────────────────────────────────────

  it("returns 0 for null input", () => {
    expect(calcProfileScore(null)).toBe(0);
  });

  it("returns 0 for undefined input", () => {
    expect(calcProfileScore(undefined)).toBe(0);
  });

  // ── Boundary profiles ────────────────────────────────────────────────────

  it("returns 0 for a completely empty profile object", () => {
    expect(calcProfileScore(EMPTY_PROFILE)).toBe(0);
  });

  it("returns 100 for a fully complete profile", () => {
    expect(calcProfileScore(FULL_PROFILE)).toBe(100);
  });

  // ── Each field in isolation (1/7 ≈ 14%, rounds to 14) ───────────────────

  it("scores 14 when only name is filled", () => {
    expect(calcProfileScore({ name: "יעל" })).toBe(14);
  });

  it("scores 14 when only profilePhoto is filled", () => {
    expect(calcProfileScore({ profilePhoto: "https://cdn.example.com/p.jpg" })).toBe(14);
  });

  it("scores 14 when only preferredCategories has one entry", () => {
    expect(calcProfileScore({ preferredCategories: ["cleaning"] })).toBe(14);
  });

  it("scores 14 when only preferredCity is filled", () => {
    expect(calcProfileScore({ preferredCity: "חיפה" })).toBe(14);
  });

  it("scores 14 when only workerLatitude is set (location alternative)", () => {
    expect(calcProfileScore({ workerLatitude: 32.08 })).toBe(14);
  });

  it("scores 14 when only workerBio is filled", () => {
    expect(calcProfileScore({ workerBio: "ניסיון בניקיון" })).toBe(14);
  });

  it("scores 14 when only preferenceText is filled", () => {
    expect(calcProfileScore({ preferenceText: "בוקר בלבד" })).toBe(14);
  });

  it("scores 14 when only preferredDays has one entry", () => {
    expect(calcProfileScore({ preferredDays: ["sunday"] })).toBe(14);
  });

  // ── Whitespace-only strings must be treated as missing ───────────────────

  it("treats whitespace-only name as missing", () => {
    expect(calcProfileScore({ name: "   " })).toBe(0);
  });

  it("treats whitespace-only workerBio as missing", () => {
    expect(calcProfileScore({ workerBio: "\t\n " })).toBe(0);
  });

  it("treats whitespace-only preferenceText as missing", () => {
    expect(calcProfileScore({ preferenceText: "  " })).toBe(0);
  });

  // ── Null values for optional fields ─────────────────────────────────────

  it("treats null name as missing", () => {
    expect(calcProfileScore({ name: null })).toBe(0);
  });

  it("treats null profilePhoto as missing", () => {
    expect(calcProfileScore({ profilePhoto: null })).toBe(0);
  });

  it("treats null preferredCity with no workerLatitude as missing location", () => {
    expect(calcProfileScore({ preferredCity: null, workerLatitude: null })).toBe(0);
  });

  it("treats null workerBio as missing", () => {
    expect(calcProfileScore({ workerBio: null })).toBe(0);
  });

  it("treats null preferenceText as missing", () => {
    expect(calcProfileScore({ preferenceText: null })).toBe(0);
  });

  // ── Empty arrays ─────────────────────────────────────────────────────────

  it("treats empty preferredCategories array as missing", () => {
    expect(calcProfileScore({ preferredCategories: [] })).toBe(0);
  });

  it("treats empty preferredDays array as missing", () => {
    expect(calcProfileScore({ preferredDays: [] })).toBe(0);
  });

  // ── Location: preferredCity OR workerLatitude is sufficient ─────────────

  it("counts location as filled when preferredCity is set (no lat)", () => {
    const score = calcProfileScore({ preferredCity: "ירושלים" });
    expect(score).toBe(14);
  });

  it("counts location as filled when workerLatitude is set (no city)", () => {
    const score = calcProfileScore({ workerLatitude: 31.77 });
    expect(score).toBe(14);
  });

  it("does not double-count location when both city and lat are set", () => {
    // Both set → still only 1 check out of 7
    const score = calcProfileScore({ preferredCity: "תל אביב", workerLatitude: 32.08 });
    expect(score).toBe(14);
  });

  // ── Partial profiles ─────────────────────────────────────────────────────

  it("scores 29 for 2/7 fields (name + photo)", () => {
    expect(
      calcProfileScore({ name: "יעל", profilePhoto: "https://cdn.example.com/p.jpg" })
    ).toBe(29);
  });

  it("scores 43 for 3/7 fields", () => {
    expect(
      calcProfileScore({
        name: "יעל",
        profilePhoto: "https://cdn.example.com/p.jpg",
        preferredCategories: ["cleaning"],
      })
    ).toBe(43);
  });

  it("scores 57 for 4/7 fields", () => {
    expect(
      calcProfileScore({
        name: "יעל",
        profilePhoto: "https://cdn.example.com/p.jpg",
        preferredCategories: ["cleaning"],
        preferredCity: "חיפה",
      })
    ).toBe(57);
  });

  it("scores 71 for 5/7 fields", () => {
    expect(
      calcProfileScore({
        name: "יעל",
        profilePhoto: "https://cdn.example.com/p.jpg",
        preferredCategories: ["cleaning"],
        preferredCity: "חיפה",
        workerBio: "ניסיון רב",
      })
    ).toBe(71);
  });

  it("scores 86 for 6/7 fields", () => {
    expect(
      calcProfileScore({
        name: "יעל",
        profilePhoto: "https://cdn.example.com/p.jpg",
        preferredCategories: ["cleaning"],
        preferredCity: "חיפה",
        workerBio: "ניסיון רב",
        preferenceText: "בוקר בלבד",
      })
    ).toBe(86);
  });

  // ── Score rounding ───────────────────────────────────────────────────────

  it("rounds 1/7 (14.28…) to 14", () => {
    expect(calcProfileScore({ name: "יעל" })).toBe(14);
  });

  it("rounds 3/7 (42.85…) to 43", () => {
    expect(
      calcProfileScore({
        name: "יעל",
        profilePhoto: "https://cdn.example.com/p.jpg",
        preferredCategories: ["cleaning"],
      })
    ).toBe(43);
  });

  it("rounds 5/7 (71.42…) to 71", () => {
    expect(
      calcProfileScore({
        name: "יעל",
        profilePhoto: "https://cdn.example.com/p.jpg",
        preferredCategories: ["cleaning"],
        preferredCity: "חיפה",
        workerBio: "ניסיון רב",
      })
    ).toBe(71);
  });

  it("rounds 6/7 (85.71…) to 86", () => {
    expect(
      calcProfileScore({
        name: "יעל",
        profilePhoto: "https://cdn.example.com/p.jpg",
        preferredCategories: ["cleaning"],
        preferredCity: "חיפה",
        workerBio: "ניסיון רב",
        preferenceText: "בוקר",
      })
    ).toBe(86);
  });
});

// ── calcProfileMissingItems ───────────────────────────────────────────────────

describe("calcProfileMissingItems", () => {
  // ── Guard clauses ────────────────────────────────────────────────────────

  it("returns all 7 labels for null input", () => {
    expect(calcProfileMissingItems(null)).toEqual(ALL_MISSING_LABELS);
  });

  it("returns all 7 labels for undefined input", () => {
    expect(calcProfileMissingItems(undefined)).toEqual(ALL_MISSING_LABELS);
  });

  // ── Empty / full profiles ────────────────────────────────────────────────

  it("returns all 7 labels for an empty profile object", () => {
    expect(calcProfileMissingItems(EMPTY_PROFILE)).toEqual(ALL_MISSING_LABELS);
  });

  it("returns an empty array for a fully complete profile", () => {
    expect(calcProfileMissingItems(FULL_PROFILE)).toEqual([]);
  });

  // ── Each field individually ──────────────────────────────────────────────

  it("omits 'שם מלא' when name is filled", () => {
    const missing = calcProfileMissingItems({ name: "יעל" });
    expect(missing).not.toContain("שם מלא");
    expect(missing).toHaveLength(6);
  });

  it("omits 'תמונת פרופיל' when profilePhoto is filled", () => {
    const missing = calcProfileMissingItems({ profilePhoto: "https://cdn.example.com/p.jpg" });
    expect(missing).not.toContain("תמונת פרופיל");
    expect(missing).toHaveLength(6);
  });

  it("omits 'קטגוריות עבודה' when preferredCategories has entries", () => {
    const missing = calcProfileMissingItems({ preferredCategories: ["cleaning"] });
    expect(missing).not.toContain("קטגוריות עבודה");
    expect(missing).toHaveLength(6);
  });

  it("omits 'אזור מועדף' when preferredCity is filled", () => {
    const missing = calcProfileMissingItems({ preferredCity: "חיפה" });
    expect(missing).not.toContain("אזור מועדף");
    expect(missing).toHaveLength(6);
  });

  it("omits 'אזור מועדף' when workerLatitude is set", () => {
    const missing = calcProfileMissingItems({ workerLatitude: 32.08 });
    expect(missing).not.toContain("אזור מועדף");
    expect(missing).toHaveLength(6);
  });

  it("omits 'ביו קצר' when workerBio is filled", () => {
    const missing = calcProfileMissingItems({ workerBio: "ניסיון בניקיון" });
    expect(missing).not.toContain("ביו קצר");
    expect(missing).toHaveLength(6);
  });

  it("omits 'תיאור העדפות' when preferenceText is filled", () => {
    const missing = calcProfileMissingItems({ preferenceText: "בוקר בלבד" });
    expect(missing).not.toContain("תיאור העדפות");
    expect(missing).toHaveLength(6);
  });

  it("omits 'ימים מועדפים' when preferredDays has entries", () => {
    const missing = calcProfileMissingItems({ preferredDays: ["sunday"] });
    expect(missing).not.toContain("ימים מועדפים");
    expect(missing).toHaveLength(6);
  });

  // ── Whitespace-only strings are still missing ────────────────────────────

  it("includes 'שם מלא' when name is whitespace-only", () => {
    expect(calcProfileMissingItems({ name: "   " })).toContain("שם מלא");
  });

  it("includes 'ביו קצר' when workerBio is whitespace-only", () => {
    expect(calcProfileMissingItems({ workerBio: "\t" })).toContain("ביו קצר");
  });

  it("includes 'תיאור העדפות' when preferenceText is whitespace-only", () => {
    expect(calcProfileMissingItems({ preferenceText: "  " })).toContain("תיאור העדפות");
  });

  // ── Empty arrays are still missing ──────────────────────────────────────

  it("includes 'קטגוריות עבודה' when preferredCategories is empty array", () => {
    expect(calcProfileMissingItems({ preferredCategories: [] })).toContain("קטגוריות עבודה");
  });

  it("includes 'ימים מועדפים' when preferredDays is empty array", () => {
    expect(calcProfileMissingItems({ preferredDays: [] })).toContain("ימים מועדפים");
  });

  // ── Null values ──────────────────────────────────────────────────────────

  it("includes 'שם מלא' when name is null", () => {
    expect(calcProfileMissingItems({ name: null })).toContain("שם מלא");
  });

  it("includes 'תמונת פרופיל' when profilePhoto is null", () => {
    expect(calcProfileMissingItems({ profilePhoto: null })).toContain("תמונת פרופיל");
  });

  it("includes 'אזור מועדף' when both preferredCity and workerLatitude are null", () => {
    expect(
      calcProfileMissingItems({ preferredCity: null, workerLatitude: null })
    ).toContain("אזור מועדף");
  });

  // ── Output ordering ──────────────────────────────────────────────────────

  it("preserves the canonical label order in the output array", () => {
    // With all fields missing the order must match the source definition
    const missing = calcProfileMissingItems(EMPTY_PROFILE);
    expect(missing).toEqual(ALL_MISSING_LABELS);
  });

  it("preserves order when only some labels are present", () => {
    // Fill name + bio → remaining 5 labels must still appear in order
    const missing = calcProfileMissingItems({ name: "יעל", workerBio: "ניסיון" });
    expect(missing).toEqual([
      "תמונת פרופיל",
      "קטגוריות עבודה",
      "אזור מועדף",
      "תיאור העדפות",
      "ימים מועדפים",
    ]);
  });

  // ── Consistency with calcProfileScore ───────────────────────────────────

  it("missing count is consistent with score: 0 missing → 100%", () => {
    expect(calcProfileMissingItems(FULL_PROFILE)).toHaveLength(0);
    expect(calcProfileScore(FULL_PROFILE)).toBe(100);
  });

  it("missing count is consistent with score: 7 missing → 0%", () => {
    expect(calcProfileMissingItems(EMPTY_PROFILE)).toHaveLength(7);
    expect(calcProfileScore(EMPTY_PROFILE)).toBe(0);
  });

  it("missing count + filled count always equals 7", () => {
    const profiles: ProfileScoreInput[] = [
      {},
      { name: "יעל" },
      { name: "יעל", profilePhoto: "url" },
      { name: "יעל", profilePhoto: "url", preferredCategories: ["x"] },
      { name: "יעל", profilePhoto: "url", preferredCategories: ["x"], preferredCity: "עיר" },
      FULL_PROFILE,
    ];
    for (const p of profiles) {
      const missingCount = calcProfileMissingItems(p).length;
      const filledCount = 7 - missingCount;
      const expectedScore = Math.round((filledCount / 7) * 100);
      expect(calcProfileScore(p)).toBe(expectedScore);
    }
  });
});
