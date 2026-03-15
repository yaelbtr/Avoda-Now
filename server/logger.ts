/**
 * server/logger.ts — Centralized Structured Logger
 * ──────────────────────────────────────────────────
 * Single source of truth for all server-side logging.
 * Uses pino for structured JSON logs in production and pretty-printed logs in dev.
 *
 * Usage:
 *   import { logger, securityLogger } from "./logger";
 *
 *   logger.info({ userId: 1 }, "User logged in");
 *   logger.error({ err }, "Unhandled error");
 *   securityLogger.warn({ ip, phone }, "OTP rate limit exceeded");
 *
 * Log levels: trace < debug < info < warn < error < fatal
 * Production: info and above (JSON format)
 * Development: debug and above (pretty-printed)
 */

import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// ── Base logger ───────────────────────────────────────────────────────────────
export const logger = pino({
  level: isProduction ? "info" : "debug",
  ...(isProduction
    ? {
        // Production: structured JSON for log aggregation (Datadog, CloudWatch, etc.)
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Development: human-readable pretty output
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
  base: {
    service: "job-now",
    env: process.env.NODE_ENV ?? "development",
  },
});

// ── Security-specific child logger ────────────────────────────────────────────
// All security events (auth, rate limits, blocked requests) go through this.
// Allows filtering security events separately in log aggregation tools.
export const securityLogger = logger.child({ component: "security" });

// ── Auth-specific child logger ────────────────────────────────────────────────
export const authLogger = logger.child({ component: "auth" });

// ── DB-specific child logger ──────────────────────────────────────────────────
export const dbLogger = logger.child({ component: "db" });

// ── Helper: extract IP from request headers ───────────────────────────────────
export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}
