/**
 * Integration test: validates that SENDGRID_API_KEY and EMAIL_FROM are
 * correctly configured by calling the SendGrid /v3/user/profile endpoint
 * (a lightweight, read-only call that requires a valid API key).
 *
 * This test is intentionally NOT mocked — it hits the real SendGrid API.
 * Run only when secrets are available in the environment.
 */
import { describe, it, expect } from "vitest";

describe("SendGrid credentials", () => {
  it("SENDGRID_API_KEY is set in environment", () => {
    const key = process.env.SENDGRID_API_KEY;
    expect(key, "SENDGRID_API_KEY must be set").toBeTruthy();
    expect(key!.startsWith("SG."), "SENDGRID_API_KEY must start with SG.").toBe(true);
  });

  it("EMAIL_FROM is set in environment", () => {
    const from = process.env.EMAIL_FROM;
    expect(from, "EMAIL_FROM must be set").toBeTruthy();
    expect(from, "EMAIL_FROM must contain @").toContain("@");
  });

  it("SENDGRID_API_KEY is valid (authenticated call to SendGrid API)", async () => {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
      console.warn("Skipping — SENDGRID_API_KEY not set");
      return;
    }
    if (process.env.CI) {
      console.warn("Skipping live SendGrid API call in CI environment");
      return;
    }

    // Call /v3/user/profile — lightweight, read-only, requires valid auth
    const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    // 200 = valid key, 401 = invalid key, 403 = key lacks permissions but is valid
    expect(
      [200, 403].includes(res.status),
      `SendGrid API returned ${res.status} — key may be invalid (401 = unauthorized)`
    ).toBe(true);
  });
});
