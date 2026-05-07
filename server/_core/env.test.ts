import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadEnv() {
  vi.resetModules();
  return import("./env");
}

describe("ENV.appBaseUrl", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("uses the production domain when no base URL is configured in production", async () => {
    delete process.env.APP_BASE_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.CLIENT_URL;
    process.env.NODE_ENV = "production";

    const { ENV } = await loadEnv();

    expect(ENV.appBaseUrl).toBe("https://avoda-go.co.il");
  });

  it("uses the production domain when NODE_ENV is not configured", async () => {
    delete process.env.APP_BASE_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.CLIENT_URL;
    delete process.env.NODE_ENV;

    const { ENV } = await loadEnv();

    expect(ENV.appBaseUrl).toBe("https://avoda-go.co.il");
  });

  it("keeps localhost as the development fallback", async () => {
    delete process.env.APP_BASE_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.CLIENT_URL;
    process.env.NODE_ENV = "development";

    const { ENV } = await loadEnv();

    expect(ENV.appBaseUrl).toBe("http://localhost:3000");
  });

  it("prefers configured APP_BASE_URL and removes trailing slashes", async () => {
    process.env.APP_BASE_URL = "https://example.com///";
    process.env.NODE_ENV = "production";

    const { ENV } = await loadEnv();

    expect(ENV.appBaseUrl).toBe("https://example.com");
  });
});
