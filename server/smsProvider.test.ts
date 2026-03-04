/**
 * Unit tests for TwilioVerifyProvider — verifies that the correct
 * parameters (Locale=he, CustomFriendlyName=JobNow) are sent to Twilio.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ─── Mock global fetch ────────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set required env vars before importing the module
process.env.TWILIO_ACCOUNT_SID = "ACtest123";
process.env.TWILIO_AUTH_TOKEN = "authtest456";
process.env.TWILIO_VERIFY_SERVICE_SID = "VAtest789";

// Import AFTER setting env vars
import { smsProvider } from "./smsProvider";

function makeSuccessResponse(status = "pending") {
  return {
    ok: true,
    json: async () => ({ status, sid: "VE123" }),
  } as Response;
}

function makeErrorResponse(code: number, message: string) {
  return {
    ok: false,
    json: async () => ({ code, message }),
  } as unknown as Response;
}

describe("TwilioVerifyProvider.sendOtp", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("sends Locale=he in the request body", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtp("+972501234567");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("Locale")).toBe("he");
  });

  it("does not send CustomFriendlyName (not supported by default Verify service)", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtp("+972501234567");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    // CustomFriendlyName causes error 60204 on standard Verify services
    expect(body.get("CustomFriendlyName")).toBeNull();
  });

  it("sends Channel=sms in the request body", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtp("+972501234567");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("Channel")).toBe("sms");
  });

  it("sends the correct phone number in To field", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtp("+972509876543");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("To")).toBe("+972509876543");
  });

  it("calls the correct Twilio Verify endpoint", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtp("+972501234567");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    // URL must point to Twilio Verify API
    expect(url).toContain("verify.twilio.com");
    expect(url).toContain("/Verifications");
    expect(url).toMatch(/\/Services\/VA[a-z0-9]+\/Verifications/);
  });

  it("returns success=true on successful send", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse("pending"));

    const result = await smsProvider.sendOtp("+972501234567");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns Hebrew error message for invalid phone (60200)", async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(60200, "Invalid parameter `To`"));

    const result = await smsProvider.sendOtp("+972000000000");

    expect(result.success).toBe(false);
    expect(result.error).toBe("מספר הטלפון אינו תקין");
  });

  it("returns Hebrew error message for general Twilio failure", async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(60001, "Service not found"));

    const result = await smsProvider.sendOtp("+972501234567");

    expect(result.success).toBe(false);
    expect(result.error).toBe("לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות.");
  });

  it("returns Hebrew error message on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await smsProvider.sendOtp("+972501234567");

    expect(result.success).toBe(false);
    expect(result.error).toBe("לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות.");
  });
});
