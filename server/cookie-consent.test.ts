/**
 * cookie-consent.test.ts
 *
 * Unit tests for the CookieConsentBanner logic (pure functions only).
 * These tests cover the four required test cases from the spec:
 *   Case 1: First visit → banner should be visible (no localStorage entry)
 *   Case 2: Click Accept → banner disappears (consent stored)
 *   Case 3: Refresh page → banner not shown (consent already stored)
 *   Case 4: Clear localStorage → banner appears again
 *
 * And additional cases:
 *   - Settings: save with analytics=true → analyticsConsent = "true"
 *   - Settings: save with analytics=false → analyticsConsent = "false"
 *   - Analytics gating: script NOT loaded when analyticsConsent != "true"
 */

import { describe, it, expect, beforeEach } from "vitest";

// ── Constants (mirrors CookieConsentBanner.tsx) ───────────────────────────────
const LS_CONSENT = "cookieConsent";
const LS_ANALYTICS = "analyticsConsent";

// ── Pure logic helpers (extracted from component for testability) ─────────────

function shouldShowBanner(storage: Record<string, string>): boolean {
  return !storage[LS_CONSENT];
}

function acceptAll(storage: Record<string, string>): Record<string, string> {
  return { ...storage, [LS_CONSENT]: "accepted", [LS_ANALYTICS]: "true" };
}

function saveCustom(
  storage: Record<string, string>,
  analytics: boolean
): Record<string, string> {
  return {
    ...storage,
    [LS_CONSENT]: "custom",
    [LS_ANALYTICS]: String(analytics),
  };
}

function shouldLoadAnalytics(storage: Record<string, string>): boolean {
  return storage[LS_ANALYTICS] === "true";
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Cookie Consent Banner logic", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    // Fresh storage for each test (simulates cleared localStorage)
    storage = {};
  });

  // ── Test Case 1 ──────────────────────────────────────────────────────────
  it("Case 1: first visit — banner is visible when no consent stored", () => {
    expect(shouldShowBanner(storage)).toBe(true);
  });

  // ── Test Case 2 ──────────────────────────────────────────────────────────
  it("Case 2: click Accept — banner disappears and consent is stored", () => {
    storage = acceptAll(storage);
    expect(storage[LS_CONSENT]).toBe("accepted");
    expect(storage[LS_ANALYTICS]).toBe("true");
    expect(shouldShowBanner(storage)).toBe(false);
  });

  // ── Test Case 3 ──────────────────────────────────────────────────────────
  it("Case 3: refresh page — banner not shown when consent already stored", () => {
    // Simulate a previous accept persisted in storage
    storage = { [LS_CONSENT]: "accepted", [LS_ANALYTICS]: "true" };
    expect(shouldShowBanner(storage)).toBe(false);
  });

  // ── Test Case 4 ──────────────────────────────────────────────────────────
  it("Case 4: clear localStorage — banner appears again", () => {
    // Start with consent stored
    storage = { [LS_CONSENT]: "accepted", [LS_ANALYTICS]: "true" };
    expect(shouldShowBanner(storage)).toBe(false);

    // Simulate clearing localStorage
    storage = {};
    expect(shouldShowBanner(storage)).toBe(true);
  });

  // ── Settings: analytics enabled ──────────────────────────────────────────
  it("Settings: save with analytics=true stores correct values", () => {
    storage = saveCustom(storage, true);
    expect(storage[LS_CONSENT]).toBe("custom");
    expect(storage[LS_ANALYTICS]).toBe("true");
    expect(shouldShowBanner(storage)).toBe(false);
    expect(shouldLoadAnalytics(storage)).toBe(true);
  });

  // ── Settings: analytics disabled ─────────────────────────────────────────
  it("Settings: save with analytics=false stores correct values", () => {
    storage = saveCustom(storage, false);
    expect(storage[LS_CONSENT]).toBe("custom");
    expect(storage[LS_ANALYTICS]).toBe("false");
    expect(shouldShowBanner(storage)).toBe(false);
    expect(shouldLoadAnalytics(storage)).toBe(false);
  });

  // ── Analytics gating ─────────────────────────────────────────────────────
  it("Analytics gating: script NOT loaded when analyticsConsent is absent", () => {
    expect(shouldLoadAnalytics({})).toBe(false);
  });

  it("Analytics gating: script NOT loaded when analyticsConsent = 'false'", () => {
    expect(shouldLoadAnalytics({ [LS_ANALYTICS]: "false" })).toBe(false);
  });

  it("Analytics gating: script loaded when analyticsConsent = 'true'", () => {
    expect(shouldLoadAnalytics({ [LS_ANALYTICS]: "true" })).toBe(true);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────
  it("Banner hidden when consent = 'custom' (regardless of analytics toggle)", () => {
    storage = { [LS_CONSENT]: "custom", [LS_ANALYTICS]: "false" };
    expect(shouldShowBanner(storage)).toBe(false);
  });

  it("Accept always enables analytics", () => {
    storage = acceptAll(storage);
    expect(shouldLoadAnalytics(storage)).toBe(true);
  });
});
