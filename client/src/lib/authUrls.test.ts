import { describe, expect, it } from "vitest";
import {
  buildLocalLoginUrl,
  buildOAuthLoginUrl,
  isOAuthLoginEnabled,
} from "../const";

describe("auth URL helpers", () => {
  it("treats OAuth login as disabled by default", () => {
    expect(isOAuthLoginEnabled({})).toBe(false);
    expect(
      isOAuthLoginEnabled({
        VITE_ENABLE_OAUTH_LOGIN: "false",
        VITE_OAUTH_PORTAL_URL: "https://oauth.example.com",
        VITE_APP_ID: "app_123",
      })
    ).toBe(false);
  });

  it("enables OAuth login only when flag and required values are present", () => {
    expect(
      isOAuthLoginEnabled({
        VITE_ENABLE_OAUTH_LOGIN: "true",
        VITE_OAUTH_PORTAL_URL: "https://oauth.example.com",
        VITE_APP_ID: "app_123",
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

  it("builds an OAuth login URL without treating returnPath as provider", () => {
    const url = new URL(
      buildOAuthLoginUrl({
        currentOrigin: "https://app.example.com",
        oauthPortalUrl: "https://oauth.example.com",
        appId: "app_123",
        provider: "google",
        returnPath: "/applications/42",
      })
    );

    expect(url.origin).toBe("https://oauth.example.com");
    expect(url.pathname).toBe("/app-auth");
    expect(url.searchParams.get("appId")).toBe("app_123");
    expect(url.searchParams.get("provider")).toBe("google");

    const redirectUri = new URL(url.searchParams.get("redirectUri")!);
    expect(redirectUri.origin).toBe("https://app.example.com");
    expect(redirectUri.pathname).toBe("/api/oauth/callback");
    expect(redirectUri.searchParams.get("returnTo")).toBe("/applications/42");
  });
});
