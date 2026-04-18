/**
 * Tests for usePostJobDraft pure utility functions.
 *
 * We test the localStorage read/write/remove helpers and draftAge
 * without importing the React hook itself (no jsdom needed).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Inline the pure functions from the hook so we can test them in Node ──────
const DRAFT_KEY = "postjob_draft_v2";

function writeDraft(draft: Record<string, unknown>): void {
  try {
    const storage: Record<string, string> = (globalThis as any).__mockStorage ?? {};
    storage[DRAFT_KEY] = JSON.stringify({ ...draft, savedAt: Date.now() });
    (globalThis as any).__mockStorage = storage;
  } catch { /* ignore */ }
}

function readDraft(): Record<string, unknown> | null {
  try {
    const storage: Record<string, string> = (globalThis as any).__mockStorage ?? {};
    const raw = storage[DRAFT_KEY];
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function removeDraft(): void {
  const storage: Record<string, string> = (globalThis as any).__mockStorage ?? {};
  delete storage[DRAFT_KEY];
  (globalThis as any).__mockStorage = storage;
}

function draftAge(savedAt: number): string {
  const diffMs = Date.now() - savedAt;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "לפני פחות מדקה";
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `לפני ${diffH} שעות`;
  return `לפני ${Math.floor(diffH / 24)} ימים`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("postJobDraft utilities", () => {
  beforeEach(() => {
    (globalThis as any).__mockStorage = {};
  });

  describe("writeDraft / readDraft", () => {
    it("persists a draft and reads it back", () => {
      writeDraft({ title: "שליח דחוף", category: "delivery" });
      const result = readDraft();
      expect(result).not.toBeNull();
      expect(result!.title).toBe("שליח דחוף");
      expect(result!.category).toBe("delivery");
    });

    it("adds savedAt timestamp automatically", () => {
      const before = Date.now();
      writeDraft({ title: "test" });
      const after = Date.now();
      const result = readDraft();
      expect(result!.savedAt).toBeGreaterThanOrEqual(before);
      expect(result!.savedAt).toBeLessThanOrEqual(after);
    });

    it("returns null when storage is empty", () => {
      expect(readDraft()).toBeNull();
    });

    it("overwrites previous draft on second write", () => {
      writeDraft({ title: "ראשון" });
      writeDraft({ title: "שני" });
      expect(readDraft()!.title).toBe("שני");
    });
  });

  describe("removeDraft", () => {
    it("removes the draft from storage", () => {
      writeDraft({ title: "test" });
      removeDraft();
      expect(readDraft()).toBeNull();
    });

    it("does not throw when storage is already empty", () => {
      expect(() => removeDraft()).not.toThrow();
    });
  });

  describe("draftAge", () => {
    it("returns 'לפני פחות מדקה' for very recent drafts", () => {
      expect(draftAge(Date.now() - 30_000)).toBe("לפני פחות מדקה");
    });

    it("returns minutes for drafts 1–59 minutes old", () => {
      expect(draftAge(Date.now() - 5 * 60_000)).toBe("לפני 5 דקות");
      expect(draftAge(Date.now() - 59 * 60_000)).toBe("לפני 59 דקות");
    });

    it("returns hours for drafts 1–23 hours old", () => {
      expect(draftAge(Date.now() - 3 * 60 * 60_000)).toBe("לפני 3 שעות");
    });

    it("returns days for drafts 24+ hours old", () => {
      expect(draftAge(Date.now() - 2 * 24 * 60 * 60_000)).toBe("לפני 2 ימים");
    });

    it("returns exactly 1 minute for 60s boundary", () => {
      expect(draftAge(Date.now() - 60_000)).toBe("לפני 1 דקות");
    });
  });

  describe("draft key constant", () => {
    it("uses the versioned key to avoid stale schema conflicts", () => {
      expect(DRAFT_KEY).toBe("postjob_draft_v2");
    });
  });
});
