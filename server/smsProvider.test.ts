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

  it("sends CustomFriendlyName=JobNow in the first attempt", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtp("+972501234567");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("CustomFriendlyName")).toBe("JobNow");
  });

  it("retries without CustomFriendlyName when Twilio returns 60204", async () => {
    // First call: 60204 error
    mockFetch
      .mockResolvedValueOnce(makeErrorResponse(60204, "Custom friendly name not allowed"))
      // Second call: success
      .mockResolvedValueOnce(makeSuccessResponse());

    const result = await smsProvider.sendOtp("+972501234567");

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Second call must NOT include CustomFriendlyName
    const [, secondInit] = mockFetch.mock.calls[1] as [string, RequestInit];
    const secondBody = new URLSearchParams(secondInit.body as string);
    expect(secondBody.get("CustomFriendlyName")).toBeNull();
    // But must still include Locale=he
    expect(secondBody.get("Locale")).toBe("he");
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

describe("TwilioVerifyProvider.sendOtpWhatsApp", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("sends Channel=whatsapp in the request body", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtpWhatsApp("+972501234567");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("Channel")).toBe("whatsapp");
  });

  it("sends the correct phone number in To field", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtpWhatsApp("+972509876543");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("To")).toBe("+972509876543");
  });

  it("calls the correct Twilio Verify Verifications endpoint", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse());

    await smsProvider.sendOtpWhatsApp("+972501234567");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("verify.twilio.com");
    expect(url).toContain("/Verifications");
  });

  it("returns success=true on successful send", async () => {
    mockFetch.mockResolvedValue(makeSuccessResponse("pending"));

    const result = await smsProvider.sendOtpWhatsApp("+972501234567");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns Hebrew error for invalid phone (60200)", async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(60200, "Invalid parameter `To`"));

    const result = await smsProvider.sendOtpWhatsApp("+972000000000");

    expect(result.success).toBe(false);
    expect(result.error).toBe("מספר הטלפון אינו תקין");
  });

  it("returns Hebrew error when WhatsApp channel not enabled (60410)", async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(60410, "Channel not enabled"));

    const result = await smsProvider.sendOtpWhatsApp("+972501234567");

    expect(result.success).toBe(false);
    expect(result.error).toBe("ערוץ WhatsApp אינו מופעל בשירות");
  });

  it("returns Hebrew error on general Twilio failure", async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(60001, "Service not found"));

    const result = await smsProvider.sendOtpWhatsApp("+972501234567");

    expect(result.success).toBe(false);
    expect(result.error).toBe("לא ניתן לשלוח קוד ב-WhatsApp כרגע. נסו שוב בעוד מספר דקות.");
  });

  it("returns Hebrew error on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await smsProvider.sendOtpWhatsApp("+972501234567");

    expect(result.success).toBe(false);
    expect(result.error).toBe("לא ניתן לשלוח קוד ב-WhatsApp כרגע. נסו שוב בעוד מספר דקות.");
  });
});

// ─── splitIsraeliE164Phone ────────────────────────────────────────────────────
import { splitIsraeliE164Phone } from "./smsProvider";

describe("splitIsraeliE164Phone", () => {
  it("splits a standard 3-digit mobile prefix (050)", () => {
    const result = splitIsraeliE164Phone("+972501234567");
    expect(result).toEqual({ prefix: "050", number: "1234567" });
  });

  it("splits a 3-digit mobile prefix (054)", () => {
    const result = splitIsraeliE164Phone("+972541234567");
    expect(result).toEqual({ prefix: "054", number: "1234567" });
  });

  it("splits a 3-digit mobile prefix (058)", () => {
    const result = splitIsraeliE164Phone("+972581234567");
    expect(result).toEqual({ prefix: "058", number: "1234567" });
  });

  it("splits a 3-digit mobile prefix (052)", () => {
    const result = splitIsraeliE164Phone("+972521234567");
    expect(result).toEqual({ prefix: "052", number: "1234567" });
  });

  it("returns null for invalid E.164 format", () => {
    expect(splitIsraeliE164Phone("0501234567")).toBeNull();
    expect(splitIsraeliE164Phone("+1234567890")).toBeNull();
    expect(splitIsraeliE164Phone("")).toBeNull();
  });

  it("returns null for too-short number", () => {
    expect(splitIsraeliE164Phone("+97250123")).toBeNull();
  });

  it("round-trips with normalizeIsraeliPhone", () => {
    // normalizeIsraeliPhone("0501234567") → "+972501234567"
    // splitIsraeliE164Phone("+972501234567") → { prefix: "050", number: "1234567" }
    // combinePhone({ prefix: "050", number: "1234567" }) → "0501234567"
    const split = splitIsraeliE164Phone("+972501234567");
    expect(split).not.toBeNull();
    const combined = split!.prefix + split!.number;
    expect(combined).toBe("0501234567");
  });
});
