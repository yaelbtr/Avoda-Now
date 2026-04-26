import { describe, expect, it } from "vitest";
import {
  buildGoogleLoginUrl,
  buildLocalLoginUrl,
  isGoogleLoginEnabled,
} from "../const";

describe("auth URL helpers", () => {
  it("treats Google login as disabled by default", () => {
    expect(isGoogleLoginEnabled({})).toBe(false);
    expect(
      isGoogleLoginEnabled({
        VITE_ENABLE_GOOGLE_LOGIN: "false",
      })
    ).toBe(false);
  });

  it("enables Google login only when the feature flag is true", () => {
    expect(
      isGoogleLoginEnabled({
        VITE_ENABLE_GOOGLE_LOGIN: "true",
      })
    ).toBe(true);
  });

  it("builds a local login URL with a preserved return path", () => {
    const url = new URL(
      buildLocalLoginUrl({
        currentOrigin: "https://app.example.com",
        returnPath: "/my-referrals?tab=stats",
      })
    );

    expect(url.origin).toBe("https://app.example.com");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("auth")).toBe("login");
    expect(url.searchParams.get("returnTo")).toBe("/my-referrals?tab=stats");
  });

  it("builds a Google login URL through the local backend route", () => {
    const url = new URL(
      buildGoogleLoginUrl({
        currentOrigin: "https://app.example.com",
        returnPath: "/applications/42",
      })
    );

    expect(url.origin).toBe("https://app.example.com");
    expect(url.pathname).toBe("/api/auth/google/start");
    expect(url.searchParams.get("returnTo")).toBe("/applications/42");
  });
});
