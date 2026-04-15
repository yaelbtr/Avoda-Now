import { describe, expect, it } from "vitest";
import type { Request } from "express";
import {
  buildOAuthLoginRedirectPath,
  isEligibleExistingOAuthUser,
  resolveOAuthRedirectPath,
} from "./_core/oauth";

function makeReq(query: Record<string, string | undefined>): Request {
  return { query } as unknown as Request;
}

describe("resolveOAuthRedirectPath", () => {
  it("returns the requested local path when returnTo is safe", () => {
    expect(
      resolveOAuthRedirectPath(
        makeReq({ returnTo: "/applications/42?tab=details" })
      )
    ).toBe("/applications/42?tab=details");
  });

  it("falls back to home when returnTo is missing", () => {
    expect(resolveOAuthRedirectPath(makeReq({}))).toBe("/");
  });

  it("falls back to home for unsafe external-looking paths", () => {
    expect(resolveOAuthRedirectPath(makeReq({ returnTo: "//evil.com" }))).toBe("/");
  });
});

describe("buildOAuthLoginRedirectPath", () => {
  it("includes auth=login and preserves a safe return path", () => {
    expect(
      buildOAuthLoginRedirectPath(
        makeReq({ returnTo: "/my-applications", authError: "google_existing_only" }),
        "google_existing_only"
      )
    ).toBe("/?auth=login&returnTo=%2Fmy-applications&authError=google_existing_only");
  });

  it("omits returnTo when the safe fallback is home", () => {
    expect(buildOAuthLoginRedirectPath(makeReq({}), "google_email_required")).toBe(
      "/?auth=login&authError=google_email_required"
    );
  });
});

describe("isEligibleExistingOAuthUser", () => {
  it("returns true only when the existing user already has terms, email, and phone", () => {
    expect(
      isEligibleExistingOAuthUser({
        termsAcceptedAt: new Date(),
        email: "user@example.com",
        phone: "+972501234567",
      })
    ).toBe(true);

    expect(
      isEligibleExistingOAuthUser({
        termsAcceptedAt: new Date(),
        email: "user@example.com",
        phone: null,
      })
    ).toBe(false);

    expect(
      isEligibleExistingOAuthUser({
        termsAcceptedAt: null,
        email: "user@example.com",
        phone: "+972501234567",
      })
    ).toBe(false);
  });
});
