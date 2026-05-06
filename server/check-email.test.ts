/**
 * Tests for the email availability check feature.
 *
 * Covers:
 * - checkEmailAvailable procedure logic (available / taken)
 * - Email format validation (mirrors the frontend validateEmail)
 * - loginMethod discrimination (google vs phone)
 * - Edge cases: case-insensitive matching, whitespace, invalid formats
 * - Pre-redirect guard: googleCheckLoading state machine behavior
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mirror of the frontend validateEmail helper ─────────────────────────────
function validateEmail(val: string, touched = false): string | null {
  if (!val.trim()) return touched ? "אימייל הוא שדה חובה" : null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(val) ? null : "כתובת מייל לא תקינה";
}

// ─── Mirror of the server-side checkEmailAvailable logic ─────────────────────
interface UserRow {
  id: number;
  email: string;
  loginMethod: string | null;
}

function checkEmailAvailable(
  email: string,
  users: UserRow[]
): { available: true; loginMethod: null } | { available: false; loginMethod: string } {
  const normalized = email.toLowerCase().trim();
  const existing = users.find((u) => u.email.toLowerCase() === normalized);
  if (!existing) return { available: true, loginMethod: null };
  return { available: false, loginMethod: existing.loginMethod ?? "phone" };
}

// ─── Email format validation ──────────────────────────────────────────────────
describe("validateEmail (frontend mirror)", () => {
  it("returns null for empty string when not touched", () => {
    expect(validateEmail("")).toBeNull();
    expect(validateEmail("   ")).toBeNull();
  });

  it("returns required error for empty string when touched", () => {
    expect(validateEmail("", true)).toBe("אימייל הוא שדה חובה");
    expect(validateEmail("   ", true)).toBe("אימייל הוא שדה חובה");
  });

  it("accepts valid email addresses", () => {
    expect(validateEmail("user@example.com")).toBeNull();
    expect(validateEmail("user+tag@example.co.il")).toBeNull();
    expect(validateEmail("first.last@domain.org")).toBeNull();
    expect(validateEmail("USER@EXAMPLE.COM")).toBeNull();
  });

  it("rejects emails without @", () => {
    expect(validateEmail("notanemail")).toBe("כתובת מייל לא תקינה");
    expect(validateEmail("missing-at-sign.com")).toBe("כתובת מייל לא תקינה");
  });

  it("rejects emails without domain", () => {
    expect(validateEmail("user@")).toBe("כתובת מייל לא תקינה");
    expect(validateEmail("user@.com")).toBe("כתובת מייל לא תקינה");
  });

  it("rejects emails with spaces", () => {
    expect(validateEmail("user @example.com")).toBe("כתובת מייל לא תקינה");
    expect(validateEmail("user@ example.com")).toBe("כתובת מייל לא תקינה");
  });

  it("rejects double-@ addresses", () => {
    expect(validateEmail("user@@example.com")).toBe("כתובת מייל לא תקינה");
  });
});

// ─── checkEmailAvailable logic ────────────────────────────────────────────────
describe("checkEmailAvailable — availability logic", () => {
  const users: UserRow[] = [
    { id: 1, email: "existing@example.com", loginMethod: "phone" },
    { id: 2, email: "google@example.com", loginMethod: "google" },
    { id: 3, email: "nologin@example.com", loginMethod: null },
  ];

  it("returns available=true for a brand-new email", () => {
    const result = checkEmailAvailable("new@example.com", users);
    expect(result.available).toBe(true);
    expect(result.loginMethod).toBeNull();
  });

  it("returns available=false for an existing phone-registered email", () => {
    const result = checkEmailAvailable("existing@example.com", users);
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.loginMethod).toBe("phone");
    }
  });

  it("returns available=false with loginMethod=google for Google accounts", () => {
    const result = checkEmailAvailable("google@example.com", users);
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.loginMethod).toBe("google");
    }
  });

  it("falls back to 'phone' when loginMethod is null", () => {
    const result = checkEmailAvailable("nologin@example.com", users);
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.loginMethod).toBe("phone");
    }
  });

  it("is case-insensitive (uppercase input matches lowercase DB row)", () => {
    const result = checkEmailAvailable("EXISTING@EXAMPLE.COM", users);
    expect(result.available).toBe(false);
  });

  it("is case-insensitive (mixed case input)", () => {
    const result = checkEmailAvailable("Existing@Example.Com", users);
    expect(result.available).toBe(false);
  });

  it("trims leading/trailing whitespace before comparison", () => {
    const result = checkEmailAvailable("  existing@example.com  ", users);
    expect(result.available).toBe(false);
  });

  it("returns available=true for an empty user table", () => {
    const result = checkEmailAvailable("any@example.com", []);
    expect(result.available).toBe(true);
  });

  it("does not match partial email addresses", () => {
    const result = checkEmailAvailable("existing@example", users);
    // Not a valid email but the check should still return available since no exact match
    expect(result.available).toBe(true);
  });
});

// ─── Pre-redirect guard state machine ────────────────────────────────────────
describe("Google button pre-redirect guard", () => {
  /**
   * Simulates the async onClick handler logic without DOM/React.
   * Returns the sequence of state transitions and final action.
   */
  async function simulateGoogleClick(opts: {
    emailAvailable: boolean;
    loginMethod?: string;
    throwError?: boolean;
  }): Promise<{
    states: string[];
    finalAction: "redirect" | "show_error" | "show_toast";
    errorMessage?: string;
  }> {
    const states: string[] = [];
    let finalAction: "redirect" | "show_error" | "show_toast" = "redirect";
    let errorMessage: string | undefined;

    // setGoogleCheckLoading(true)
    states.push("loading:true");

    try {
      if (opts.throwError) throw new Error("Network error");

      const result = opts.emailAvailable
        ? { available: true as const, loginMethod: null }
        : { available: false as const, loginMethod: opts.loginMethod ?? "phone" };

      if (!result.available) {
        const methodLabel =
          result.loginMethod === "google" ? "Google" :
          result.loginMethod === "phone" ? "SMS" :
          "מספר טלפון";
        errorMessage = `כתובת המייל כבר רשומה במערכת עם ${methodLabel}. נסה להתחבר במקום להירשם.`;
        finalAction = "show_error";
        return { states, finalAction, errorMessage };
      }

      // Email is free — would redirect
      finalAction = "redirect";
    } catch {
      finalAction = "show_toast";
    } finally {
      states.push("loading:false");
    }

    return { states, finalAction, errorMessage };
  }

  it("sets loading=true, then loading=false on success path", async () => {
    const { states } = await simulateGoogleClick({ emailAvailable: true });
    expect(states[0]).toBe("loading:true");
    expect(states[states.length - 1]).toBe("loading:false");
  });

  it("redirects when email is available", async () => {
    const { finalAction } = await simulateGoogleClick({ emailAvailable: true });
    expect(finalAction).toBe("redirect");
  });

  it("shows inline error when email is taken (phone)", async () => {
    const { finalAction, errorMessage } = await simulateGoogleClick({
      emailAvailable: false,
      loginMethod: "phone",
    });
    expect(finalAction).toBe("show_error");
    expect(errorMessage).toContain("SMS");
  });

  it("shows inline error when email is taken (google)", async () => {
    const { finalAction, errorMessage } = await simulateGoogleClick({
      emailAvailable: false,
      loginMethod: "google",
    });
    expect(finalAction).toBe("show_error");
    expect(errorMessage).toContain("Google");
  });

  it("shows toast on network error", async () => {
    const { finalAction } = await simulateGoogleClick({ emailAvailable: true, throwError: true });
    expect(finalAction).toBe("show_toast");
  });

  it("always resets loading state even on error", async () => {
    const { states } = await simulateGoogleClick({ emailAvailable: true, throwError: true });
    expect(states).toContain("loading:false");
  });
});

// ─── Disabled-button gate ─────────────────────────────────────────────────────
describe("Google button disabled gate", () => {
  /**
   * Mirrors the googleDisabled computed value from LoginModal.
   */
  function isGoogleButtonDisabled(opts: {
    isPhoneValid: boolean;
    regName: string;
    regEmail: string;
    emailError: string | null;
    nameError: string | null;
    termsAccepted: boolean;
    age18Accepted: boolean;
    googleCheckLoading: boolean;
  }): boolean {
    return (
      !opts.isPhoneValid ||
      !opts.regName.trim() ||
      !opts.regEmail.trim() ||
      !!opts.emailError ||
      !!opts.nameError ||
      !opts.termsAccepted ||
      !opts.age18Accepted ||
      opts.googleCheckLoading
    );
  }

  const validState = {
    isPhoneValid: true,
    regName: "ישראל ישראלי",
    regEmail: "user@example.com",
    emailError: null,
    nameError: null,
    termsAccepted: true,
    age18Accepted: true,
    googleCheckLoading: false,
  };

  it("is enabled when all fields are valid", () => {
    expect(isGoogleButtonDisabled(validState)).toBe(false);
  });

  it("is disabled when phone is invalid", () => {
    expect(isGoogleButtonDisabled({ ...validState, isPhoneValid: false })).toBe(true);
  });

  it("is disabled when name is empty", () => {
    expect(isGoogleButtonDisabled({ ...validState, regName: "" })).toBe(true);
    expect(isGoogleButtonDisabled({ ...validState, regName: "   " })).toBe(true);
  });

  it("is disabled when email is empty", () => {
    expect(isGoogleButtonDisabled({ ...validState, regEmail: "" })).toBe(true);
  });

  it("is disabled when email has a format error", () => {
    expect(isGoogleButtonDisabled({ ...validState, emailError: "כתובת מייל לא תקינה" })).toBe(true);
  });

  it("is disabled when name has a validation error", () => {
    expect(isGoogleButtonDisabled({ ...validState, nameError: "שם חייב להכיל לפחות 2 תווים" })).toBe(true);
  });

  it("is disabled when terms not accepted", () => {
    expect(isGoogleButtonDisabled({ ...validState, termsAccepted: false })).toBe(true);
  });

  it("is disabled when age18 not accepted", () => {
    expect(isGoogleButtonDisabled({ ...validState, age18Accepted: false })).toBe(true);
  });

  it("is disabled while the email check is loading", () => {
    expect(isGoogleButtonDisabled({ ...validState, googleCheckLoading: true })).toBe(true);
  });

  it("requires ALL conditions to be met simultaneously", () => {
    // Two failures at once
    expect(isGoogleButtonDisabled({
      ...validState,
      regName: "",
      termsAccepted: false,
    })).toBe(true);
  });
});
