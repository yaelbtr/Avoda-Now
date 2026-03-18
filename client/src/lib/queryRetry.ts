import { TRPCClientError } from "@trpc/client";

/**
 * Determine whether a failed query should be retried.
 *
 * Retry policy (single source of truth — applied to all tRPC queries):
 *  - 4xx (client errors: auth, not-found, bad-request, rate-limit) → NEVER retry
 *  - 5xx tRPC errors (INTERNAL_SERVER_ERROR etc.)                  → retry up to 3×
 *  - 502 / 503 gateway errors (sandbox wake-up, proxy blip)        → retry up to 4×
 *    These arrive as non-JSON HTML responses; tRPC wraps them in a
 *    TRPCClientError whose `data` is undefined and whose `message`
 *    contains "Unable to transform response from server".
 *  - Network failures (fetch rejected, no response at all)         → retry up to 3×
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    const httpStatus = (error.data as { httpStatus?: number } | undefined)?.httpStatus;

    // 4xx — deterministic client errors, never retry
    if (httpStatus && httpStatus >= 400 && httpStatus < 500) return false;

    // 502/503 detected via tRPC's transform-failure message (non-JSON gateway response)
    const isGatewayError =
      error.message.includes("Unable to transform response from server") ||
      error.message.includes("Failed to fetch") ||
      httpStatus === 502 ||
      httpStatus === 503;

    if (isGatewayError) return failureCount < 4; // extra attempt for cold-start
  }

  // Generic network / 5xx — retry up to 3 times
  return failureCount < 3;
}

/**
 * Exponential back-off with ±20 % jitter to avoid thundering herd.
 * Gateway errors get a longer base delay (3 s) to allow sandbox wake-up.
 */
export function retryDelay(attemptIndex: number, error: unknown): number {
  const isGatewayError =
    error instanceof TRPCClientError &&
    (error.message.includes("Unable to transform response from server") ||
      error.message.includes("Failed to fetch"));

  const base = isGatewayError ? 3_000 : 1_000;
  const cap = isGatewayError ? 15_000 : 10_000;
  const exponential = Math.min(base * 2 ** attemptIndex, cap);
  // ±20 % jitter
  const jitter = exponential * 0.2 * (Math.random() * 2 - 1);
  return Math.round(exponential + jitter);
}
