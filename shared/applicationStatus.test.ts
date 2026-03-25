/**
 * Unit tests for APPLICATION_STATUS_LABELS and getApplicationStatusLabel.
 *
 * These are pure-function tests with no DB or network dependencies.
 *
 * Schema change: APPLICATION_STATUS_LABELS now has four perspective-aware fields
 * per status: workerLabel, employerLabel, workerTooltip, employerTooltip.
 * getApplicationStatusLabel() accepts a second `perspective` arg ("worker"|"employer")
 * and returns { label, color, bg, tooltip } resolved for that perspective.
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
  "offered_accepted",
] as const;

describe("APPLICATION_STATUS_LABELS", () => {
  it("contains all known application statuses", () => {
    for (const status of KNOWN_STATUSES) {
      expect(APPLICATION_STATUS_LABELS).toHaveProperty(status);
    }
  });

  it("every entry has non-empty workerLabel, employerLabel, color, bg, workerTooltip, employerTooltip", () => {
    for (const [key, cfg] of Object.entries(APPLICATION_STATUS_LABELS)) {
      expect(cfg.workerLabel,    `${key}.workerLabel should be non-empty`).toBeTruthy();
      expect(cfg.employerLabel,  `${key}.employerLabel should be non-empty`).toBeTruthy();
      expect(cfg.color,          `${key}.color should be non-empty`).toBeTruthy();
      expect(cfg.bg,             `${key}.bg should be non-empty`).toBeTruthy();
      expect(cfg.workerTooltip,  `${key}.workerTooltip should be non-empty`).toBeTruthy();
      expect(cfg.employerTooltip,`${key}.employerTooltip should be non-empty`).toBeTruthy();
    }
  });
});

// ─── getApplicationStatusLabel — employer perspective (default) ───────────────

describe("getApplicationStatusLabel — employer perspective (default)", () => {
  it("returns the correct employerLabel for 'pending'", () => {
    const cfg = getApplicationStatusLabel("pending");
    expect(cfg.label).toBe("הגיש בקשה");
  });

  it("returns the correct employerLabel for 'offered'", () => {
    const cfg = getApplicationStatusLabel("offered");
    expect(cfg.label).toBe("ממתין לתשובת עובד");
  });

  it("returns the correct employerLabel for 'offer_rejected'", () => {
    const cfg = getApplicationStatusLabel("offer_rejected");
    expect(cfg.label).toBe("עובד דחה הצעה");
  });

  it("returns the correct employerLabel for 'accepted'", () => {
    const cfg = getApplicationStatusLabel("accepted");
    expect(cfg.label).toBe("התקבל");
  });

  it("returns the correct employerLabel for 'rejected'", () => {
    const cfg = getApplicationStatusLabel("rejected");
    expect(cfg.label).toBe("נדחה");
  });

  it("returns the correct employerLabel for 'viewed'", () => {
    const cfg = getApplicationStatusLabel("viewed");
    expect(cfg.label).toBe("נצפה, טרם החליט");
  });

  it("returns a safe fallback for unknown status", () => {
    const cfg = getApplicationStatusLabel("unknown_xyz");
    expect(cfg.label).toBe("unknown_xyz");
    expect(cfg.color).toBeTruthy();
    expect(cfg.bg).toBeTruthy();
    expect(cfg.tooltip).toBeTruthy();
  });

  it("returns correct employerTooltip for 'offered'", () => {
    const cfg = getApplicationStatusLabel("offered");
    expect(cfg.tooltip).toContain("הצעת");
  });

  it("returns correct employerTooltip for 'offered_accepted'", () => {
    const cfg = getApplicationStatusLabel("offered_accepted");
    expect(cfg.tooltip).toContain("אישר");
  });
});

// ─── getApplicationStatusLabel — worker perspective ───────────────────────────

describe("getApplicationStatusLabel — worker perspective", () => {
  it("returns the correct workerLabel for 'pending'", () => {
    const cfg = getApplicationStatusLabel("pending", "worker");
    expect(cfg.label).toBe("הגשתי בקשה");
  });

  it("returns the correct workerLabel for 'offered'", () => {
    const cfg = getApplicationStatusLabel("offered", "worker");
    expect(cfg.label).toBe("קיבלתי הצעה");
  });

  it("returns the correct workerLabel for 'offer_rejected'", () => {
    const cfg = getApplicationStatusLabel("offer_rejected", "worker");
    expect(cfg.label).toBe("דחיתי את ההצעה");
  });

  it("returns the correct workerLabel for 'accepted'", () => {
    const cfg = getApplicationStatusLabel("accepted", "worker");
    expect(cfg.label).toBe("התקבלתי");
  });

  it("returns the correct workerLabel for 'rejected'", () => {
    const cfg = getApplicationStatusLabel("rejected", "worker");
    expect(cfg.label).toBe("בקשתי נדחתה");
  });

  it("returns the correct workerLabel for 'viewed'", () => {
    const cfg = getApplicationStatusLabel("viewed", "worker");
    expect(cfg.label).toBe("נצפה, ממתין לתשובה");
  });

  it("returns the correct workerLabel for 'offered_accepted'", () => {
    const cfg = getApplicationStatusLabel("offered_accepted", "worker");
    expect(cfg.label).toBe("אישרתי את ההצעה");
  });

  it("returns correct workerTooltip for 'offered'", () => {
    const cfg = getApplicationStatusLabel("offered", "worker");
    expect(cfg.tooltip).toContain("הצעת");
  });

  it("returns correct workerTooltip for 'offered_accepted'", () => {
    const cfg = getApplicationStatusLabel("offered_accepted", "worker");
    expect(cfg.tooltip).toContain("אישרת");
  });
});

// ─── Perspective symmetry ─────────────────────────────────────────────────────

describe("getApplicationStatusLabel — perspective symmetry", () => {
  it("worker and employer labels differ for 'pending'", () => {
    const worker   = getApplicationStatusLabel("pending", "worker");
    const employer = getApplicationStatusLabel("pending", "employer");
    expect(worker.label).not.toBe(employer.label);
  });

  it("worker and employer share the same color and bg", () => {
    for (const status of KNOWN_STATUSES) {
      const worker   = getApplicationStatusLabel(status, "worker");
      const employer = getApplicationStatusLabel(status, "employer");
      expect(worker.color).toBe(employer.color);
      expect(worker.bg).toBe(employer.bg);
    }
  });
});
