import { describe, expect, it } from "vitest";
import type { Request } from "express";
import {
  buildAuthLoginRedirectPath,
  resolveAuthRedirectPath,
  resolveAuthRedirectPathFromValue,
} from "./_core/authRedirect";

function makeReq(query: Record<string, string | undefined>): Request {
  return {
    query,
  } as unknown as Request;
}

describe("resolveAuthRedirectPathFromValue", () => {
  it("returns a safe local path", () => {
    expect(resolveAuthRedirectPathFromValue("/applications/42?tab=details")).toBe(
      "/applications/42?tab=details"
    );
  });

  it("falls back to home for missing values", () => {
    expect(resolveAuthRedirectPathFromValue(undefined)).toBe("/");
    expect(resolveAuthRedirectPathFromValue("")).toBe("/");
  });

  it("rejects unsafe external-looking paths", () => {
    expect(resolveAuthRedirectPathFromValue("//evil.com")).toBe("/");
    expect(resolveAuthRedirectPathFromValue("https://evil.com")).toBe("/");
  });
});

describe("resolveAuthRedirectPath", () => {
  it("reads a safe returnTo from the request query", () => {
    expect(
      resolveAuthRedirectPath(makeReq({ returnTo: "/my-applications?tab=open" }))
    ).toBe("/my-applications?tab=open");
  });

  it("falls back to home when returnTo is unsafe", () => {
    expect(resolveAuthRedirectPath(makeReq({ returnTo: "//evil.com" }))).toBe("/");
  });
});

describe("buildAuthLoginRedirectPath", () => {
  it("includes auth=login and preserves a safe return path", () => {
    expect(
      buildAuthLoginRedirectPath(
        makeReq({ returnTo: "/my-applications" }),
        "google_email_required"
      )
    ).toBe("/?auth=login&returnTo=%2Fmy-applications&authError=google_email_required");
  });

  it("omits returnTo when the safe fallback is home", () => {
    expect(buildAuthLoginRedirectPath(makeReq({}), "google_unavailable")).toBe(
      "/?auth=login&authError=google_unavailable"
    );
  });
});
