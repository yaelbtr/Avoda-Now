/**
 * Unit tests for APPLICATION_STATUS_LABELS and getApplicationStatusLabel.
 *
 * These are pure-function tests with no DB or network dependencies.
 */

import { describe, it, expect } from "vitest";
import { APPLICATION_STATUS_LABELS, getApplicationStatusLabel } from "./const";

// ─── Known statuses ───────────────────────────────────────────────────────────

const KNOWN_STATUSES = [
  "pending",
  "viewed",
  "accepted",
  "rejected",
  "offered",
  "offer_rejected",
] as const;

describe("APPLICATION_STATUS_LABELS", () => {
  it("contains all known application statuses", () => {
    for (const status of KNOWN_STATUSES) {
      expect(APPLICATION_STATUS_LABELS).toHaveProperty(status);
    }
  });

  it("every entry has non-empty label, color, bg, and tooltip", () => {
    for (const [key, cfg] of Object.entries(APPLICATION_STATUS_LABELS)) {
      expect(cfg.label,   `${key}.label should be non-empty`).toBeTruthy();
      expect(cfg.color,   `${key}.color should be non-empty`).toBeTruthy();
      expect(cfg.bg,      `${key}.bg should be non-empty`).toBeTruthy();
      expect(cfg.tooltip, `${key}.tooltip should be non-empty`).toBeTruthy();
    }
  });
});

// ─── getApplicationStatusLabel ────────────────────────────────────────────────

describe("getApplicationStatusLabel", () => {
  it("returns the correct label for 'pending'", () => {
    const cfg = getApplicationStatusLabel("pending");
    expect(cfg.label).toBe("הגיש בקשה");
  });

  it("returns the correct label for 'offered'", () => {
    const cfg = getApplicationStatusLabel("offered");
    expect(cfg.label).toBe("ממתין לתשובת עובד");
  });

  it("returns the correct label for 'offer_rejected'", () => {
    const cfg = getApplicationStatusLabel("offer_rejected");
    expect(cfg.label).toBe("עובד דחה הצעה");
  });

  it("returns the correct label for 'accepted'", () => {
    const cfg = getApplicationStatusLabel("accepted");
    expect(cfg.label).toBe("התקבל");
  });

  it("returns the correct label for 'rejected'", () => {
    const cfg = getApplicationStatusLabel("rejected");
    expect(cfg.label).toBe("נדחה");
  });

  it("returns the correct label for 'viewed'", () => {
    const cfg = getApplicationStatusLabel("viewed");
    expect(cfg.label).toBe("נצפה, ממתין לתשובה");
  });

  it("returns a safe fallback for unknown status", () => {
    const cfg = getApplicationStatusLabel("unknown_xyz");
    // Fallback label should equal the raw status string
    expect(cfg.label).toBe("unknown_xyz");
    // Fallback should still have color, bg, and tooltip
    expect(cfg.color).toBeTruthy();
    expect(cfg.bg).toBeTruthy();
    expect(cfg.tooltip).toBeTruthy();
  });

  it("returns correct tooltip for 'offered'", () => {
    const cfg = getApplicationStatusLabel("offered");
    expect(cfg.tooltip).toContain("הצעת");
  });

  it("returns correct tooltip for 'offered_accepted'", () => {
    const cfg = getApplicationStatusLabel("offered_accepted");
    expect(cfg.tooltip).toContain("אישר");
  });
});
