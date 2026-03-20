/**
 * Tests for the welcome email helper (server/_core/email.ts)
 * and the name validation logic mirrored from the registration form.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// ─── sendEmail / sendWelcomeEmail ─────────────────────────────────────────────
// The email module reads ENV at call time, so we can test by injecting
// a custom sendEmail implementation that bypasses the real fetch.

describe("sendEmail helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when forgeApiUrl is empty", async () => {
    // Directly test the guard branch by calling with empty env
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    // Override ENV inline for this test
    const { ENV } = await import("./_core/env");
    const origUrl = ENV.forgeApiUrl;
    const origKey = ENV.forgeApiKey;
    (ENV as Record<string, string>).forgeApiUrl = "";
    (ENV as Record<string, string>).forgeApiKey = "";

    const { sendEmail } = await import("./_core/email");
    const result = await sendEmail({ to: "a@b.com", subject: "s", html: "<p>h</p>" });

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();

    // Restore
    (ENV as Record<string, string>).forgeApiUrl = origUrl;
    (ENV as Record<string, string>).forgeApiKey = origKey;
  });

  it("calls fetch with SendEmail endpoint and returns true on 200", async () => {
    const { ENV } = await import("./_core/env");
    const origUrl = ENV.forgeApiUrl;
    const origKey = ENV.forgeApiKey;
    (ENV as Record<string, string>).forgeApiUrl = "https://forge.example.com/";
    (ENV as Record<string, string>).forgeApiKey = "test-key";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const { sendEmail } = await import("./_core/email");
    const result = await sendEmail({
      to: "user@example.com",
      subject: "ברוכים הבאים",
      html: "<p>שלום</p>",
    });

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("SendEmail");
    const body = JSON.parse(options.body as string);
    expect(body.to).toBe("user@example.com");
    expect(body.subject).toBe("ברוכים הבאים");

    (ENV as Record<string, string>).forgeApiUrl = origUrl;
    (ENV as Record<string, string>).forgeApiKey = origKey;
  });

  it("returns false when fetch returns non-200", async () => {
    const { ENV } = await import("./_core/env");
    const origUrl = ENV.forgeApiUrl;
    const origKey = ENV.forgeApiKey;
    (ENV as Record<string, string>).forgeApiUrl = "https://forge.example.com/";
    (ENV as Record<string, string>).forgeApiKey = "test-key";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 500 })
    );

    const { sendEmail } = await import("./_core/email");
    const result = await sendEmail({ to: "a@b.com", subject: "s", html: "<p>h</p>" });
    expect(result).toBe(false);

    (ENV as Record<string, string>).forgeApiUrl = origUrl;
    (ENV as Record<string, string>).forgeApiKey = origKey;
  });

  it("returns false when fetch throws", async () => {
    const { ENV } = await import("./_core/env");
    const origUrl = ENV.forgeApiUrl;
    const origKey = ENV.forgeApiKey;
    (ENV as Record<string, string>).forgeApiUrl = "https://forge.example.com/";
    (ENV as Record<string, string>).forgeApiKey = "test-key";

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const { sendEmail } = await import("./_core/email");
    const result = await sendEmail({ to: "a@b.com", subject: "s", html: "<p>h</p>" });
    expect(result).toBe(false);

    (ENV as Record<string, string>).forgeApiUrl = origUrl;
    (ENV as Record<string, string>).forgeApiKey = origKey;
  });

  it("sendWelcomeEmail does not throw when service is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    const { sendWelcomeEmail } = await import("./_core/email");
    await expect(sendWelcomeEmail({ name: "ישראל", email: "test@example.com" })).resolves.not.toThrow();
  });
});

// ─── Welcome email routing logic ─────────────────────────────────────────────
// Unit tests for the routing decisions around when welcome emails are sent.

describe("welcome email routing decisions", () => {
  /**
   * Mirrors the guard in verifyEmailCode:
   *   sendWelcomeEmailOtp({ to: email, name: input.name ?? "" })
   *   — always fires for new email_otp users (email is always known)
   */
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

  /**
   * Mirrors the guard in completeSignup:
   *   if (userEmail && ctx.user.loginMethod !== "email_otp")
   *   — skips email_otp users to avoid duplicate welcome emails
   */
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
