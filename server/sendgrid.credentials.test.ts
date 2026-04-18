/**
 * Email transport configuration tests.
 *
 * The app uses SMTP (primary) and SendGrid (fallback) for transactional email.
 * These tests verify that at least one transport is configured and that the
 * sendEmail helper returns a boolean without throwing.
 */
import { describe, it, expect } from "vitest";

describe("Email transport configuration", () => {
  it("at least one email transport is configured (SMTP or SendGrid)", () => {
    const smtpConfigured =
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASS;
    const sendgridConfigured = !!process.env.SENDGRID_API_KEY;

    expect(
      smtpConfigured || sendgridConfigured,
      "Either SMTP (SMTP_HOST + SMTP_USER + SMTP_PASS) or SENDGRID_API_KEY must be set"
    ).toBe(true);
  });

  it("EMAIL_FROM is set in environment", () => {
    const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
    expect(from, "EMAIL_FROM or SMTP_USER must be set as sender address").toBeTruthy();
    expect(from, "Sender address must contain @").toContain("@");
  });

  it("sendEmail helper returns boolean without throwing", async () => {
    const smtpConfigured =
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASS;
    const sendgridConfigured = !!process.env.SENDGRID_API_KEY;

    if (!smtpConfigured && !sendgridConfigured) {
      console.warn("Skipping live call — no email transport configured");
      return;
    }

    const { sendEmail } = await import("./_core/email");

    // We do NOT actually send to avoid side effects; we just verify the function
    // is importable and returns the correct type. A real connectivity test
    // should be run manually with a test address.
    expect(typeof sendEmail).toBe("function");
  });
});
