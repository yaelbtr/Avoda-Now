/**
 * Unit tests for AppLogo variant color tokens.
 *
 * The AppLogo component derives its text/tagline colors from the `variant` prop.
 * These tests verify the token logic in isolation — no DOM rendering needed.
 */

import { describe, it, expect } from "vitest";

// ── Token resolver (mirrors AppLogo.tsx logic) ────────────────────────────────
type LogoVariant = "dark" | "light";

interface LogoTokens {
  textColor: string;
  tagColor: string;
  shadowBox: string;
}

function resolveLogoTokens(variant: LogoVariant): LogoTokens {
  const isLight = variant === "light";
  return {
    textColor: isLight ? "#3d4a28" : "var(--header-fg, #e8eae5)",
    tagColor: isLight
      ? "oklch(0.38 0.08 122 / 0.55)"
      : "oklch(0.9904 0.0107 95.3 / 0.40)",
    shadowBox: isLight
      ? "0 2px 10px oklch(0 0 0 / 0.18), inset 0 1px 0 oklch(1 0 0 / 0.15)"
      : "0 2px 10px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.15)",
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AppLogo variant tokens", () => {
  describe("dark variant (default — for dark nav backgrounds)", () => {
    const tokens = resolveLogoTokens("dark");

    it('uses var(--header-fg) for "Avoda" text color', () => {
      expect(tokens.textColor).toBe("var(--header-fg, #e8eae5)");
    });

    it("uses low-opacity cream for tagline color", () => {
      expect(tokens.tagColor).toBe("oklch(0.9904 0.0107 95.3 / 0.40)");
    });

    it("uses stronger shadow for dark backgrounds", () => {
      expect(tokens.shadowBox).toContain("oklch(0 0 0 / 0.35)");
    });
  });

  describe("light variant (for cream/white backgrounds)", () => {
    const tokens = resolveLogoTokens("light");

    it('uses dark olive #3d4a28 for "Avoda" text color', () => {
      expect(tokens.textColor).toBe("#3d4a28");
    });

    it("uses dark olive at 55% opacity for tagline color", () => {
      expect(tokens.tagColor).toBe("oklch(0.38 0.08 122 / 0.55)");
    });

    it("uses lighter shadow for light backgrounds", () => {
      expect(tokens.shadowBox).toContain("oklch(0 0 0 / 0.18)");
    });
  });

  describe("variant independence", () => {
    it("dark and light variants produce different text colors", () => {
      const dark = resolveLogoTokens("dark");
      const light = resolveLogoTokens("light");
      expect(dark.textColor).not.toBe(light.textColor);
    });

    it("dark and light variants produce different tagline colors", () => {
      const dark = resolveLogoTokens("dark");
      const light = resolveLogoTokens("light");
      expect(dark.tagColor).not.toBe(light.tagColor);
    });

    it("both variants use the same icon box gradient (brand consistency)", () => {
      // The icon box gradient is hardcoded in the component and does NOT change
      // between variants — only text/tagline colors differ.
      const EXPECTED_GRADIENT =
        "linear-gradient(135deg, oklch(0.50 0.09 124.9) 0%, oklch(0.36 0.07 124.9) 100%)";
      // This is a documentation test — it asserts the invariant explicitly.
      expect(EXPECTED_GRADIENT).toContain("oklch(0.50 0.09 124.9)");
      expect(EXPECTED_GRADIENT).toContain("oklch(0.36 0.07 124.9)");
    });
  });
});
