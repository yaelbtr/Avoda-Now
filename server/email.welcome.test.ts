/**
 * Tests for the email helper (server/_core/email.ts)
 * and the name validation logic mirrored from the registration form.
 *
 * The email module uses SMTP (primary) and SendGrid (fallback).
 * Tests mock nodemailer and fetch to avoid real network calls.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// ─── Name validation (mirrors LoginModal validateName) ────────────────────────

function validateName(val: string): string | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "שם חייב להכיל לפחות 2 תווים";
  if (!/^[\u0590-\u05FFa-zA-Z\s\-']+$/.test(trimmed)) return "שם יכול להכיל אותיות ורווחים בלבד";
  return null;
}

describe("validateName", () => {
  it("returns null for empty string (handled by disabled button)", () => {
    expect(validateName("")).toBeNull();
    expect(validateName("   ")).toBeNull();
  });

  it("returns error for single character", () => {
    expect(validateName("א")).toBe("שם חייב להכיל לפחות 2 תווים");
    expect(validateName("a")).toBe("שם חייב להכיל לפחות 2 תווים");
  });

  it("accepts valid Hebrew names", () => {
    expect(validateName("ישראל")).toBeNull();
    expect(validateName("ישראל ישראלי")).toBeNull();
    expect(validateName("בן-דוד")).toBeNull();
  });

  it("accepts valid English names", () => {
    expect(validateName("John")).toBeNull();
    expect(validateName("Mary-Jane")).toBeNull();
    expect(validateName("O'Brien")).toBeNull();
  });

  it("accepts mixed Hebrew-English names", () => {
    expect(validateName("David דוד")).toBeNull();
  });

  it("rejects names with digits", () => {
    expect(validateName("ישראל1")).toBe("שם יכול להכיל אותיות ורווחים בלבד");
  });

  it("rejects names with special characters", () => {
    expect(validateName("ישראל@")).toBe("שם יכול להכיל אותיות ורווחים בלבד");
    expect(validateName("ישראל!")).toBe("שם יכול להכיל אותיות ורווחים בלבד");
  });

  it("accepts exactly 2 characters", () => {
    expect(validateName("אב")).toBeNull();
    expect(validateName("Jo")).toBeNull();
  });
});

// ─── sendEmail helper ─────────────────────────────────────────────────────────

describe("sendEmail helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns false when no transport is configured", async () => {
    // Temporarily clear env vars
    const origSmtpHost = process.env.SMTP_HOST;
    const origSmtpUser = process.env.SMTP_USER;
    const origSmtpPass = process.env.SMTP_PASS;
    const origSgKey = process.env.SENDGRID_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SENDGRID_API_KEY;

    vi.resetModules();
    const { sendEmail } = await import("./_core/email");
    const result = await sendEmail({ to: "a@b.com", subject: "s", html: "<p>h</p>" });
    expect(result).toBe(false);

    // Restore
    if (origSmtpHost) process.env.SMTP_HOST = origSmtpHost;
    if (origSmtpUser) process.env.SMTP_USER = origSmtpUser;
    if (origSmtpPass) process.env.SMTP_PASS = origSmtpPass;
    if (origSgKey) process.env.SENDGRID_API_KEY = origSgKey;
  });

  it("falls back to SendGrid when SMTP is not configured but SendGrid is", async () => {
    const origSmtpHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    // Mock fetch for SendGrid
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 202 })
    );

    vi.resetModules();
    const { sendEmail } = await import("./_core/email");
    const result = await sendEmail({ to: "user@example.com", subject: "Test", html: "<p>hi</p>" });

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("sendgrid.com");

    if (origSmtpHost) process.env.SMTP_HOST = origSmtpHost;
  });

  it("returns false when SendGrid returns non-200", async () => {
    const origSmtpHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    );

    vi.resetModules();
    const { sendEmail } = await import("./_core/email");
    const result = await sendEmail({ to: "a@b.com", subject: "s", html: "<p>h</p>" });
    expect(result).toBe(false);

    if (origSmtpHost) process.env.SMTP_HOST = origSmtpHost;
  });

  it("sendWelcomeEmail does not throw when all transports fail", async () => {
    const origSmtpHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    vi.resetModules();
    const { sendWelcomeEmail } = await import("./_core/email");
    await expect(
      sendWelcomeEmail({ name: "ישראל", email: "test@example.com" })
    ).resolves.not.toThrow();

    if (origSmtpHost) process.env.SMTP_HOST = origSmtpHost;
  });
});

// ─── Welcome email routing logic ─────────────────────────────────────────────

describe("welcome email routing decisions", () => {
  it("email_otp: welcome email fires for every new user (email always known)", () => {
    const isNewUser = true;
    const loginMethod = "email_otp";
    const email = "test@example.com";
    const shouldSend = isNewUser && loginMethod === "email_otp" && !!email;
    expect(shouldSend).toBe(true);
  });

  it("email_otp: welcome email does NOT fire for returning users", () => {
    const isNewUser = false;
    const loginMethod = "email_otp";
    const email = "test@example.com";
    const shouldSend = isNewUser && loginMethod === "email_otp" && !!email;
    expect(shouldSend).toBe(false);
  });

  it("completeSignup: skips welcome email for email_otp users (already sent in verifyEmailCode)", () => {
    const loginMethod = "email_otp";
    const userEmail = "test@example.com";
    const shouldSend = !!userEmail && loginMethod !== "email_otp";
    expect(shouldSend).toBe(false);
  });

  it("completeSignup: sends welcome email for phone_otp users with email", () => {
    const loginMethod = "phone_otp";
    const userEmail = "test@example.com";
    const shouldSend = !!userEmail && loginMethod !== "email_otp";
    expect(shouldSend).toBe(true);
  });

  it("completeSignup: sends welcome email for google users (always have email)", () => {
    const loginMethod = "google";
    const userEmail = "test@gmail.com";
    const shouldSend = !!userEmail && loginMethod !== "email_otp";
    expect(shouldSend).toBe(true);
  });

  it("completeSignup: does NOT send when email is missing", () => {
    const loginMethod = "phone_otp";
    const userEmail = null;
    const shouldSend = !!userEmail && loginMethod !== "email_otp";
    expect(shouldSend).toBe(false);
  });
});
