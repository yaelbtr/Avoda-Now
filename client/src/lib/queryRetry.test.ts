import { TRPCClientError } from "@trpc/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { shouldRetry, retryDelay } from "./queryRetry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a TRPCClientError with an optional httpStatus in data and a message. */
function makeTRPCError(
  message: string,
  httpStatus?: number
): TRPCClientError<never> {
  const err = new TRPCClientError(message, {
    result: undefined as never,
    cause: undefined,
  });
  if (httpStatus !== undefined) {
    (err as unknown as { data: { httpStatus: number } }).data = { httpStatus };
  }
  return err;
}

// ---------------------------------------------------------------------------
// shouldRetry
// ---------------------------------------------------------------------------

describe("shouldRetry", () => {
  // --- 4xx: never retry ---

  it("never retries on 400 Bad Request", () => {
    const err = makeTRPCError("BAD_REQUEST", 400);
    expect(shouldRetry(0, err)).toBe(false);
    expect(shouldRetry(1, err)).toBe(false);
    expect(shouldRetry(3, err)).toBe(false);
  });

  it("never retries on 401 Unauthorized", () => {
    const err = makeTRPCError("UNAUTHORIZED", 401);
    expect(shouldRetry(0, err)).toBe(false);
  });

  it("never retries on 403 Forbidden", () => {
    const err = makeTRPCError("FORBIDDEN", 403);
    expect(shouldRetry(0, err)).toBe(false);
  });

  it("never retries on 404 Not Found", () => {
    const err = makeTRPCError("NOT_FOUND", 404);
    expect(shouldRetry(0, err)).toBe(false);
  });

  it("never retries on 429 Too Many Requests", () => {
    const err = makeTRPCError("TOO_MANY_REQUESTS", 429);
    expect(shouldRetry(0, err)).toBe(false);
  });

  // --- 5xx tRPC errors: retry up to 3× ---

  it("retries 500 INTERNAL_SERVER_ERROR up to 3 times", () => {
    const err = makeTRPCError("INTERNAL_SERVER_ERROR", 500);
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(1, err)).toBe(true);
    expect(shouldRetry(2, err)).toBe(true);
    expect(shouldRetry(3, err)).toBe(false);
  });

  it("retries 503 Service Unavailable (via httpStatus) up to 4 times", () => {
    const err = makeTRPCError("Service Unavailable", 503);
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(3, err)).toBe(true);
    expect(shouldRetry(4, err)).toBe(false);
  });

  it("retries 502 Bad Gateway (via httpStatus) up to 4 times", () => {
    const err = makeTRPCError("Bad Gateway", 502);
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(3, err)).toBe(true);
    expect(shouldRetry(4, err)).toBe(false);
  });

  // --- 502/503 detected via message (non-JSON HTML response) ---

  it("retries 'Unable to transform response from server' up to 4 times", () => {
    const err = makeTRPCError("Unable to transform response from server");
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(3, err)).toBe(true);
    expect(shouldRetry(4, err)).toBe(false);
  });

  it("retries 'Failed to fetch' up to 4 times", () => {
    const err = makeTRPCError("Failed to fetch");
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(3, err)).toBe(true);
    expect(shouldRetry(4, err)).toBe(false);
  });

  // --- Non-TRPCClientError (plain network errors) ---

  it("retries plain Error up to 3 times", () => {
    const err = new Error("Network error");
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(2, err)).toBe(true);
    expect(shouldRetry(3, err)).toBe(false);
  });

  it("retries null/undefined error up to 3 times", () => {
    expect(shouldRetry(0, null)).toBe(true);
    expect(shouldRetry(0, undefined)).toBe(true);
    expect(shouldRetry(3, null)).toBe(false);
  });

  // --- Edge: 4xx without data (httpStatus undefined) should fall through to generic retry ---

  it("retries TRPCClientError with no httpStatus up to 3 times", () => {
    const err = makeTRPCError("Something went wrong"); // no httpStatus
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(2, err)).toBe(true);
    expect(shouldRetry(3, err)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// retryDelay
// ---------------------------------------------------------------------------

describe("retryDelay", () => {
  beforeEach(() => {
    // Fix Math.random to 0.5 → jitter factor = 0 (0.2 * (0.5*2-1) = 0)
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Normal errors: base 1000 ms, cap 10 000 ms ---

  it("returns 1000 ms for attempt 0 on a normal error", () => {
    const err = makeTRPCError("INTERNAL_SERVER_ERROR", 500);
    expect(retryDelay(0, err)).toBe(1_000);
  });

  it("returns 2000 ms for attempt 1 on a normal error", () => {
    const err = makeTRPCError("INTERNAL_SERVER_ERROR", 500);
    expect(retryDelay(1, err)).toBe(2_000);
  });

  it("returns 4000 ms for attempt 2 on a normal error", () => {
    const err = makeTRPCError("INTERNAL_SERVER_ERROR", 500);
    expect(retryDelay(2, err)).toBe(4_000);
  });

  it("caps at 10 000 ms for high attempt index on a normal error", () => {
    const err = makeTRPCError("INTERNAL_SERVER_ERROR", 500);
    expect(retryDelay(10, err)).toBe(10_000);
  });

  // --- Gateway errors: base 3000 ms, cap 15 000 ms ---

  it("returns 3000 ms for attempt 0 on a gateway error", () => {
    const err = makeTRPCError("Unable to transform response from server");
    expect(retryDelay(0, err)).toBe(3_000);
  });

  it("returns 6000 ms for attempt 1 on a gateway error", () => {
    const err = makeTRPCError("Unable to transform response from server");
    expect(retryDelay(1, err)).toBe(6_000);
  });

  it("caps at 15 000 ms for high attempt index on a gateway error", () => {
    const err = makeTRPCError("Unable to transform response from server");
    expect(retryDelay(10, err)).toBe(15_000);
  });

  it("uses gateway delay for 'Failed to fetch' errors", () => {
    const err = makeTRPCError("Failed to fetch");
    expect(retryDelay(0, err)).toBe(3_000);
  });

  // --- Jitter: with random = 0 → jitter = -20% ---

  it("applies negative jitter when Math.random returns 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const err = makeTRPCError("INTERNAL_SERVER_ERROR", 500);
    // attempt 0: exponential=1000, jitter = 1000*0.2*(0*2-1) = -200 → 800
    expect(retryDelay(0, err)).toBe(800);
  });

  // --- Jitter: with random = 1 → jitter = +20% ---

  it("applies positive jitter when Math.random returns 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const err = makeTRPCError("INTERNAL_SERVER_ERROR", 500);
    // attempt 0: exponential=1000, jitter = 1000*0.2*(1*2-1) = +200 → 1200
    expect(retryDelay(0, err)).toBe(1_200);
  });

  // --- Non-TRPCClientError uses normal delays ---

  it("uses normal base delay for plain Error", () => {
    const err = new Error("Network error");
    expect(retryDelay(0, err)).toBe(1_000);
  });

  it("uses normal base delay for null error", () => {
    expect(retryDelay(0, null)).toBe(1_000);
  });
});
